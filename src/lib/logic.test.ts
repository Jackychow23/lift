import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID, EXERCISES } from '../data/exercises';
import { BASE_DECK } from '../data/spanish';
import { freshState } from './defaults';
import {
  buildBonusPlan,
  buildBuiltinPlan,
  nextDayType,
  cableSwap,
  nextSet,
  nextTarget,
  roundToAvailable,
  sanitizePlan,
  sharedStation,
  startSession,
  weekInfo
} from './planner';
import { answer, buildQuestion, cleanStories, contextsFor, findHighlight, nextQuestion, pickCard, stats } from './srs';
import type { AppState, Session } from './types';

function logSession(s: AppState, edit: (sess: Session) => void, when = new Date()): AppState {
  const plan = s.plan ?? buildBuiltinPlan(s);
  const sess = startSession(plan);
  sess.exercises.forEach((e) => e.sets.forEach((x) => (x.done = true)));
  edit(sess);
  sess.finishedAt = when.toISOString();
  const next = { ...s, sessions: [...s.sessions, sess] };
  return { ...next, plan: buildBuiltinPlan(next) };
}

describe('exercise library', () => {
  it('has unique ids, photos and notes for every exercise', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.images.length).toBe(2);
      expect(e.steps.length).toBeGreaterThan(1);
      expect(e.feel.main.length).toBeGreaterThan(0);
      expect(e.notFeel.length).toBeGreaterThan(0);
    }
  });
});

describe('built-in planner', () => {
  it('starts on day A with conservative weights and ~15 sets, no legs', () => {
    const s = freshState();
    const p = buildBuiltinPlan(s);
    expect(p.dayType).toBe('A');
    const sets = p.blocks.flatMap((b) => b.items).reduce((n, i) => n + i.sets, 0);
    expect(sets).toBeGreaterThanOrEqual(13);
    expect(sets).toBeLessThanOrEqual(16);
    const bench = p.blocks[0].items.find((i) => i.exerciseId === 'db_bench_press')!;
    expect(bench.weight).toBe(30);
    expect(p.blocks.flatMap((b) => b.items).some((i) => EXERCISE_BY_ID[i.exerciseId].legs)).toBe(false);
    expect(p.blocks.flatMap((b) => b.items).some((i) => i.exerciseId === 'chin_tuck')).toBe(true);
  });

  it('alternates A and B', () => {
    let s = freshState();
    s = logSession(s, () => {});
    expect(nextDayType(s)).toBe('B');
    s = logSession(s, () => {});
    expect(nextDayType(s)).toBe('A');
  });

  it('raises weight when every set beat the top of the range, holds otherwise, follows a weight he dropped', () => {
    const s = freshState();
    const ex = EXERCISE_BY_ID.db_bench_press;
    const mk = (sets: [number, number][], target: [number, number]): Session[] => [
      {
        id: 'x', planId: 'p', planSource: 'builtin', dayType: 'A', title: 'A', startedAt: '', finishedAt: new Date().toISOString(),
        blocks: [{ label: 'Pair A', kind: 'pair', restSeconds: 90 }],
        exercises: [{ exerciseId: ex.id, blockIndex: 0, sets: sets.map(([w, r]) => ({ target: { weight: target[0], reps: target[1] }, weight: w, reps: r, done: true })) }]
      }
    ];
    expect(nextTarget(ex, mk([[30, 10], [30, 10], [30, 11]], [30, 8]), s.settings, false)).toEqual({ weight: 35, reps: 6 });
    // calibration + very easy → two notches
    expect(nextTarget(ex, mk([[30, 12], [30, 13], [30, 12]], [30, 8]), s.settings, true).weight).toBe(40);
    // hit target → one more rep, same weight
    expect(nextTarget(ex, mk([[35, 8], [35, 8], [35, 8]], [35, 8]), s.settings, false)).toEqual({ weight: 35, reps: 9 });
    // he lowered the weight mid-session → plan follows the weight he used most
    expect(nextTarget(ex, mk([[40, 6], [35, 8], [35, 8]], [40, 8]), s.settings, false).weight).toBe(35);
    // at the heaviest dumbbell → more reps, not more weight
    const top = nextTarget(ex, mk([[50, 10], [50, 10], [50, 11]], [50, 10]), s.settings, false);
    expect(top.weight).toBe(50);
    expect(top.reps).toBe(12);
  });

  it('rounds to real dumbbells and cable steps', () => {
    const s = freshState();
    expect(roundToAvailable(EXERCISE_BY_ID.db_bench_press, 37, s.settings)).toBe(35);
    expect(roundToAvailable(EXERCISE_BY_ID.db_bench_press, 80, s.settings)).toBe(50);
    expect(roundToAvailable(EXERCISE_BY_ID.seated_cable_row, 93, s.settings)).toBe(95);
  });

  it('swaps out exercises whose equipment is missing', () => {
    const s = freshState();
    s.settings.equipment.rope = false;
    const p = buildBuiltinPlan(s);
    const ids = p.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
    expect(ids).not.toContain('face_pull');
    expect(ids).not.toContain('cable_pushdown');
    // a stand-in on different equipment means that block is done one at a time, not alternated
    for (const b of p.blocks) if (b.items.length > 1) expect(sharedStation(b.items.map((i) => i.exerciseId))).not.toBeNull();
  });

  it('keeps every pair on one station (dumbbells or cable)', () => {
    let s = freshState();
    for (const day of ['A', 'B'] as const) {
      const p = buildBuiltinPlan(s, day);
      for (const b of p.blocks) if (b.items.length > 1) expect(sharedStation(b.items.map((i) => i.exerciseId))).not.toBeNull();
    }
    s = logSession(s, () => {});
    expect(buildBuiltinPlan(s).blocks.length).toBe(3);
  });
});

