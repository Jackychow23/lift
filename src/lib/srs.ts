// Spanish between sets. Spaced repetition (Leitner boxes) decides WHICH word comes up;
// the question changes each time so it isn't rote: the word shows up in different
// sentences, and the task moves between "what does it mean", fill-in-the-blank,
// "what does the sentence mean" and "say it in Spanish". Every few cards a short
// story (written by Claude, stored for offline) gives real reading practice.
import { BASE_DECK } from '../data/spanish';
import type { CardProgress, Context, SpanishCard, SpanishState, Story } from './types';
import { shuffle } from './util';

const MIN = 60_000;
const DAY = 86_400_000;
/** Wait before a card is due again, by box (index = box). */
export const INTERVALS = [0, 2 * MIN, 15 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
export const MAX_BOX = INTERVALS.length - 1;

export type Mode = 'word' | 'cloze' | 'sentence' | 'reverse';

export interface Question {
  card: SpanishCard;
  mode: Mode;
  /** The big line on the card. */
  prompt: string;
  promptLang: 'es' | 'en';
  /** Part of the prompt to emphasise (word mode) or blank out (cloze). */
  highlight: [string, string, string] | null;
  /** Smaller supporting line under the prompt (English meaning in cloze mode). */
  support: string | null;
  question: string;
  options: string[];
  optionsLang: 'es' | 'en';
  answerIndex: number;
  explain: string;
  /** The sentence used this time, with its English. */
  context: Context;
}

export const allCards = (sp: SpanishState): SpanishCard[] => [...BASE_DECK, ...sp.extraCards];

export function recentAccuracy(sp: SpanishState): number | null {
  const r = sp.recent.slice(-20);
  if (r.length < 6) return null;
  return r.filter(Boolean).length / r.length;
}

/** How many words can be "in learning" at once — grows when you're getting them right. */
export function learningCap(sp: SpanishState): number {
  const acc = recentAccuracy(sp);
  if (acc === null) return 5;
  if (acc >= 0.85) return 9;
  if (acc >= 0.65) return 6;
  return 3;
}

export function stats(sp: SpanishState, now = Date.now()) {
  const ids = new Set(allCards(sp).map((c) => c.id));
  const entries = Object.entries(sp.progress).filter(([id]) => ids.has(id)).map(([, p]) => p);
  const learning = entries.filter((p) => p.box >= 1 && p.box <= 3).length;
  const due = entries.filter((p) => p.box >= 1 && p.due <= now).length;
  const mastered = entries.filter((p) => p.box >= 5).length;
  const seen = entries.filter((p) => p.box >= 1).length;
  const unseen = allCards(sp).filter((c) => !sp.progress[c.id]).length;
  const storiesWaiting = sp.stories.filter((s) => !s.seenAt).length;
  return { learning, due, mastered, seen, unseen, storiesWaiting, level: 1 + Math.floor(mastered / 25) };
}

export function pickCard(sp: SpanishState, now = Date.now(), lastId?: string): SpanishCard | null {
  const cards = allCards(sp);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = Object.entries(sp.progress).filter(([id, p]) => p.box >= 1 && byId.has(id));

  const due = seen.filter(([id, p]) => p.due <= now && id !== lastId).sort((a, b) => a[1].due - b[1].due);
  if (due.length) return byId.get(due[0][0])!;

  const learning = seen.filter(([, p]) => p.box <= 3).length;
  if (learning < learningCap(sp)) {
    const fresh = cards.filter((c) => !sp.progress[c.id]).sort((a, b) => a.level - b.level);
    if (fresh.length) return fresh[0];
  }

  const soonest = seen.filter(([id]) => id !== lastId).sort((a, b) => a[1].due - b[1].due);
  if (soonest.length) return byId.get(soonest[0][0])!;
  return cards.find((c) => c.id !== lastId) ?? cards[0] ?? null;
}

/** New words start with meaning; later reviews rotate through harder, more varied tasks. */
export function modeFor(p: CardProgress | undefined): Mode {
  const box = p?.box ?? 0;
  const n = p?.seen ?? 0;
  if (box <= 1) return 'word';
  if (box === 2) return n % 2 === 0 ? 'cloze' : 'word';
  if (box <= 4) return (['cloze', 'sentence', 'word'] as const)[n % 3];
  return (['reverse', 'cloze', 'sentence'] as const)[n % 3];
}

const PUNCT = /[¿?¡!]/g;
export const stripArticle = (w: string) => w.replace(/^(el|la|los|las|un|una)\s+/i, '').replace(PUNCT, '').trim();

/** Find a whole word/phrase inside a sentence (so "ya" doesn't match "playa"). */
export function findHighlight(sentence: string, word: string): [string, string, string] | null {
  const tries = [...new Set([word.replace(PUNCT, '').trim(), stripArticle(word)])].filter(Boolean);
  for (const t of tries) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`(^|[^\\p{L}])(${esc})(?=[^\\p{L}]|$)`, 'iu').exec(sentence);
    if (m) {
      const start = m.index + m[1].length;
      return [sentence.slice(0, start), sentence.slice(start, start + m[2].length), sentence.slice(start + m[2].length)];
    }
  }
  return null;
}

