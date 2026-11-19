// Talks to the Claude API straight from the phone. The key stays on the phone.
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { CALIBRATION_SESSIONS } from './defaults';
import { finished, isAvailable, isCalibrating, nextDayType, regularCount, sanitizePlan, weekInfo, type RawPlan } from './planner';
import { allCards, cleanContexts, cleanNewCards, cleanStories, recentAccuracy, stats } from './srs';
import type { AppState, Assessment, Context, DayType, Plan, Settings, SpanishCard, Story } from './types';
import { daysBetween } from './util';

const API = 'https://api.anthropic.com/v1/messages';

/** Turn API errors into something you can act on from the phone. */
export function explainApiError(status: number, detail: string): string {
  const d = detail.toLowerCase();
  if (status === 401 || d.includes('x-api-key') || d.includes('authentication'))
    return 'API key not accepted. Copy it again from console.anthropic.com → API keys and paste it in Settings.';
  if (d.includes('credit balance') || d.includes('billing'))
    return 'The Anthropic account has no API credit. Add some at console.anthropic.com → Billing (this is separate from a Claude subscription).';
  if (status === 403) return `This API key isn't allowed to do that (${detail || 'permission denied'}).`;
  if (status === 404)
    return `Model “${'{model}'}” wasn't found. Check the model name in Settings.${detail ? ` (${detail})` : ''}`;
  if (status === 429) return 'Too many requests or spend limit reached. It will retry later; check limits at console.anthropic.com.';
  if (status === 529 || status >= 500) return 'Claude is busy right now. It will retry later.';
  return `Claude API ${status}${detail ? `: ${detail}` : ''}`;
}

interface ToolUseBlock { type: 'tool_use'; name: string; input: unknown }

async function callClaude(settings: Settings, body: Record<string, unknown>, timeoutMs = 90_000): Promise<{ content: ToolUseBlock[] }> {
  if (!settings.apiKey) throw new Error('No API key yet. Add one in Settings.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: settings.model.trim() || 'claude-sonnet-5-5', ...body }),
      signal: ctrl.signal
    });
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = j?.error?.message ?? '';
      } catch {
        /* ignore */
      }
      throw new Error(explainApiError(res.status, detail).replace('{model}', settings.model.trim()));
    }
    return await res.json();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Claude took too long to answer. Will retry later.');
    if (e instanceof TypeError) throw new Error('No connection to Claude right now. Will retry when online.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function toolInput<T>(resp: { content: ToolUseBlock[] }, name: string): T {
  const block = resp.content?.find((b) => b.type === 'tool_use' && b.name === name);
  if (!block) throw new Error('Claude did not return a structured answer.');
  return block.input as T;
}

export async function testConnection(settings: Settings): Promise<string> {
  const resp = await callClaude(settings, { max_tokens: 16, messages: [{ role: 'user', content: 'Reply with the single word: ready' }] }, 30_000);
  const text = (resp.content as unknown as { type: string; text?: string }[]).find((b) => b.type === 'text')?.text ?? '';
  return text.trim() || 'Connected';
}

// ───────── workout plans ─────────

const COACH_SYSTEM = `You are the strength coach inside a personal, offline-first lifting app. You write the lifter's NEXT workout, which stays on his phone until he does it.

How the app works:
- He logs only weight and reps per set. He does not rate difficulty. When a set feels easy he adds reps or an extra set; when it's too hard he lowers the weight. Read his logs with that in mind: reps above target or extra sets mean "too easy", a lower weight than planned means "too heavy".
- Dumbbell weights are PER HAND and must come from his dumbbell list. Cable weights are the stack number in his increments. Bodyweight moves use weight 0.
- Rest timers run between sets. In a pair he alternates the two exercises (1a, 1b, 1a, 1b…), so each muscle rests about twice the pair's rest time.

Rules for every plan:
- About 30 minutes: two antagonist pairs (a press with a pull) and a short posture finisher.
- EQUIPMENT RULE: both exercises in a pair (and in the finisher) must use the same station — both dumbbell, or both cable. Bodyweight moves (chin tucks, push-ups) can go with either. Never pair a cable exercise with a dumbbell one. His gym has a single cable machine that's often busy, so keep all cable work in back-to-back blocks so he only uses it once per workout. Each exercise's load is in the list below. 13–16 working sets total. Pair rest 75–90 s; finisher rest 30–45 s.
- No warm-up section. He warms up by doing a lighter set or two of the first exercise in each pair before his working sets (not logged), so put the heaviest lifts first in each pair and don't add separate warm-up exercises.
- Strength focus: main lifts mostly 5–10 reps; accessories 10–15; posture work 12–20.
- Posture (forward head): every session includes chin tucks plus one upper-back/rear-shoulder exercise. Across the week, pulling sets should be at least equal to pressing sets.
- Respect his "about me" notes (e.g. no legs unless switched on, no squats, nothing slow to set up).
- Only use exercise ids from the list given. Never invent ids.
- Progress gradually: at most one weight step up from what he last actually lifted (two during calibration if he clearly blew past the target). If he lowered a weight, start from what he used.
- When a dumbbell exercise reaches his heaviest dumbbell, progress with reps, slower lowering, pauses or the one-arm version instead of weight; say so in the item's note.
- Calibration: his first ${CALIBRATION_SESSIONS} regular sessions find his working weights. Move faster then.
- The "note" is 1–2 short sentences to him in plain words, no hype, no emojis. Item notes are optional, under 15 words.`;