describe('guardrails on Claude plans', () => {
  it('drops unknown/leg exercises, caps jumps, rounds weights, limits sets', () => {
    const s = freshState();
    const plan = sanitizePlan(
      {
        title: 'Upper A', focus: 'x', note: 'n',
        blocks: [
          { label: 'Pair A', kind: 'pair', rest_seconds: 90, items: [
            { exercise_id: 'db_bench_press', sets: 9, reps: 8, weight: 120 },
            { exercise_id: 'made_up', sets: 3, reps: 8, weight: 10 },
            { exercise_id: 'seated_cable_row', sets: 3, reps: 8, weight: 83 }
          ] },
          { label: 'Pair B', kind: 'pair', rest_seconds: 75, items: [
            { exercise_id: 'lat_pulldown', sets: 3, reps: 8, weight: 80 },
            { exercise_id: 'face_pull', sets: 2, reps: 15, weight: 25 }
          ] },
          { label: 'Legs', kind: 'pair', rest_seconds: 90, items: [{ exercise_id: 'db_rdl', sets: 3, reps: 8, weight: 40 }] }
        ]
      },
      s,
      'A'
    );
    const items = plan.blocks.flatMap((b) => b.items);
    expect(items.map((i) => i.exerciseId)).not.toContain('made_up');
    expect(items.some((i) => EXERCISE_BY_ID[i.exerciseId].legs)).toBe(false);
    const bench = items.find((i) => i.exerciseId === 'db_bench_press')!;
    expect(bench.sets).toBe(5);
    expect(bench.weight).toBe(40); // start 30 + two notches max during calibration
    expect(items.find((i) => i.exerciseId === 'seated_cable_row')!.weight).toBe(85);
    // dumbbell + cable "pair" gets split into one-at-a-time blocks; cable + cable stays a pair
    for (const b of plan.blocks) if (b.items.length > 1) expect(sharedStation(b.items.map((i) => i.exerciseId))).not.toBeNull();
    expect(plan.blocks.some((b) => b.items.length === 2 && b.items[0].exerciseId === 'lat_pulldown')).toBe(true);
  });
});

describe('workout flow', () => {
  it('alternates sets within a pair', () => {
    const s = startSession(buildBuiltinPlan(freshState()));
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const n = nextSet(s)!;
      order.push(`${s.exercises[n.ex].exerciseId}#${n.set}`);
      s.exercises[n.ex].sets[n.set].done = true;
    }
    expect(order).toEqual(['db_bench_press#0', 'one_arm_db_row#0', 'db_bench_press#1', 'one_arm_db_row#1']);
  });

  it('does a two-station block one exercise at a time', () => {
    const s = startSession(buildBuiltinPlan(freshState()));
    s.exercises[1].exerciseId = 'seated_cable_row'; // pair 1 is now dumbbell + cable
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const n = nextSet(s)!;
      order.push(`${s.exercises[n.ex].exerciseId}#${n.set}`);
      s.exercises[n.ex].sets[n.set].done = true;
    }
    expect(order).toEqual(['db_bench_press#0', 'db_bench_press#1', 'db_bench_press#2', 'seated_cable_row#0']);
  });

  it('"cable machine taken" swaps unstarted cable work to dumbbells, and back', () => {
    const st = freshState();
    const sess = startSession(buildBuiltinPlan(st));
    const before = sess.exercises.map((e) => e.exerciseId);
    const on = cableSwap(sess, st.settings, [], true, true);
    expect(on.session.cableBusy).toBe(true);
    expect(on.session.exercises.some((e) => EXERCISE_BY_ID[e.exerciseId].load === 'cable')).toBe(false);
    expect(new Set(on.session.exercises.map((e) => e.exerciseId)).size).toBe(on.session.exercises.length);
    const off = cableSwap(on.session, st.settings, [], true, false);
    expect(off.session.exercises.map((e) => e.exerciseId)).toEqual(before);
  });

  it('offers a bonus day after 4 sessions and repeats the weakest one', () => {
    let s = freshState();
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(9, 0, 0, 0);
    for (let d = 0; d < 4; d++) {
      const when = new Date(monday.getTime() + d * 3600_000);
      s = logSession(s, (sess) => {
        if (d === 2) sess.exercises[0].sets.forEach((x) => (x.reps = 3));
      }, when);
    }
    const wk = weekInfo(s, new Date(monday.getTime() + 5 * 3600_000));
    expect(wk.regularCount).toBe(4);
    expect(wk.bonusAvailable).toBe(true);
    expect(wk.weakest?.id).toBe(s.sessions[2].id);
    const bonus = buildBonusPlan(s)!;
    expect(bonus.bonus).toBe(true);
  });
});