/** Every sentence available for a card: its own, others in the deck that use the word, and Claude's. */
export function contextsFor(card: SpanishCard, sp: SpanishState): Context[] {
  const out: Context[] = [{ es: card.es, en: card.sentenceEn }];
  for (const c of allCards(sp)) {
    if (c.id === card.id || out.some((o) => o.es === c.es)) continue;
    if (findHighlight(c.es, card.word)) out.push({ es: c.es, en: c.sentenceEn });
  }
  for (const c of sp.contexts[card.id] ?? []) if (!out.some((o) => o.es === c.es)) out.push(c);
  return out;
}

/**
 * Wrong answers. Never the right answer itself (a borrowed sentence can belong to another
 * card), never a card that means the same thing (el cuarto / la habitación), never twice.
 */
function distractors(card: SpanishCard, pool: SpanishCard[], get: (c: SpanishCard) => string, n: number, rand: () => number, correct: string): string[] {
  const norm = (x: string) => x.toLowerCase().replace(/[¿?¡!.,]/g, '').trim();
  const right = norm(correct);
  const sameMeaning = (c: SpanishCard) => norm(c.en) === norm(card.en);
  const others = pool.filter((c) => c.id !== card.id && !sameMeaning(c));
  const sameCat = shuffle(others.filter((c) => c.cat === card.cat), rand);
  const rest = shuffle(others.filter((c) => c.cat !== card.cat), rand);
  const out: string[] = [];
  for (const c of [...sameCat, ...rest]) {
    const v = get(c);
    if (!v || norm(v) === right || out.some((o) => norm(o) === norm(v))) continue;
    out.push(v);
    if (out.length === n) break;
  }
  return out;
}

export function buildQuestion(
  card: SpanishCard,
  mode: Mode,
  pool: SpanishCard[],
  rand: () => number = Math.random,
  context: Context = { es: card.es, en: card.sentenceEn }
): Question {
  const hook = card.hook ? ` ${card.hook}` : '';
  let correct: string;
  let others: string[];
  let q: Omit<Question, 'options' | 'answerIndex'>;
  const hl = findHighlight(context.es, card.word);

  if (mode === 'cloze' && hl) {
    // Use the form the sentence actually has (with or without article), and match the distractors to it.
    const bare = hl[1].toLowerCase() === stripArticle(card.word).toLowerCase();
    const form = (c: SpanishCard) => (bare ? stripArticle(c.word) : c.word.replace(PUNCT, ''));
    const capital = hl[1].charAt(0) !== hl[1].charAt(0).toLowerCase();
    const matchCase = (s: string) => (capital ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    correct = hl[1];
    others = distractors(card, pool, form, 3, rand, correct).map(matchCase);
    q = {
      card, mode, prompt: context.es, promptLang: 'es', highlight: hl, support: context.en,
      question: 'Which word fills the blank?', optionsLang: 'es', context,
      explain: `${card.word} = ${card.en}.${hook}`
    };
  } else if (mode === 'sentence') {
    correct = context.en;
    others = distractors(card, pool, (c) => c.sentenceEn, 3, rand, correct);
    q = {
      card, mode, prompt: context.es, promptLang: 'es', highlight: null, support: null,
      question: 'What does this sentence mean?', optionsLang: 'en', context,
      explain: `${card.word} = ${card.en}.${hook}`
    };
  } else if (mode === 'reverse') {
    correct = card.word;
    others = distractors(card, pool, (c) => c.word, 3, rand, correct);
    q = {
      card, mode, prompt: context.en, promptLang: 'en', highlight: null, support: null,
      question: `Which word means “${card.en}”?`, optionsLang: 'es', context,
      explain: `“${context.es}”${hook}`
    };
  } else {
    correct = card.en;
    others = distractors(card, pool, (c) => c.en, 3, rand, correct);
    q = {
      card, mode: 'word', prompt: context.es, promptLang: 'es', highlight: hl, support: null,
      question: `What does “${card.word}” mean?`, optionsLang: 'en', context,
      explain: `${card.word} = ${card.en}. “${context.es}” means “${context.en}”.${hook}`
    };
  }
  const options = shuffle([correct, ...others], rand);
  return { ...q, options, answerIndex: options.indexOf(correct) };
}

export function nextQuestion(sp: SpanishState, now = Date.now(), lastId?: string, rand: () => number = Math.random): Question | null {
  const card = pickCard(sp, now, lastId);
  if (!card) return null;
  const p = sp.progress[card.id];
  const ctxs = contextsFor(card, sp);
  // First time: the card's own sentence. After that, rotate so it's a different sentence each review.
  const context = !p || p.seen === 0 ? ctxs[0] : ctxs[p.seen % ctxs.length];
  return buildQuestion(card, modeFor(p), allCards(sp), rand, context);
}

/**
 * Record an answer. A right answer after peeking at the hint keeps the card
 * where it is instead of moving it up.
 */
export function answer(sp: SpanishState, cardId: string, correct: boolean, now = Date.now(), hinted = false): SpanishState {
  const prev = sp.progress[cardId] ?? { box: 0, due: now, seen: 0, correct: 0, last: 0 };
  const box = !correct ? 1 : hinted ? Math.max(1, prev.box) : Math.min(MAX_BOX, Math.max(1, prev.box + 1));
  const next: CardProgress = {
    box,
    due: now + INTERVALS[box],
    seen: prev.seen + 1,
    correct: prev.correct + (correct && !hinted ? 1 : 0),
    last: now
  };
  return {
    ...sp,
    progress: { ...sp.progress, [cardId]: next },
    recent: [...sp.recent, correct && !hinted].slice(-30)
  };
}

// ───────── stories ─────────

export const nextStory = (sp: SpanishState): Story | null => sp.stories.find((s) => !s.seenAt) ?? null;

export function markStory(sp: SpanishState, id: string, correct: boolean): SpanishState {
  return { ...sp, stories: sp.stories.map((s) => (s.id === id ? { ...s, seenAt: new Date().toISOString(), correct } : s)).slice(-40) };
}

// ───────── validating what Claude writes ─────────

const str = (o: Record<string, unknown>, k: string, max: number) => (typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '');

export function cleanNewCards(raw: unknown, sp: SpanishState): SpanishCard[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(allCards(sp).map((c) => c.word.toLowerCase()));
  const out: SpanishCard[] = [];
  const base = Date.now().toString(36);
  raw.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const o = r as Record<string, unknown>;
    const card: SpanishCard = {
      id: `c${base}${i}`,
      word: str(o, 'word', 40),
      en: str(o, 'en', 60),
      es: str(o, 'es', 140),
      sentenceEn: str(o, 'sentence_en', 160),
      level: Math.max(1, Math.min(5, Math.round(Number(o.level) || 2))),
      cat: str(o, 'category', 20) || 'claude',
      hook: str(o, 'hook', 160) || undefined
    };
    if (!card.word || !card.en || !card.es || !card.sentenceEn) return;
    if (known.has(card.word.toLowerCase())) return;
    known.add(card.word.toLowerCase());
    out.push(card);
  });
  return out;
}