function exerciseCatalog(settings: Settings): string {
  return EXERCISES.filter((e) => isAvailable(e, settings))
    .map((e) => {
      const load = e.load === 'dumbbell' ? 'dumbbell, lb per hand' : e.load === 'cable' ? 'cable stack, lb' : 'bodyweight';
      return `${e.id} | ${e.name} | ${e.pattern} | ${load} | reps ${e.repRange[0]}–${e.repRange[1]}${e.holdSeconds ? ` | hold ${e.holdSeconds}s each rep` : ''}`;
    })
    .join('\n');
}

function historyText(s: AppState, limit = 12): string {
  const xs = finished(s).slice(-limit);
  if (!xs.length) return 'No workouts logged yet.';
  return xs
    .map((x) => {
      const head = `${x.finishedAt!.slice(0, 10)} · ${x.title}${x.bonus ? ' (bonus repeat)' : ''} · day ${x.dayType}`;
      const lines = x.exercises.map((e) => {
        const t = e.sets[0]?.target;
        const planned = e.sets.filter((z) => !z.extra).length;
        const did = e.sets.filter((z) => z.done).map((z) => (z.weight > 0 ? `${z.weight}×${z.reps}` : `${z.reps}`));
        const skipped = e.sets.filter((z) => !z.done).length;
        const extra = e.sets.filter((z) => z.extra && z.done).length;
        return `  ${e.exerciseId}: planned ${planned}×${t?.reps}${t && t.weight > 0 ? ` @ ${t.weight}` : ''}; did ${did.join(', ') || 'nothing'}${skipped ? `; skipped ${skipped}` : ''}${extra ? `; +${extra} extra` : ''}`;
      });
      return [head, ...lines].join('\n');
    })
    .join('\n');
}

function postureText(s: AppState): string {
  const xs = s.posture.slice(-3);
  if (!xs.length) return 'No posture checks yet.';
  return xs
    .map((p) => `${p.date.slice(0, 10)}: neck-flexor hold ${p.neckHoldSeconds ?? '–'} s; wall test ${p.wallTest ?? '–'}`)
    .join('\n');
}

export function needsAssessment(s: AppState, now = new Date()): boolean {
  if (regularCount(s) < CALIBRATION_SESSIONS) return false;
  if (!s.assessment) return true;
  return daysBetween(new Date(s.assessment.date), now) >= 28;
}

