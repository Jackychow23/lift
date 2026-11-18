// Built-in planning: the offline fallback, the safety rails on Claude's plans,
// weekly bookkeeping (bonus day) and session helpers.
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { CALIBRATION_SESSIONS } from './defaults';
import type { AppState, DayType, Exercise, ExerciseLog, Plan, PlanBlock, PlanItem, Session, Settings } from './types';
import { e1rm, sameWeek, uid } from './util';

// ───────── equipment & weights ─────────

export function isAvailable(ex: Exercise, settings: Settings): boolean {
  if (ex.legs && !settings.includeLegs) return false;
  return ex.needs.every((k) => settings.equipment[k]);
}

export function availableWeights(ex: Exercise, settings: Settings): number[] {
  if (ex.load === 'bodyweight') return [0];
  if (ex.load === 'dumbbell') return [...settings.dumbbells].filter((n) => n > 0).sort((a, b) => a - b);
  const inc = Math.max(1, settings.cableIncrement);
  const out: number[] = [];
  for (let w = inc; w <= settings.cableMax + 1e-9; w += inc) out.push(Math.round(w * 10) / 10);
  return out;
}

export function roundToAvailable(ex: Exercise, w: number, settings: Settings): number {
  const list = availableWeights(ex, settings);
  if (!list.length) return w;
  return list.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), list[0]);
}

/** Move `steps` notches up (+) or down (−) the available weights. */
export function stepWeight(ex: Exercise, w: number, steps: number, settings: Settings): number {
  const list = availableWeights(ex, settings);
  if (!list.length) return w;
  const i = list.indexOf(roundToAvailable(ex, w, settings));
  return list[Math.min(list.length - 1, Math.max(0, i + steps))];
}

export const maxWeight = (ex: Exercise, settings: Settings) => {
  const list = availableWeights(ex, settings);
  return list[list.length - 1] ?? 0;
};

/** Same-pattern stand-ins, best first, for when equipment is missing or a station is busy. */
export function alternatives(exId: string, settings: Settings, exclude: string[] = []): Exercise[] {
  const ex = EXERCISE_BY_ID[exId];
  if (!ex) return [];
  const related: Record<string, string[]> = {
    h_push: ['h_push', 'chest'],
    v_push: ['v_push', 'shoulders'],
    h_pull: ['h_pull', 'posture'],
    v_pull: ['v_pull', 'h_pull'],
    chest: ['chest', 'h_push'],
    shoulders: ['shoulders', 'v_push'],
    triceps: ['triceps'],
    biceps: ['biceps'],
    posture: ['posture'],
    hinge: ['hinge']
  };
  const order = related[ex.pattern] ?? [ex.pattern];
  return EXERCISES.filter((e) => e.id !== exId && !exclude.includes(e.id) && isAvailable(e, settings) && order.includes(e.pattern)).sort(
    (a, b) => order.indexOf(a.pattern) - order.indexOf(b.pattern)
  );
}

function usable(exId: string, settings: Settings, exclude: string[]): string {
  const ex = EXERCISE_BY_ID[exId];
  if (ex && isAvailable(ex, settings)) return exId;
  return alternatives(exId, settings, exclude)[0]?.id ?? exId;
}

// ───────── history ─────────

export const finished = (s: AppState) => s.sessions.filter((x) => x.finishedAt);

export const regularCount = (s: AppState) => finished(s).filter((x) => !x.bonus).length;

export const isCalibrating = (s: AppState) => regularCount(s) < CALIBRATION_SESSIONS;

export function lastLogFor(sessions: Session[], exId: string): ExerciseLog | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (!s.finishedAt) continue;
    const log = s.exercises.find((e) => e.exerciseId === exId && e.sets.some((x) => x.done));
    if (log) return log;
  }
  return null;
}

/** The weight he used most in a log (ties → heavier), with the reps done at it. */
export function workingSet(log: ExerciseLog): { weight: number; reps: number[]; targetReps: number; plannedSets: number } {
  const done = log.sets.filter((x) => x.done);
  const counts = new Map<number, number>();
  for (const d of done) counts.set(d.weight, (counts.get(d.weight) ?? 0) + 1);
  let weight = done[0]?.weight ?? 0;
  for (const [w, c] of counts) if (c > (counts.get(weight) ?? 0) || (c === counts.get(weight) && w > weight)) weight = w;
  return {
    weight,
    reps: done.filter((d) => d.weight === weight).map((d) => d.reps),
    targetReps: log.sets[0]?.target.reps ?? 0,
    plannedSets: log.sets.length
  };
}