/** Extra sentences per card. Keeps only ones that really contain the word; max 4 per card. */
export function cleanContexts(raw: unknown, sp: SpanishState): Record<string, Context[]> {
  const byWord = new Map(allCards(sp).map((c) => [c.word.toLowerCase(), c]));
  const out: Record<string, Context[]> = { ...sp.contexts };
  if (!Array.isArray(raw)) return out;
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const card = byWord.get(str(o, 'word', 40).toLowerCase());
    if (!card || !Array.isArray(o.sentences)) continue;
    const list = [...(out[card.id] ?? [])];
    for (const s of o.sentences as unknown[]) {
      if (!s || typeof s !== 'object') continue;
      const es = str(s as Record<string, unknown>, 'es', 160);
      const en = str(s as Record<string, unknown>, 'en', 180);
      if (!es || !en || !findHighlight(es, card.word) || es === card.es || list.some((x) => x.es === es)) continue;
      list.push({ es, en });
    }
    out[card.id] = list.slice(-4);
  }
  return out;
}

export function cleanStories(raw: unknown): Story[] {
  if (!Array.isArray(raw)) return [];
  const base = Date.now().toString(36);
  const out: Story[] = [];
  raw.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const o = r as Record<string, unknown>;
    const options = Array.isArray(o.options) ? (o.options as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, 120)) : [];
    const answerIndex = Math.round(Number(o.answer_index));
    const gloss = Array.isArray(o.new_words)
      ? (o.new_words as unknown[])
          .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
          .map((g) => ({ es: str(g, 'es', 40), en: str(g, 'en', 60) }))
          .filter((g) => g.es && g.en)
          .slice(0, 3)
      : [];
    const story: Story = {
      id: `s${base}${i}`,
      es: str(o, 'es', 400),
      en: str(o, 'en', 450),
      question: str(o, 'question', 160),
      options,
      answerIndex,
      gloss,
      createdAt: new Date().toISOString()
    };
    if (!story.es || !story.en || !story.question || options.length < 3 || options.length > 4) return;
    if (!(answerIndex >= 0 && answerIndex < options.length) || new Set(options).size !== options.length) return;
    out.push(story);
  });
  return out;
}
