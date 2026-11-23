import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID, EXERCISES } from '../data/exercises';
import { BASE_DECK } from '../data/spanish';
import { freshState, migrate } from './defaults';
import {
  alternatives,
  buildBonusPlan,
  buildBuiltinPlan,
  catchUpTarget,
  planMatches,
  scheduleTarget,
  weekSlots,
  estimateSeconds,
  remainingSeconds,
  cableSwap,
  nextSet,
  nextTarget,
  roundToAvailable,
  sanitizePlan,
  sharedStation,
  startSession,
  station,
  weekInfo
} from './planner';
import { answer, buildQuestion, maskAnswer, cleanStories, contextsFor, findHighlight, nextQuestion, pickCard, stats } from './srs';
import type { AppState, Session } from './types';

// Week of Monday 16 Nov 2026, local time.
const at = (day: number, hour = 9) => new Date(2026, 10, 16 + day, hour, 0, 0);

/** Do the scheduled workout at a fixed time, the way the app would. */
function train(s: AppState, when: Date, edit: (sess: Session) => void = () => {}): AppState {
  const plan = buildBuiltinPlan(s, scheduleTarget(s, when));
  const sess = startSession(plan);
  sess.exercises.forEach((e) => e.sets.forEach((x) => (x.done = true)));
  edit(sess);
  sess.finishedAt = when.toISOString();
  return { ...s, plan: null, sessions: [...s.sessions, sess] };
}

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
  it('starts on day A with conservative weights and ~12 sets, no legs', () => {
    const s = freshState();
    const p = buildBuiltinPlan(s);
    expect(p.dayType).toBe('A');
    const sets = p.blocks.flatMap((b) => b.items).reduce((n, i) => n + i.sets, 0);
    expect(sets).toBeGreaterThanOrEqual(10);
    expect(sets).toBeLessThanOrEqual(14);
    const bench = p.blocks[0].items.find((i) => i.exerciseId === 'db_bench_press')!;
    expect(bench.weight).toBe(30);
    expect(p.blocks.flatMap((b) => b.items).some((i) => EXERCISE_BY_ID[i.exerciseId].legs)).toBe(false);
    expect(p.blocks.flatMap((b) => b.items).some((i) => i.exerciseId === 'chin_tuck')).toBe(true);
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

  it('one exercise at a time, dumbbells before cables, longer rests for main lifts, no floor work', () => {
    const s = freshState();
    for (const day of ['A', 'B'] as const) {
      const p = buildBuiltinPlan(s, day);
      expect(p.blocks.every((b) => b.items.length === 1)).toBe(true);
      const stations = p.blocks.map((b) => station(EXERCISE_BY_ID[b.items[0].exerciseId])).filter((x) => x !== 'anywhere');
      expect(stations.indexOf('cable')).toBeGreaterThan(stations.lastIndexOf('dumbbells'));
      expect(p.blocks[0].restSeconds).toBeGreaterThanOrEqual(120);
      expect(p.blocks.some((b) => EXERCISE_BY_ID[b.items[0].exerciseId].floor)).toBe(false);
    }
  });

  it('built-in days fit the 30-minute limit, and a shorter limit trims accessories first', () => {
    const s = freshState();
    for (const day of ['A', 'B'] as const) expect(estimateSeconds(buildBuiltinPlan(s, day).blocks)).toBeLessThanOrEqual(30 * 60);
    s.settings.sessionMinutes = 20;
    const short = buildBuiltinPlan(s, 'A');
    expect(estimateSeconds(short.blocks)).toBeLessThanOrEqual(20 * 60);
    const ids = short.blocks.map((b) => b.items[0].exerciseId);
    expect(ids).toContain('db_bench_press');
    expect(ids).toContain('chin_tuck');
  });

  it('time left starts at the plan estimate and goes down as sets are logged', () => {
    const plan = buildBuiltinPlan(freshState());
    const sess = startSession(plan);
    expect(remainingSeconds(sess)).toBe(estimateSeconds(plan.blocks));
    sess.exercises[0].sets[0].done = true;
    expect(remainingSeconds(sess)).toBeLessThan(estimateSeconds(plan.blocks));
  });

  it('a 15-set paired plan like the first workout would have been trimmed to fit', () => {
    const s = freshState();
    const plan = sanitizePlan(
      {
        title: 'Upper A', focus: 'x', note: 'n',
        exercises: [
          { exercise_id: 'db_bench_press', sets: 3, reps: 8, weight: 30, rest_seconds: 150 },
          { exercise_id: 'one_arm_db_row', sets: 3, reps: 8, weight: 35, rest_seconds: 150 },
          { exercise_id: 'db_hammer_curl', sets: 3, reps: 10, weight: 20, rest_seconds: 90 },
          { exercise_id: 'seated_cable_row', sets: 3, reps: 8, weight: 80, rest_seconds: 150 },
          { exercise_id: 'cable_pushdown', sets: 3, reps: 12, weight: 40, rest_seconds: 90 },
          { exercise_id: 'face_pull', sets: 2, reps: 15, weight: 25, rest_seconds: 45 },
          { exercise_id: 'chin_tuck', sets: 2, reps: 10, weight: 0, rest_seconds: 30, hold_seconds: 5 }
        ]
      },
      s,
      'A'
    );
    expect(estimateSeconds(plan.blocks)).toBeLessThanOrEqual(30 * 60);
    expect(plan.blocks[0].items[0].exerciseId).toBe('db_bench_press');
  });

  it('swap options always include cable ones, and leave out floor work unless allowed', () => {
    const s = freshState();
    for (const id of ['db_bench_press', 'db_shoulder_press', 'one_arm_db_row', 'db_hammer_curl', 'db_overhead_triceps', 'rear_delt_fly']) {
      expect(alternatives(id, s.settings).some((e) => e.load === 'cable')).toBe(true);
    }
    expect(alternatives('db_bench_press', s.settings).map((e) => e.id)).not.toContain('push_up');
    s.settings.allowFloor = true;
    expect(alternatives('db_bench_press', s.settings).map((e) => e.id)).toContain('push_up');
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
    expect(plan.blocks.every((b) => b.items.length === 1)).toBe(true);
    expect(items.map((i) => i.exerciseId)).not.toContain('made_up');
    expect(items.some((i) => EXERCISE_BY_ID[i.exerciseId].legs)).toBe(false);
    const bench = items.find((i) => i.exerciseId === 'db_bench_press')!;
    expect(bench.sets).toBeLessThanOrEqual(5); // capped at 5, then trimmed to fit the time limit
    expect(bench.sets).toBeGreaterThanOrEqual(2);
    expect(bench.weight).toBe(40); // start 30 + two notches max during calibration
    expect(items.find((i) => i.exerciseId === 'seated_cable_row')!.weight).toBe(85);
    // dumbbell work moved ahead of cable work
    expect(plan.blocks[0].items[0].exerciseId).toBe('db_bench_press');
  });

  it('accepts the new flat exercise list and drops floor work', () => {
    const s = freshState();
    const plan = sanitizePlan(
      {
        title: 'Upper A', focus: 'x', note: 'n',
        exercises: [
          { exercise_id: 'face_pull', sets: 2, reps: 15, weight: 25, rest_seconds: 45 },
          { exercise_id: 'push_up', sets: 3, reps: 10, weight: 0, rest_seconds: 90 },
          { exercise_id: 'db_bench_press', sets: 3, reps: 8, weight: 30, rest_seconds: 150 }
        ]
      },
      s,
      'A'
    );
    const ids = plan.blocks.map((b) => b.items[0].exerciseId);
    expect(ids.some((id) => EXERCISE_BY_ID[id].floor)).toBe(false); // push-up swapped for a bench stand-in
    expect(ids[ids.length - 1]).toBe('face_pull'); // cable work moved after the dumbbell work
    expect(plan.blocks.find((b) => b.items[0].exerciseId === 'db_bench_press')!.restSeconds).toBe(150);
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
    expect(order).toEqual(['db_bench_press#0', 'db_bench_press#1', 'db_bench_press#2', 'one_arm_db_row#0']);
  });

  it('an old-style two-station pair is done one exercise at a time', () => {
    const base = buildBuiltinPlan(freshState());
    const legacy = { ...base, blocks: [{ label: 'Pair', kind: 'pair' as const, restSeconds: 90, items: [base.blocks[0].items[0], { ...base.blocks[0].items[0], exerciseId: 'seated_cable_row' }] }] };
    const s = startSession(legacy);
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const n = nextSet(s)!;
      order.push(`${s.exercises[n.ex].exerciseId}#${n.set}`);
      s.exercises[n.ex].sets[n.set].done = true;
    }
    expect(order).toEqual(['db_bench_press#0', 'db_bench_press#1', 'db_bench_press#2', 'seated_cable_row#0']);
    expect(sharedStation(['db_bench_press', 'seated_cable_row'])).toBeNull();
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

describe('weekly schedule', () => {
  it('Mon–Thu: A heavy, B heavy, A light, B light; spread-out days are all heavy', () => {
    const show = (days: number[]) => weekSlots(days).map((x) => `${x.dayType}${x.intensity === 'light' ? 'L' : 'H'}`);
    expect(show([0, 1, 2, 3])).toEqual(['AH', 'BH', 'AL', 'BL']);
    expect(show([0, 1, 3, 4])).toEqual(['AH', 'BH', 'AH', 'BH']);
    expect(show([3, 0, 0, 2])).toEqual(['AH', 'BH', 'AH']);
  });

  it('follows the week, picks up where he left off, and restarts on Monday', () => {
    let s = freshState();
    let t = scheduleTarget(s, at(0, 7));
    expect([t.dayType, t.intensity, t.date]).toEqual(['A', 'heavy', '2026-11-16']);
    // Starting the app late in a week offers no catch-up for a week he never began.
    expect(catchUpTarget(s, at(5))).toBeNull();
    expect(scheduleTarget(s, at(5)).date).toBe('2026-11-23');
    s = train(s, at(0));
    t = scheduleTarget(s, at(0, 20));
    expect([t.dayType, t.intensity, t.date]).toEqual(['B', 'heavy', '2026-11-17']);
    s = train(s, at(1));
    t = scheduleTarget(s, at(1, 20));
    expect([t.dayType, t.intensity, t.date]).toEqual(['A', 'light', '2026-11-18']);
    // Skips Wednesday: Thursday gets Wednesday's workout, heavy again after the rest day.
    t = scheduleTarget(s, at(3, 7));
    expect([t.slot, t.dayType, t.intensity, t.date]).toEqual([2, 'A', 'heavy', '2026-11-19']);
    s = train(s, at(3));
    // No training days left this week: next up is Monday's A.
    t = scheduleTarget(s, at(3, 20));
    expect([t.weekOf, t.slot, t.dayType, t.date]).toEqual(['2026-11-23', 0, 'A', '2026-11-23']);
    // Not the same evening, but Friday offers the missed one as an optional catch-up.
    expect(catchUpTarget(s, at(3, 20))).toBeNull();
    const c = catchUpTarget(s, at(4))!;
    expect([c.slot, c.dayType, c.intensity, c.date]).toEqual([3, 'B', 'heavy', '2026-11-20']);
    s = train(s, at(4));
    expect(catchUpTarget(s, at(5))).toBeNull();
    expect(weekInfo(s, at(5)).bonusAvailable).toBe(true);
    // A new week.
    t = scheduleTarget(s, at(7, 7));
    expect([t.weekOf, t.slot, t.dayType, t.intensity]).toEqual(['2026-11-23', 0, 'A', 'heavy']);
  });

  it('a full Mon–Thu week ends on B light, then unlocks the bonus', () => {
    let s = freshState();
    for (let d = 0; d < 3; d++) s = train(s, at(d));
    const t = scheduleTarget(s, at(2, 20));
    expect([t.dayType, t.intensity, t.dayName]).toEqual(['B', 'light', 'Thursday']);
    s = train(s, at(3));
    expect(s.sessions.map((x) => `${x.dayType}${x.intensity === 'light' ? 'L' : 'H'}`)).toEqual(['AH', 'BH', 'AL', 'BL']);
    expect(weekInfo(s, at(4)).bonusAvailable).toBe(true);
    expect(catchUpTarget(s, at(4))).toBeNull();
  });

  it('a plan only sticks while it is still the right workout', () => {
    const s = freshState();
    const t = scheduleTarget(s, at(0, 7));
    const plan = buildBuiltinPlan(s, t);
    expect([plan.weekOf, plan.slot, plan.intensity, plan.plannedDate]).toEqual(['2026-11-16', 0, 'heavy', '2026-11-16']);
    expect(planMatches(plan, t)).toBe(true);
    expect(planMatches(plan, scheduleTarget(s, at(7, 7)))).toBe(false);
    expect(planMatches({ ...plan, dayType: 'B' }, t)).toBe(false);
  });

  it('light days go lighter with more reps and never drag the heavy progression down', () => {
    let s = freshState();
    const benchOf = (p: ReturnType<typeof buildBuiltinPlan>) => p.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'db_bench_press')!;
    s = train(s, at(0), (sess) => {
      const e = sess.exercises.find((x) => x.exerciseId === 'db_bench_press')!;
      e.sets.forEach((x) => ((x.weight = 40), (x.reps = 8), (x.target = { weight: 40, reps: 8 })));
    });
    s = train(s, at(1));
    const light = scheduleTarget(s, at(2, 7));
    expect(light.intensity).toBe('light');
    const lp = buildBuiltinPlan(s, light);
    expect(benchOf(lp).weight).toBeLessThan(40);
    expect(benchOf(lp).reps).toBeGreaterThan(8);
    expect(lp.note).toMatch(/Light day/);
    // Log the light day; next week's heavy A is based on Monday's 40s, not the light weights.
    s = train(s, at(2));
    s = train(s, at(3));
    const heavy = buildBuiltinPlan(s, scheduleTarget(s, at(7, 7)));
    expect(heavy.intensity).toBe('heavy');
    expect(benchOf(heavy).weight).toBeGreaterThanOrEqual(40);
  });

  it("Claude can't push a light day above the last heavy weight", () => {
    let s = freshState();
    s = train(s, at(0), (sess) => {
      const e = sess.exercises.find((x) => x.exerciseId === 'db_bench_press')!;
      e.sets.forEach((x) => ((x.weight = 30), (x.reps = 8)));
    });
    s = train(s, at(1));
    const light = scheduleTarget(s, at(2, 7));
    const p = sanitizePlan({ title: 'A', focus: '', note: '', exercises: [{ exercise_id: 'db_bench_press', sets: 3, reps: 12, weight: 50 }] }, s, light);
    expect(p.intensity).toBe('light');
    expect(p.blocks[0].items[0].weight).toBe(30);
    const heavy = sanitizePlan({ title: 'A', focus: '', note: '', exercises: [{ exercise_id: 'db_bench_press', sets: 3, reps: 8, weight: 50 }] }, s, scheduleTarget(s, at(7, 7)));
    expect(heavy.blocks[0].items[0].weight).toBeLessThanOrEqual(40);
  });
});

describe('Spanish cards', () => {
  it('deck is well-formed', () => {
    expect(BASE_DECK.length).toBeGreaterThan(100);
    expect(migrate({ settings: {}, sessions: [], spanish: { extraCards: [{ id: 'x' }], contexts: { a: [] }, stories: [{}] } }).spanish.extraCards).toEqual([]);
    expect(new Set(BASE_DECK.map((c) => c.word)).size).toBe(BASE_DECK.length);
  });

  it('builds a 4-option question with exactly one right answer', () => {
    const card = BASE_DECK[0];
    const q = buildQuestion(card, 'word', BASE_DECK, () => 0.3);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.answerIndex]).toBe(card.en);
    expect(q.highlight?.[1]).toBe('Cuánto cuesta');
  });

  it('highlights whole words inside sentences', () => {
    expect(findHighlight('¿Dónde está la parada del colectivo?', 'la parada')?.[1]).toBe('la parada');
    expect(findHighlight('Jala hacia el pecho.', 'jalar')).toBeNull();
    expect(findHighlight('Quiero ir a la playa.', 'ya')).toBeNull();
    expect(findHighlight('¿Cuánto cuesta la membresía?', '¿cuánto?')?.[1]).toBe('Cuánto');
  });

  it('every built-in card has a memory hook except a couple', () => {
    expect(BASE_DECK.filter((c) => !c.hook).length).toBeLessThanOrEqual(3);
  });

  it('every built-in sentence contains its own word (so fill-in-the-blank works)', () => {
    const missing = BASE_DECK.filter((c) => !findHighlight(c.es, c.word)).map((c) => c.word);
    expect(missing).toEqual([]);
    expect(new Set(BASE_DECK.map((c) => c.id)).size).toBe(BASE_DECK.length);
  });

  it('starts with trip essentials', () => {
    const first = BASE_DECK.slice(0, 10).map((c) => c.word);
    expect(first).toContain('el taxi');
    expect(first).toContain('¿cuánto cuesta?');
  });

  it('shows a word in different sentences on later reviews', () => {
    const sp = freshState().spanish;
    const card = BASE_DECK.find((c) => c.word === 'la habitación')!;
    const ctx = contextsFor(card, sp);
    expect(ctx.length).toBeGreaterThan(1);
    expect(ctx[0].es).toBe(card.es);
  });

  it('fill-in-the-blank uses the sentence\'s own form and Spanish options', () => {
    const card = BASE_DECK.find((c) => c.word === 'el cambio')!;
    const q = buildQuestion(card, 'cloze', BASE_DECK, () => 0.4);
    expect(q.mode).toBe('cloze');
    expect(q.options[q.answerIndex]).toBe('cambio');
    expect(q.options.every((o) => !/^(el|la) /.test(o))).toBe(true);
    expect(q.optionsLang).toBe('es');
    expect(q.support).toBe(card.sentenceEn);
  });

  it('never shows the right answer twice, even with a sentence borrowed from another card', () => {
    const sp = freshState().spanish;
    const aqui = BASE_DECK.find((c) => c.word === 'aquí')!;
    const ctx = contextsFor(aqui, sp).find((c) => c.es === '¿Está lejos de aquí?')!;
    expect(ctx).toBeTruthy();
    for (let k = 0; k < 30; k++) {
      const q = buildQuestion(aqui, 'sentence', BASE_DECK, Math.random, ctx);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === ctx.en)).toHaveLength(1);
    }
    const cuarto = BASE_DECK.find((c) => c.word === 'el cuarto')!;
    for (let k = 0; k < 30; k++) expect(buildQuestion(cuarto, 'reverse', BASE_DECK).options).not.toContain('la habitación');
  });

  it("fill-in-the-blank's English hint never shows the Spanish answer", () => {
    const col = BASE_DECK.find((c) => c.word === 'el colectivo')!;
    expect(maskAnswer('The colectivo costs forty pesos.', col)).toBe('The shared van costs forty pesos.');
    const cen = BASE_DECK.find((c) => c.word === 'el cenote')!;
    expect(maskAnswer('How much is entry to the cenote?', cen)).not.toMatch(/cenote/i);
    const taxi = BASE_DECK.find((c) => c.word === 'el taxi')!;
    expect(maskAnswer('Where can I get a taxi?', taxi)).toBe('Where can I get a taxi?'); // same word in English
    const q = buildQuestion(col, 'cloze', BASE_DECK, Math.random, { es: 'El colectivo cuesta cuarenta pesos.', en: 'The colectivo costs forty pesos.' });
    expect(q.support).not.toMatch(/colectivo/i);
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