// ───────── progression (built-in rules) ─────────

export interface Target {
  weight: number;
  reps: number;
  note?: string;
}

/**
 * Double progression, adapted to how he trains (no difficulty ratings):
 * - beat the top of the rep range on every set → weight goes up (two notches during calibration if it was very easy)
 * - hit today's target → same weight, one more rep next time
 * - missed by 2+ reps or chose a lighter weight → start from what he actually used
 * - at the heaviest dumbbell → keep adding reps, then slow the lowering
 */
export function nextTarget(ex: Exercise, sessions: Session[], settings: Settings, calibrating: boolean): Target {
  const [lo, hi] = ex.repRange;
  const startReps = Math.min(hi, lo + 2);
  if (ex.load === 'bodyweight') {
    if (ex.id === 'chin_tuck') return { weight: 0, reps: 10 };
    const log = lastLogFor(sessions, ex.id);
    if (!log) return { weight: 0, reps: lo };
    const best = Math.max(...log.sets.filter((s) => s.done).map((s) => s.reps));
    return { weight: 0, reps: Math.min(30, best + 1) };
  }
  const log = lastLogFor(sessions, ex.id);
  if (!log) return { weight: roundToAvailable(ex, ex.start, settings), reps: startReps };

  const ws = workingSet(log);
  const minReps = Math.min(...ws.reps);
  const maxReps = Math.max(...ws.reps);
  const top = maxWeight(ex, settings);
  const w = roundToAvailable(ex, ws.weight, settings);

  const bumpSteps = calibrating && minReps >= hi + 2 ? 2 : 1;
  if (minReps >= hi || maxReps >= hi + 3) {
    if (w >= top) {
      const reps = Math.min(hi + 8, maxReps + 1);
      return { weight: top, reps, note: reps > hi + 3 ? 'Heaviest dumbbell: take 3 seconds lowering each rep.' : undefined };
    }
    return { weight: stepWeight(ex, w, bumpSteps, settings), reps: lo };
  }
  if (minReps >= ws.targetReps) return { weight: w, reps: Math.min(hi, Math.max(lo, minReps + 1)) };
  if (minReps <= Math.max(1, ws.targetReps - 3) && minReps < lo) return { weight: stepWeight(ex, w, -1, settings), reps: startReps };
  return { weight: w, reps: Math.max(lo, Math.min(hi, ws.targetReps)) };
}

function chinTuckHold(sessions: Session[]): number {
  const n = sessions.filter((s) => s.finishedAt && s.exercises.some((e) => e.exerciseId === 'chin_tuck' && e.sets.some((x) => x.done))).length;
  return Math.min(10, 5 + Math.floor(n / 4));
}

// ───────── templates ─────────

interface TemplateItem { id: string; sets: number }
interface TemplateBlock { label: string; kind: PlanBlock['kind']; restSeconds: number; items: TemplateItem[] }

export const TEMPLATES: Record<DayType, { title: string; focus: string; warmup: string; blocks: TemplateBlock[] }> = {
  A: {
    title: 'Upper A',
    focus: 'Bench + row focus',
    warmup: 'Two light sets of cable rows, then 10 arm circles each way.',
    blocks: [
      { label: 'Pair A', kind: 'pair', restSeconds: 90, items: [{ id: 'db_bench_press', sets: 3 }, { id: 'seated_cable_row', sets: 3 }] },
      { label: 'Pair B', kind: 'pair', restSeconds: 75, items: [{ id: 'one_arm_db_row', sets: 3 }, { id: 'cable_pushdown', sets: 2 }] },
      { label: 'Posture finisher', kind: 'finisher', restSeconds: 30, items: [{ id: 'chin_tuck', sets: 2 }, { id: 'face_pull', sets: 2 }] }
    ]
  },
  B: {
    title: 'Upper B',
    focus: 'Overhead press + pulldown focus',
    warmup: 'Two light sets of lat pulldowns, then 10 arm circles each way.',
    blocks: [
      { label: 'Pair A', kind: 'pair', restSeconds: 90, items: [{ id: 'db_shoulder_press', sets: 3 }, { id: 'lat_pulldown', sets: 3 }] },
      { label: 'Pair B', kind: 'pair', restSeconds: 75, items: [{ id: 'rear_delt_fly', sets: 3 }, { id: 'db_hammer_curl', sets: 2 }] },
      { label: 'Posture finisher', kind: 'finisher', restSeconds: 30, items: [{ id: 'chin_tuck', sets: 2 }, { id: 'db_scaption', sets: 2 }] }
    ]
  }
};