describe('Spanish cards', () => {
  it('deck is well-formed', () => {
    expect(BASE_DECK.length).toBeGreaterThan(100);
    expect(new Set(BASE_DECK.map((c) => c.word)).size).toBe(BASE_DECK.length);
  });

  it('builds a 4-option question with exactly one right answer', () => {
    const card = BASE_DECK[0];
    const q = buildQuestion(card, 'word', BASE_DECK, () => 0.3);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answerIndex]).toBe(card.en);
    expect(q.highlight?.[1]).toBe('la espalda');
  });

  it('highlights whole words inside sentences', () => {
    expect(findHighlight('¿Cuánto pesa la mancuerna?', 'la mancuerna')?.[1]).toBe('la mancuerna');
    expect(findHighlight('Jala hacia el pecho.', 'jalar')).toBeNull();
    expect(findHighlight('Quiero ir a la playa.', 'ya')).toBeNull();
    expect(findHighlight('¿Cuánto cuesta la membresía?', '¿cuánto?')?.[1]).toBe('Cuánto');
  });

  it('every built-in card has a memory hook except a couple', () => {
    expect(BASE_DECK.filter((c) => !c.hook).length).toBeLessThanOrEqual(3);
  });

  it('shows a word in different sentences on later reviews', () => {
    const sp = freshState().spanish;
    const card = BASE_DECK.find((c) => c.word === 'la mancuerna')!;
    const ctx = contextsFor(card, sp);
    expect(ctx.length).toBeGreaterThan(1);
    expect(ctx[0].es).toBe(card.es);
  });

  it('fill-in-the-blank uses the sentence\'s own form and Spanish options', () => {
    const card = BASE_DECK.find((c) => c.word === 'la espalda')!;
    const q = buildQuestion(card, 'cloze', BASE_DECK, () => 0.4);
    expect(q.mode).toBe('cloze');
    expect(q.options[q.answerIndex]).toBe('la espalda');
    expect(q.optionsLang).toBe('es');
    expect(q.support).toBe(card.sentenceEn);
  });

  it('a right answer after the hint does not move the card up', () => {
    let sp = freshState().spanish;
    const id = BASE_DECK[0].id;
    sp = answer(sp, id, true, 0);
    sp = answer(sp, id, true, 1, true);
    expect(sp.progress[id].box).toBe(1);
  });

  it('only keeps well-formed stories', () => {
    const ok = { es: 'Mi amigo va al gimnasio. Levanta pesas.', en: 'My friend goes to the gym. He lifts weights.', question: 'What does he lift?', options: ['Weights', 'A dog', 'Water', 'A car'], answer_index: 0, new_words: [] };
    expect(cleanStories([ok, { ...ok, answer_index: 7 }, { ...ok, options: ['a', 'a', 'b', 'c'] }])).toHaveLength(1);
  });

  it('brings missed cards back and only adds new words when doing well', () => {
    let sp = freshState().spanish;
    const t0 = 1_000_000;
    const first = pickCard(sp, t0)!;
    sp = answer(sp, first.id, false, t0);
    expect(sp.progress[first.id].box).toBe(1);
    // not due yet → next pick is a new card
    expect(pickCard(sp, t0 + 1000, first.id)!.id).not.toBe(first.id);
    // after 2 minutes it's due again
    expect(pickCard(sp, t0 + 3 * 60_000)!.id).toBe(first.id);
    // poor accuracy lowers how many words are in learning at once
    for (let i = 0; i < 10; i++) sp = answer(sp, BASE_DECK[i].id, i % 3 === 0, t0);
    expect(stats(sp, t0).learning).toBeGreaterThan(0);
    expect(nextQuestion(sp, t0)).not.toBeNull();
  });
});

import { explainApiError } from './claude';
describe('API errors in plain words', () => {
  it('names the usual problems', () => {
    expect(explainApiError(401, 'invalid x-api-key')).toMatch(/API key not accepted/);
    expect(explainApiError(400, 'Your credit balance is too low to access the Anthropic API.')).toMatch(/no API credit/);
    expect(explainApiError(404, 'model: claude-x')).toMatch(/wasn't found/);
    expect(explainApiError(529, 'Overloaded')).toMatch(/busy/);
  });
});