function planTool(settings: Settings, withAssessment: boolean) {
  const ids = EXERCISES.filter((e) => isAvailable(e, settings)).map((e) => e.id);
  return {
    name: 'submit_workout',
    description: 'Submit the next workout plan.',
    input_schema: {
      type: 'object',
      required: ['title', 'focus', 'note', 'blocks', ...(withAssessment ? ['assessment'] : [])],
      properties: {
        title: { type: 'string', description: 'Short, e.g. "Upper A"' },
        focus: { type: 'string', description: 'Under 8 words' },
        note: { type: 'string', description: '1–2 sentences to the lifter' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'kind', 'rest_seconds', 'items'],
            properties: {
              label: { type: 'string' },
              kind: { type: 'string', enum: ['pair', 'single', 'finisher'] },
              rest_seconds: { type: 'integer' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['exercise_id', 'sets', 'reps', 'weight'],
                  properties: {
                    exercise_id: { type: 'string', enum: ids },
                    sets: { type: 'integer' },
                    reps: { type: 'integer' },
                    weight: { type: 'number' },
                    hold_seconds: { type: 'integer' },
                    note: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        ...(withAssessment
          ? { assessment: { type: 'string', description: 'Weak points and priorities from his numbers so far, 3–5 short sentences, plain words.' } }
          : {})
      }
    }
  };
}

export async function requestPlan(s: AppState, opts: { dayType?: DayType } = {}): Promise<{ plan: Plan; assessment: Assessment | null }> {
  const dayType = opts.dayType ?? nextDayType(s);
  const withAssessment = needsAssessment(s);
  const wk = weekInfo(s);
  const n = regularCount(s);
  const settings = s.settings;
  const user = `ABOUT ME (written by the lifter):
${settings.aboutMe}

EQUIPMENT
Dumbbells (lb, per hand): ${settings.dumbbells.join(', ')}
Cable stack: ${settings.cableIncrement} lb steps up to ${settings.cableMax}
Legs switched ${settings.includeLegs ? 'ON' : 'OFF'}

EXERCISES HE CAN DO (id | name | pattern | load | rep guide)
${exerciseCatalog(settings)}

STATUS
Regular sessions done: ${n}${isCalibrating(s) ? ` (calibration: session ${n + 1} of ${CALIBRATION_SESSIONS} is next)` : ''}
This week: ${wk.regularCount} regular session(s) done.
Next session should be day ${dayType} (days alternate A/B; A leans on horizontal press/row, B on overhead press/pulldown).
${s.assessment ? `Current weak-point notes (${s.assessment.date.slice(0, 10)}): ${s.assessment.text}` : 'No weak-point assessment yet.'}

POSTURE CHECKS
${postureText(s)}

RECENT WORKOUTS (oldest first)
${historyText(s)}

Write his next workout with submit_workout.${withAssessment ? ' Also include an "assessment": which muscles or lifts look weak relative to the others, and what the plan will prioritise.' : ''}`;

  const resp = await callClaude(settings, {
    max_tokens: 2000,
    system: COACH_SYSTEM,
    tools: [planTool(settings, withAssessment)],
    tool_choice: { type: 'tool', name: 'submit_workout' },
    messages: [{ role: 'user', content: user }]
  });
  const raw = toolInput<RawPlan & { assessment?: string }>(resp, 'submit_workout');
  const plan = sanitizePlan(raw, s, dayType);
  const assessment =
    withAssessment && typeof raw.assessment === 'string' && raw.assessment.trim()
      ? { date: new Date().toISOString(), text: raw.assessment.trim().slice(0, 800) }
      : null;
  return { plan, assessment };
}

// ───────── Spanish cards ─────────

const SPANISH_SYSTEM = `You write flashcards for a beginner learning Spanish between sets at the gym. He learns mainly through comprehensible input (Dreaming Spanish), so every card teaches one word or short phrase INSIDE a short, natural sentence. Use Mexican Spanish where it differs. Each sentence must contain the word (or an obvious form of it). Sentences: 3–9 words for level 1–2, up to 12 for level 3+. Give natural English. Topics: gym, body, food, daily life, travel, small talk. No duplicates of words he already has.`;

export async function requestCards(s: AppState, count = 20): Promise<SpanishCard[]> {
  const st = stats(s.spanish);
  const acc = recentAccuracy(s.spanish);
  const known = allCards(s.spanish).map((c) => c.word);
  const weak = Object.entries(s.spanish.progress)
    .filter(([, p]) => p.seen >= 3 && p.correct / p.seen < 0.6)
    .map(([id]) => allCards(s.spanish).find((c) => c.id === id)?.word)
    .filter(Boolean);
  const targetLevel = Math.max(1, Math.min(5, st.level + (acc !== null && acc > 0.85 ? 1 : 0)));
  const user = `He has ${st.seen} words in rotation, ${st.mastered} well learned. Recent accuracy: ${acc === null ? 'not enough data' : Math.round(acc * 100) + '%'}.
Aim new cards at level ${targetLevel} (1 = very first words, 2 = simple past/near future, 3 = everyday conversation).
Words he finds hard: ${weak.join(', ') || 'none yet'}. Include a few cards that reuse those words in new sentences, with a different target word. Give every card a memory hook.
Words he already has (do not repeat as targets): ${known.join(', ')}

Write ${count} new cards with add_cards.`;
  const resp = await callClaude(s.settings, {
    max_tokens: 3000,
    system: SPANISH_SYSTEM,
    tools: [
      {
        name: 'add_cards',
        description: 'Add new flashcards to the deck.',
        input_schema: {
          type: 'object',
          required: ['cards'],
          properties: {
            cards: {
              type: 'array',
              items: {
                type: 'object',
                required: ['word', 'en', 'es', 'sentence_en', 'level', 'category'],
                properties: {
                  word: { type: 'string', description: 'Spanish target word/phrase; nouns with article' },
                  en: { type: 'string', description: 'English meaning of the word' },
                  es: { type: 'string', description: 'Spanish sentence using the word' },
                  sentence_en: { type: 'string', description: 'English meaning of the sentence' },
                  level: { type: 'integer' },
                  category: { type: 'string', description: 'One word, e.g. body, gym, food, verb, time, travel' },
                  hook: { type: 'string', description: 'Memory hook for an English speaker: a related English word (e.g. mano → manual) or a quick vivid picture. Never invent a false etymology; say "think of" for associations.' }
                }
              }
            }
          }
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'add_cards' },
    messages: [{ role: 'user', content: user }]
  });
  const raw = toolInput<{ cards: unknown }>(resp, 'add_cards');
  return cleanNewCards(raw.cards, s.spanish);
}

/** More sentences for words he's learning, so each review shows the word in a new context. */
export async function requestContexts(s: AppState, cards: SpanishCard[]): Promise<Record<string, Context[]>> {
  if (!cards.length) return s.spanish.contexts;
  const known = allCards(s.spanish).filter((c) => s.spanish.progress[c.id]?.box >= 1).map((c) => c.word);
  const user = `Words he knows so far: ${known.join(', ')}

For EACH of these words, write 2 new short Spanish sentences that use it in a different way than its current example (different situation, different form if natural — plural, other verb person, question vs statement). Keep the rest of each sentence to very common words, ideally ones from the known list. 3–9 words each.
${cards.map((c) => `- ${c.word} (${c.en}); current example: ${c.es}`).join('\n')}

Answer with add_sentences.`;
  const resp = await callClaude(s.settings, {
    max_tokens: 3000,
    system: SPANISH_SYSTEM,
    tools: [
      {
        name: 'add_sentences',
        description: 'Add example sentences for existing words.',
        input_schema: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['word', 'sentences'],
                properties: {
                  word: { type: 'string', description: 'The word exactly as given' },
                  sentences: {
                    type: 'array',
                    items: { type: 'object', required: ['es', 'en'], properties: { es: { type: 'string' }, en: { type: 'string' } } }
                  }
                }
              }
            }
          }
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'add_sentences' },
    messages: [{ role: 'user', content: user }]
  });
  return cleanContexts(toolInput<{ items: unknown }>(resp, 'add_sentences').items, s.spanish);
}

/** Short readings built mostly from words he knows — comprehensible input between sets. */
export async function requestStories(s: AppState, count = 6): Promise<Story[]> {
  const known = allCards(s.spanish).filter((c) => s.spanish.progress[c.id]?.box >= 1).map((c) => c.word);
  const st = stats(s.spanish);
  const user = `He has ${known.length} words in rotation (${st.mastered} well learned): ${known.join(', ') || 'only a few so far'}.

Write ${count} mini-stories with add_stories. Each:
- 2–3 short sentences in Spanish (Mexican Spanish), present tense unless he clearly knows past forms. About 90% of the words should be from his list or very common words (el, la, y, es, está, en, con, a, de, muy, no, sí, mi, tu, un, una, hoy).
- At most 2 words he doesn't know yet; list them in new_words with English.
- One comprehension question IN ENGLISH about the story with 4 short options, exactly one correct, the wrong ones plausible.
- Everyday or gym topics. Vary the topics and the people (a friend, a coworker, a dog, a trainer…). Not about the lifter himself.
- "en" is a natural English translation of the whole story.`;
  const resp = await callClaude(s.settings, {
    max_tokens: 3000,
    system: SPANISH_SYSTEM,
    tools: [
      {
        name: 'add_stories',
        description: 'Add short reading stories.',
        input_schema: {
          type: 'object',
          required: ['stories'],
          properties: {
            stories: {
              type: 'array',
              items: {
                type: 'object',
                required: ['es', 'en', 'question', 'options', 'answer_index', 'new_words'],
                properties: {
                  es: { type: 'string' },
                  en: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  answer_index: { type: 'integer', description: '0-based index of the correct option' },
                  new_words: {
                    type: 'array',
                    items: { type: 'object', required: ['es', 'en'], properties: { es: { type: 'string' }, en: { type: 'string' } } }
                  }
                }
              }
            }
          }
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'add_stories' },
    messages: [{ role: 'user', content: user }]
  });
  return cleanStories(toolInput<{ stories: unknown }>(resp, 'add_stories').stories);
}

export const exerciseName = (id: string) => EXERCISE_BY_ID[id]?.name ?? id;