export function nextDayType(s: AppState): DayType {
  const regular = finished(s).filter((x) => !x.bonus);
  const last = regular[regular.length - 1];
  return last?.dayType === 'A' ? 'B' : 'A';
}

export function buildBuiltinPlan(s: AppState, dayType: DayType = nextDayType(s)): Plan {
  const t = TEMPLATES[dayType];
  const calibrating = isCalibrating(s);
  const done = finished(s);
  const used: string[] = [];
  const blocks: PlanBlock[] = t.blocks.map((b) => ({
    label: b.label,
    kind: b.kind,
    restSeconds: b.restSeconds,
    items: b.items.flatMap((it): PlanItem[] => {
      const id = usable(it.id, s.settings, used);
      const ex = EXERCISE_BY_ID[id];
      if (!ex || !isAvailable(ex, s.settings) || used.includes(id)) return [];
      used.push(id);
      const tgt = nextTarget(ex, done, s.settings, calibrating);
      return [
        {
          exerciseId: id,
          sets: it.sets,
          reps: tgt.reps,
          weight: tgt.weight,
          holdSeconds: id === 'chin_tuck' ? chinTuckHold(done) : undefined,
          note: tgt.note
        }
      ];
    })
  })).filter((b) => b.items.length > 0);
  const n = regularCount(s);
  const note = calibrating
    ? n === 0
      ? 'First session: weights start light on purpose. If a set feels easy, add reps; that tells the plan where you really are.'
      : `Calibration ${n + 1} of ${CALIBRATION_SESSIONS}: weights move up fast while we find your level. Add reps whenever a set feels easy.`
    : 'Same rules as always: beat the reps and the weight goes up next time.';
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: 'builtin',
    dayType,
    title: t.title,
    focus: t.focus,
    note,
    warmup: t.warmup,
    blocks
  };
}

// ───────── week + bonus day ─────────

/** 0..1+ : how much of the planned work got done, weighted by load. */
export function sessionScore(session: Session): number {
  let target = 0;
  let got = 0;
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      const t = set.target.weight > 0 ? e1rm(set.target.weight, set.target.reps) : set.target.reps;
      if (t <= 0) continue;
      target += 1;
      if (!set.done) continue;
      const a = set.target.weight > 0 ? e1rm(set.weight, set.reps) : set.reps;
      got += Math.min(1.2, a / t);
    }
  }
  return target ? got / target : 1;
}

export function weekInfo(s: AppState, now = new Date()) {
  const thisWeek = finished(s).filter((x) => x.finishedAt && sameWeek(new Date(x.finishedAt), now));
  const regular = thisWeek.filter((x) => !x.bonus);
  const bonusDone = thisWeek.some((x) => x.bonus);
  let weakest: Session | null = null;
  for (const x of regular) if (!weakest || sessionScore(x) < sessionScore(weakest)) weakest = x;
  return { thisWeek, regularCount: regular.length, bonusDone, bonusAvailable: regular.length >= 4 && !bonusDone && !!weakest, weakest };
}

/** Bonus day: repeat the week's weakest session with the same targets, to have another go at it. */
export function buildBonusPlan(s: AppState): Plan | null {
  const { weakest } = weekInfo(s);
  if (!weakest) return null;
  const blocks: PlanBlock[] = weakest.blocks.map((b, bi) => ({
    ...b,
    items: weakest.exercises
      .filter((e) => e.blockIndex === bi)
      .map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.length,
        reps: e.sets[0]?.target.reps ?? 8,
        weight: e.sets[0]?.target.weight ?? 0,
        holdSeconds: e.holdSeconds
      }))
  }));
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: 'builtin',
    dayType: weakest.dayType,
    bonus: true,
    title: `Bonus: ${weakest.title.replace(/^Bonus:\s*/, '')}`,
    focus: 'Another go at your weakest day this week',
    note: 'Same targets as the day that went worst. Beat them if you can; it counts toward next week.',
    warmup: 'Same warm-up as before: two light sets of the first pulling exercise, then arm circles.',
    blocks
  };
}

// ───────── sessions ─────────

export function startSession(plan: Plan): Session {
  const exercises: ExerciseLog[] = [];
  plan.blocks.forEach((b, bi) =>
    b.items.forEach((it) =>
      exercises.push({
        exerciseId: it.exerciseId,
        blockIndex: bi,
        holdSeconds: it.holdSeconds,
        note: it.note,
        sets: Array.from({ length: it.sets }, () => ({
          target: { weight: it.weight, reps: it.reps },
          weight: it.weight,
          reps: it.reps,
          done: false
        }))
      })
    )
  );
  return {
    id: uid(),
    planId: plan.id,
    planSource: plan.source,
    dayType: plan.dayType,
    bonus: plan.bonus,
    title: plan.title,
    startedAt: new Date().toISOString(),
    blocks: plan.blocks.map((b) => ({ label: b.label, kind: b.kind, restSeconds: b.restSeconds })),
    exercises
  };
}

