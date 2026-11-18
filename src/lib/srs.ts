// Spaced repetition for the rest-timer Spanish cards (Leitner boxes).
// Difficulty adapts three ways: misses come back sooner, new words only arrive
// while recent accuracy is good, and cards move from "what does this word mean"
// to "what does this sentence mean" to "how do you say it in Spanish".
import { BASE_DECK } from '../data/spanish';
import type { CardProgress, SpanishCard, SpanishState } from './types';
import { shuffle } from './util';

const MIN = 60_000;
const DAY = 86_400_000;
/** Wait before a card is due again, by box (index = box). */
export const INTERVALS = [0, 2 * MIN, 15 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
export const MAX_BOX = INTERVALS.length - 1;

export type Mode = 'word' | 'sentence' | 'reverse';

export interface Question {
  card: SpanishCard;
  mode: Mode;
  /** The big line on the card. */
  prompt: string;
  promptLang: 'es' | 'en';
  /** Part of the prompt to emphasise. */
  highlight: [string, string, string] | null;
  question: string;
  options: string[];
  optionsLang: 'es' | 'en';
  answerIndex: number;
  explain: string;
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
  const entries = Object.values(sp.progress);
  const learning = entries.filter((p) => p.box >= 1 && p.box <= 3).length;
  const due = entries.filter((p) => p.box >= 1 && p.due <= now).length;
  const mastered = entries.filter((p) => p.box >= 5).length;
  const seen = entries.filter((p) => p.box >= 1).length;
  const unseen = allCards(sp).filter((c) => !sp.progress[c.id]).length;
  return { learning, due, mastered, seen, unseen, level: 1 + Math.floor(mastered / 25) };
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

export function modeFor(p: CardProgress | undefined): Mode {
  const box = p?.box ?? 0;
  if (box <= 2) return 'word';
  if (box <= 4) return (p!.seen % 2 === 0 ? 'sentence' : 'word');
  return p!.seen % 3 === 0 ? 'sentence' : 'reverse';
}

function stripArticle(w: string) {
  return w.replace(/^(el|la|los|las|un|una)\s+/i, '').replace(/[¿?¡!]/g, '');
}

export function findHighlight(sentence: string, word: string): [string, string, string] | null {
  const tries = [word.replace(/[¿?¡!]/g, ''), stripArticle(word)];
  for (const t of tries) {
    if (!t) continue;
    const i = sentence.toLowerCase().indexOf(t.toLowerCase());
    if (i >= 0) return [sentence.slice(0, i), sentence.slice(i, i + t.length), sentence.slice(i + t.length)];
  }
  return null;
}

function distractors(card: SpanishCard, pool: SpanishCard[], get: (c: SpanishCard) => string, n: number, rand: () => number): string[] {
  const right = get(card).toLowerCase();
  const sameCat = shuffle(pool.filter((c) => c.id !== card.id && c.cat === card.cat), rand);
  const rest = shuffle(pool.filter((c) => c.id !== card.id && c.cat !== card.cat), rand);
  const out: string[] = [];
  for (const c of [...sameCat, ...rest]) {
    const v = get(c);
    if (v.toLowerCase() === right || out.some((o) => o.toLowerCase() === v.toLowerCase())) continue;
    out.push(v);
    if (out.length === n) break;
  }
  return out;
}

export function buildQuestion(card: SpanishCard, mode: Mode, pool: SpanishCard[], rand: () => number = Math.random): Question {
  let correct: string;
  let others: string[];
  let q: Omit<Question, 'options' | 'answerIndex'>;
  if (mode === 'sentence') {
    correct = card.sentenceEn;
    others = distractors(card, pool, (c) => c.sentenceEn, 3, rand);
    q = {
      card, mode, prompt: card.es, promptLang: 'es', highlight: null,
      question: 'What does this sentence mean?', optionsLang: 'en',
      explain: `${card.word} = ${card.en}`
    };
  } else if (mode === 'reverse') {
    correct = card.word;
    others = distractors(card, pool, (c) => c.word, 3, rand);
    q = {
      card, mode, prompt: card.sentenceEn, promptLang: 'en', highlight: null,
      question: `Which word means “${card.en}”?`, optionsLang: 'es',
      explain: `“${card.es}”`
    };
  } else {
    correct = card.en;
    others = distractors(card, pool, (c) => c.en, 3, rand);
    q = {
      card, mode, prompt: card.es, promptLang: 'es', highlight: findHighlight(card.es, card.word),
      question: `What does “${card.word}” mean?`, optionsLang: 'en',
      explain: `${card.word} = ${card.en}. The sentence means “${card.sentenceEn}”`
    };
  }
  const options = shuffle([correct, ...others], rand);
  return { ...q, options, answerIndex: options.indexOf(correct) };
}

export function nextQuestion(sp: SpanishState, now = Date.now(), lastId?: string, rand: () => number = Math.random): Question | null {
  const card = pickCard(sp, now, lastId);
  if (!card) return null;
  return buildQuestion(card, modeFor(sp.progress[card.id]), allCards(sp), rand);
}

export function answer(sp: SpanishState, cardId: string, correct: boolean, now = Date.now()): SpanishState {
  const prev = sp.progress[cardId] ?? { box: 0, due: now, seen: 0, correct: 0, last: 0 };
  const box = correct ? Math.min(MAX_BOX, Math.max(1, prev.box + 1)) : 1;
  const next: CardProgress = {
    box,
    due: now + INTERVALS[box],
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    last: now
  };
  return {
    ...sp,
    progress: { ...sp.progress, [cardId]: next },
    recent: [...sp.recent, correct].slice(-30)
  };
}

/** Validate cards Claude wrote before adding them to the deck. */
export function cleanNewCards(raw: unknown, sp: SpanishState): SpanishCard[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(allCards(sp).map((c) => c.word.toLowerCase()));
  const out: SpanishCard[] = [];
  const base = Date.now().toString(36);
  raw.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const o = r as Record<string, unknown>;
    const str = (k: string, max: number) => (typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '');
    const card: SpanishCard = {
      id: `c${base}${i}`,
      word: str('word', 40),
      en: str('en', 60),
      es: str('es', 140),
      sentenceEn: str('sentence_en', 160),
      level: Math.max(1, Math.min(5, Math.round(Number(o.level) || 2))),
      cat: str('category', 20) || 'claude'
    };
    if (!card.word || !card.en || !card.es || !card.sentenceEn) return;
    if (known.has(card.word.toLowerCase())) return;
    known.add(card.word.toLowerCase());
    out.push(card);
  });
  return out;
}