/** Next set to do, alternating between the exercises of a pair: A1 s1, A2 s1, A1 s2, … */
export function nextSet(session: Session): { ex: number; set: number } | null {
  for (let bi = 0; bi < session.blocks.length; bi++) {
    const idx = session.exercises.map((e, i) => (e.blockIndex === bi ? i : -1)).filter((i) => i >= 0);
    const rounds = Math.max(0, ...idx.map((i) => session.exercises[i].sets.length));
    for (let r = 0; r < rounds; r++)
      for (const i of idx) {
        const set = session.exercises[i].sets[r];
        if (set && !set.done) return { ex: i, set: r };
      }
  }
  return null;
}

export const setCounts = (session: Session) => {
  const all = session.exercises.flatMap((e) => e.sets);
  return { done: all.filter((x) => x.done).length, total: all.length };
};

// ───────── guardrails for plans from Claude ─────────

export interface RawPlanItem { exercise_id: string; sets: number; reps: number; weight: number; hold_seconds?: number; note?: string }
export interface RawPlanBlock { label: string; kind: string; rest_seconds: number; items: RawPlanItem[] }
export interface RawPlan { title: string; focus: string; note: string; warmup: string; blocks: RawPlanBlock[] }

/**
 * Keep a plan inside safe, doable bounds no matter what came back:
 * known exercises only, equipment he has, real dumbbell/stack weights,
 * no jump of more than two notches over what he last lifted, ~16 working sets.
 */
export function sanitizePlan(raw: RawPlan, s: AppState, dayType: DayType): Plan {
  const calibrating = isCalibrating(s);
  const done = finished(s);
  const used: string[] = [];
  let budget = 18;
  const blocks: PlanBlock[] = [];
  for (const b of Array.isArray(raw.blocks) ? raw.blocks.slice(0, 5) : []) {
    const items: PlanItem[] = [];
    for (const it of Array.isArray(b.items) ? b.items.slice(0, 3) : []) {
      if (budget <= 0) break;
      if (!EXERCISE_BY_ID[it.exercise_id]) continue;
      const id = usable(it.exercise_id, s.settings, used);
      const ex = EXERCISE_BY_ID[id];
      if (!ex || !isAvailable(ex, s.settings) || used.includes(id)) continue;
      const sets = Math.max(1, Math.min(5, Math.round(Number(it.sets) || 3), budget));
      budget -= sets;
      let weight = ex.load === 'bodyweight' ? 0 : roundToAvailable(ex, Number(it.weight) || ex.start, s.settings);
      const last = lastLogFor(done, id);
      if (ex.load !== 'bodyweight') {
        const ref = last ? workingSet(last).weight : ex.start;
        const cap = stepWeight(ex, ref, calibrating ? 2 : 1, s.settings);
        if (weight > cap) weight = cap;
      }
      const reps = Math.max(1, Math.min(30, Math.round(Number(it.reps) || ex.repRange[0])));
      const hold = id === 'chin_tuck' ? Math.max(3, Math.min(15, Math.round(Number(it.hold_seconds) || 5))) : undefined;
      used.push(id);
      items.push({ exerciseId: id, sets, reps, weight, holdSeconds: hold, note: typeof it.note === 'string' ? it.note.slice(0, 140) : undefined });
    }
    if (!items.length) continue;
    const kind: PlanBlock['kind'] = b.kind === 'finisher' ? 'finisher' : items.length > 1 ? 'pair' : 'single';
    const rest = Math.max(20, Math.min(240, Math.round(Number(b.rest_seconds) || (kind === 'finisher' ? 30 : 90))));
    blocks.push({ label: String(b.label || `Block ${blocks.length + 1}`).slice(0, 40), kind, restSeconds: rest, items });
  }
  if (!blocks.length) throw new Error('Plan had no usable exercises');
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: 'claude',
    dayType,
    title: String(raw.title || TEMPLATES[dayType].title).slice(0, 40),
    focus: String(raw.focus || '').slice(0, 80),
    note: String(raw.note || '').slice(0, 280),
    warmup: String(raw.warmup || TEMPLATES[dayType].warmup).slice(0, 200),
    blocks
  };
}
