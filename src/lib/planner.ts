// Built-in planning: the offline fallback, the safety rails on Claude's plans,
// weekly bookkeeping (bonus day) and session helpers.
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { CALIBRATION_SESSIONS } from './defaults';
import type { AppState, DayType, Exercise, ExerciseLog, Intensity, Plan, PlanBlock, Session, Settings } from './types';
import { addDays, DAY_NAMES, e1rm, isoDate, sameDay, sameWeek, uid, weekdayIndex, weekStart } from './util';

// ───────── equipment & weights ─────────

export function isAvailable(ex: Exercise, settings: Settings): boolean {
  if (ex.legs && !settings.includeLegs) return false;
  return ex.needs.every((k) => settings.equipment[k]);
}

/** Fit for a regular plan: equipment he has, legs only if switched on, floor work only if switched on. */
export function plannable(ex: Exercise, settings: Settings): boolean {
  return isAvailable(ex, settings) && (!ex.floor || settings.allowFloor);
}

export function availableWeights(ex: Exercise, settings: Settings): number[] {
  if (ex.load === 'bodyweight') return [0];
  if (ex.load === 'dumbbell') return [...settings.dumbbells].filter((n) => n > 0).sort((a, b) => a - b);
  const machine = ex.load === 'machine';
  const inc = Math.max(1, machine ? settings.machineIncrement : settings.cableIncrement);
  const max = machine ? settings.machineMax : settings.cableMax;
  const out: number[] = [];
  for (let w = inc; w <= max + 1e-9; w += inc) out.push(Math.round(w * 10) / 10);
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
  const sameStation = (e: Exercise) => (station(e) === station(ex) ? 0 : 1);
  return EXERCISES.filter((e) => e.id !== exId && !exclude.includes(e.id) && plannable(e, settings) && order.includes(e.pattern)).sort(
    (a, b) => order.indexOf(a.pattern) - order.indexOf(b.pattern) || sameStation(a) - sameStation(b)
  );
}

// ───────── stations: dumbbells/bench, the pulldown/row machine, the cable machine ─────────

export type Station = 'dumbbells' | 'machine' | 'cable' | 'anywhere';

export const station = (ex: Exercise | undefined): Station =>
  !ex ? 'anywhere' : ex.load === 'cable' ? 'cable' : ex.load === 'machine' ? 'machine' : ex.load === 'dumbbell' ? 'dumbbells' : 'anywhere';

export const STATION_LABEL: Record<Station, string> = { dumbbells: 'Dumbbells', machine: 'Pulldown/row machine', cable: 'Cable machine', anywhere: 'No equipment' };

/** Walking order: benches, then the pulldown/row machine, then the (often busy) cable machine. */
const STATION_RANK: Record<Station, number> = { dumbbells: 0, machine: 1, cable: 2, anywhere: 0 };

/** The equipment a group of exercises shares, or null if they'd need two stations. */
export function sharedStation(ids: string[]): Station | null {
  const st = [...new Set(ids.map((id) => station(EXERCISE_BY_ID[id])).filter((s) => s !== 'anywhere'))];
  if (st.length > 1) return null;
  return st[0] ?? 'anywhere';
}

function usable(exId: string, settings: Settings, exclude: string[]): string {
  const ex = EXERCISE_BY_ID[exId];
  if (ex && plannable(ex, settings)) return exId;
  return alternatives(exId, settings, exclude)[0]?.id ?? exId;
}

/** Rest between sets: longer for the main lifts (time for a Spanish card or two). */
export function defaultRest(ex: Exercise | undefined): number {
  if (!ex) return 90;
  if (ex.id === 'chin_tuck') return 30;
  if (ex.pattern === 'posture') return 45;
  if (['h_push', 'v_push', 'h_pull', 'v_pull'].includes(ex.pattern) && ex.repRange[0] <= 6) return 150;
  return 75;
}

const kindFor = (ex: Exercise | undefined): PlanBlock['kind'] => (ex?.pattern === 'posture' ? 'finisher' : 'single');

// ───────── timing: every plan has to fit his time limit ─────────

/** Seconds to move to an exercise and set it up. */
export const SETUP_SECONDS = 45;
/** His own lighter warm-up sets before each main lift. */
export const WARMUP_SECONDS = 75;

export const isMainLift = (ex: Exercise | undefined) =>
  !!ex && ['h_push', 'v_push', 'h_pull', 'v_pull'].includes(ex.pattern) && ex.repRange[0] <= 6;

/** Rough time under the bar for one set. */
export function setSeconds(ex: Exercise, reps: number, hold?: number): number {
  if (hold) return reps * hold + 10;
  const base = reps > 12 ? 50 : 40;
  return ex.unilateral ? base * 2 : base;
}

/** Estimated workout length: set-up, warm-up sets for main lifts, working sets and the rests between them. */
export function estimateSeconds(blocks: PlanBlock[]): number {
  let t = 0;
  blocks.forEach((b, bi) =>
    b.items.forEach((it, ii) => {
      const ex = EXERCISE_BY_ID[it.exerciseId];
      if (!ex) return;
      if (bi > 0 || ii > 0) t += SETUP_SECONDS;
      if (isMainLift(ex)) t += WARMUP_SECONDS;
      t += it.sets * setSeconds(ex, it.reps, it.holdSeconds) + Math.max(0, it.sets - 1) * b.restSeconds;
    })
  );
  return t;
}

export const estimateMinutes = (blocks: PlanBlock[]) => Math.round(estimateSeconds(blocks) / 60);

/** Time left in a workout in progress. */
export function remainingSeconds(session: Session): number {
  let t = 0;
  // Before the first set, the first exercise's set-up isn't counted (same as the plan estimate).
  let skipSetup = !session.exercises.some((e) => e.sets.some((x) => x.done));
  session.exercises.forEach((log) => {
    const ex = EXERCISE_BY_ID[log.exerciseId];
    if (!ex) return;
    const left = log.sets.filter((x) => !x.done);
    if (!left.length) return;
    const started = log.sets.some((x) => x.done);
    const rest = session.blocks[log.blockIndex]?.restSeconds ?? 60;
    if (!started) t += (skipSetup ? 0 : SETUP_SECONDS) + (isMainLift(ex) ? WARMUP_SECONDS : 0);
    skipSetup = false;
    t += left.reduce((n, x) => n + setSeconds(ex, x.reps, log.holdSeconds), 0) + (started ? left.length : left.length - 1) * rest;
  });
  return t;
}

/**
 * Trim a plan until it fits the time limit. Order of cuts: extra accessory sets, extra main-lift
 * sets, then whole accessories from the end, then posture sets (chin tucks stay), then main lifts down to 2 sets.
 */
export function fitToTime(blocks: PlanBlock[], limitSeconds: number): PlanBlock[] {
  const out: PlanBlock[] = blocks.map((b) => ({ ...b, items: b.items.map((i) => ({ ...i })) }));
  const role = (id: string) => {
    const ex = EXERCISE_BY_ID[id];
    return isMainLift(ex) ? 'main' : ex?.pattern === 'posture' ? 'posture' : 'accessory';
  };
  for (let guard = 0; guard < 40 && estimateSeconds(out) > limitSeconds; guard++) {
    const items = out.flatMap((b, bi) => b.items.map((it, ii) => ({ it, bi, ii, role: role(it.exerciseId) })));
    const pick =
      [...items].reverse().find((x) => x.role === 'accessory' && x.it.sets > 2) ??
      [...items].reverse().find((x) => x.role === 'main' && x.it.sets > 3) ??
      [...items].reverse().find((x) => x.role === 'accessory') ??
      [...items].reverse().find((x) => x.role === 'posture' && x.it.exerciseId !== 'chin_tuck' && x.it.sets > 1) ??
      [...items].reverse().find((x) => x.role === 'main' && x.it.sets > 2);
    if (!pick) break;
    if (pick.role === 'accessory' && pick.it.sets <= 2) {
      out[pick.bi].items.splice(pick.ii, 1);
      if (!out[pick.bi].items.length) out.splice(pick.bi, 1);
    } else pick.it.sets -= 1;
  }
  return out;
}

/**
 * Do all the dumbbell/bench work first, then the pulldown/row machine, then the cable machine,
 * so he never walks back. Bodyweight moves stay with whatever comes before them.
 */
export function orderByStation(blocks: PlanBlock[]): PlanBlock[] {
  let prev: Station = 'dumbbells';
  return blocks
    .map((b, i) => {
      const st = sharedStation(b.items.map((x) => x.exerciseId)) ?? 'cable';
      const eff = st === 'anywhere' ? prev : st;
      prev = eff;
      return { b, i, r: STATION_RANK[eff] };
    })
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.b);
}

/** One exercise at a time: split any pairs (from older plans) and order by station. */
export function toStraightSets(plan: Plan): { plan: Plan; changed: boolean } {
  let changed = false;
  const blocks: PlanBlock[] = [];
  for (const b of plan.blocks) {
    if (b.items.length > 1) {
      changed = true;
      for (const it of b.items) {
        const ex = EXERCISE_BY_ID[it.exerciseId];
        blocks.push({ label: ex?.name ?? it.exerciseId, kind: kindFor(ex), restSeconds: defaultRest(ex), items: [it] });
      }
    } else blocks.push(b);
  }
  const ordered = orderByStation(blocks);
  if (ordered.some((b, i) => b !== blocks[i])) changed = true;
  return { plan: changed ? { ...plan, blocks: ordered } : plan, changed };
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
export function nextTarget(ex: Exercise, sessions: Session[], settings: Settings, calibrating: boolean, light = false): Target {
  // Progression comes from heavy days; a light day's lower weights must not drag it down.
  const heavy = sessions.filter((x) => x.intensity !== 'light');
  const base = heavyTarget(ex, lastLogFor(heavy, ex.id) ? heavy : sessions, settings, calibrating);
  if (!light || ex.load === 'bodyweight') return base;
  const lighter = availableWeights(ex, settings).filter((w) => w <= base.weight * 0.87);
  const weight = lighter.length ? lighter[lighter.length - 1] : availableWeights(ex, settings)[0] ?? base.weight;
  return { weight, reps: Math.min(ex.repRange[1] + 3, base.reps + 3), note: base.note };
}

function heavyTarget(ex: Exercise, sessions: Session[], settings: Settings, calibrating: boolean): Target {
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

/** Built-in days: one exercise at a time, dumbbells first, then the cable machine. ~12 sets, ~30 min. */
export const TEMPLATES: Record<DayType, { title: string; focus: string; items: TemplateItem[] }> = {
  A: {
    title: 'Upper A',
    focus: 'Bench + row focus',
    items: [
      { id: 'db_bench_press', sets: 3 },
      { id: 'one_arm_db_row', sets: 3 },
      { id: 'cable_pushdown', sets: 2 },
      { id: 'face_pull', sets: 2 },
      { id: 'chin_tuck', sets: 2 }
    ]
  },
  B: {
    title: 'Upper B',
    focus: 'Overhead press + pulldown focus',
    items: [
      { id: 'db_shoulder_press', sets: 3 },
      { id: 'lat_pulldown', sets: 3 },
      { id: 'seated_cable_row', sets: 2 },
      { id: 'face_pull', sets: 2 },
      { id: 'chin_tuck', sets: 2 }
    ]
  }
};

// ───────── the week: training days, heavy/light, what's next ─────────

export interface Slot {
  weekday: number;
  dayType: DayType;
  intensity: Intensity;
}

/** The week's workouts: A/B alternate; heavy on the 1st–2nd day in a row, light from the 3rd. */
export function weekSlots(days: number[]): Slot[] {
  const sorted = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  const list = sorted.length ? sorted : [0, 1, 2, 3];
  let run = 0;
  return list.map((d, i) => {
    run = i > 0 && list[i - 1] === d - 1 ? run + 1 : 1;
    return { weekday: d, dayType: i % 2 === 0 ? 'A' : 'B', intensity: run >= 3 ? 'light' : 'heavy' };
  });
}

export interface ScheduleTarget extends Slot {
  /** Monday of the week (YYYY-MM-DD). */
  weekOf: string;
  /** Which workout of the week (0-based). */
  slot: number;
  /** The day it's planned for (YYYY-MM-DD). */
  date: string;
  dayName: string;
}

/** Days (YYYY-MM-DD) with a finished workout, bonus included. */
export const trainedDates = (s: AppState) => new Set(finished(s).map((x) => isoDate(new Date(x.finishedAt!))));

/** Light on the third day in a row he actually trains; heavy after any rest day. */
export const intensityOn = (date: Date, trained: Set<string>): Intensity =>
  trained.has(isoDate(addDays(date, -1))) && trained.has(isoDate(addDays(date, -2))) ? 'light' : 'heavy';

/**
 * What the next workout is. Within a week it picks up where he left off (miss Wednesday and
 * Thursday gets Wednesday's workout); once the week's training days are over, it's next Monday's.
 */
export function scheduleTarget(s: AppState, now = new Date()): ScheduleTarget {
  const slots = weekSlots(s.settings.trainingDays);
  const ws = weekStart(now);
  const regs = finished(s).filter((x) => !x.bonus && sameWeek(new Date(x.finishedAt!), now));
  const today = weekdayIndex(now);
  const trainedToday = regs.some((x) => sameDay(new Date(x.finishedAt!), now));
  const daysLeft = slots.map((sl) => sl.weekday).filter((d) => d > today || (d === today && !trainedToday));
  if (regs.length < slots.length && daysLeft.length) {
    const day = daysLeft[0];
    const date = addDays(ws, day);
    const sl = slots[regs.length];
    return { ...sl, intensity: intensityOn(date, trainedDates(s)), weekOf: isoDate(ws), slot: regs.length, date: isoDate(date), dayName: DAY_NAMES[day] };
  }
  const next = addDays(ws, 7);
  const date = addDays(next, slots[0].weekday);
  return { ...slots[0], intensity: intensityOn(date, trainedDates(s)), weekOf: isoDate(next), slot: 0, date: isoDate(date), dayName: DAY_NAMES[slots[0].weekday] };
}

/**
 * A workout missed earlier this week, offered once no training days are left (e.g. on Friday).
 * Optional: skipping it is fine, Monday starts the next week either way.
 */
export function catchUpTarget(s: AppState, now = new Date()): ScheduleTarget | null {
  const ws = weekStart(now);
  if (s.skipCatchUpWeek === isoDate(ws) || scheduleTarget(s, now).weekOf === isoDate(ws)) return null;
  const slots = weekSlots(s.settings.trainingDays);
  const regs = finished(s).filter((x) => !x.bonus && sameWeek(new Date(x.finishedAt!), now));
  // Only for a week he's actually been training (not a fresh start mid-week), and not twice in one day.
  if (!regs.length || regs.length >= slots.length || regs.some((x) => sameDay(new Date(x.finishedAt!), now))) return null;
  return {
    ...slots[regs.length],
    intensity: intensityOn(now, trainedDates(s)),
    weekOf: isoDate(ws),
    slot: regs.length,
    date: isoDate(now),
    dayName: DAY_NAMES[weekdayIndex(now)]
  };
}

export const planMatches = (plan: Plan | null, t: ScheduleTarget) =>
  !!plan && !plan.bonus && plan.weekOf === t.weekOf && plan.slot === t.slot && plan.dayType === t.dayType && (plan.intensity ?? 'heavy') === t.intensity;

/** Kept for older callers: the next workout's A/B. */
export const nextDayType = (s: AppState): DayType => scheduleTarget(s).dayType;

const asTarget = (s: AppState, t?: ScheduleTarget | DayType): ScheduleTarget => {
  if (t && typeof t === 'object') return t;
  const base = scheduleTarget(s);
  return t ? { ...base, dayType: t, intensity: 'heavy' } : base;
};

export const INTENSITY_NOTE: Record<Intensity, string> = {
  heavy: 'Heavy day: you’ve had rest, so push the main lifts.',
  light: 'Light day (third day in a row): lighter weights, a few more reps, smooth and fast. Nothing grindy.'
};

export function buildBuiltinPlan(s: AppState, target?: ScheduleTarget | DayType): Plan {
  const tg = asTarget(s, target);
  const dayType = tg.dayType;
  const light = tg.intensity === 'light';
  const t = TEMPLATES[dayType];
  const calibrating = isCalibrating(s);
  const done = finished(s);
  const used: string[] = [];
  const blocks: PlanBlock[] = t.items.flatMap((it): PlanBlock[] => {
    const id = usable(it.id, s.settings, used);
    const ex = EXERCISE_BY_ID[id];
    if (!ex || !plannable(ex, s.settings) || used.includes(id)) return [];
    used.push(id);
    const tgt = nextTarget(ex, done, s.settings, calibrating, light);
    return [
      {
        label: ex.name,
        kind: kindFor(ex),
        restSeconds: defaultRest(ex),
        items: [
          {
            exerciseId: id,
            sets: it.sets,
            reps: tgt.reps,
            weight: tgt.weight,
            holdSeconds: id === 'chin_tuck' ? chinTuckHold(done) : undefined,
            note: tgt.note
          }
        ]
      }
    ];
  });
  const n = regularCount(s);
  const note = calibrating
    ? n === 0
      ? 'First session: weights start light on purpose. If a set feels easy, add reps; that tells the plan where you really are.'
      : `Calibration ${n + 1} of ${CALIBRATION_SESSIONS}: weights move up fast while we find your level. Add reps whenever a set feels easy. ${INTENSITY_NOTE[tg.intensity]}`
    : `${INTENSITY_NOTE[tg.intensity]} Beat the reps and the weight goes up next time.`;
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: 'builtin',
    dayType,
    intensity: tg.intensity,
    weekOf: tg.weekOf,
    slot: tg.slot,
    plannedDate: tg.date,
    title: t.title,
    focus: t.focus,
    note,
    blocks: fitToTime(orderByStation(blocks), s.settings.sessionMinutes * 60)
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
  const planned = weekSlots(s.settings.trainingDays).length;
  let weakest: Session | null = null;
  for (const x of regular) if (!weakest || sessionScore(x) < sessionScore(weakest)) weakest = x;
  return { thisWeek, regularCount: regular.length, planned, bonusDone, bonusAvailable: regular.length >= planned && !bonusDone && !!weakest, weakest };
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
    intensity: weakest.intensity,
    bonus: true,
    title: `Bonus: ${weakest.title.replace(/^Bonus:\s*/, '')}`,
    focus: 'Another go at your weakest day this week',
    note: 'Same targets as the day that went worst. Beat them if you can; it counts toward next week.',
    blocks: fitToTime(blocks, s.settings.sessionMinutes * 60)
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
    intensity: plan.intensity,
    title: plan.title,
    startedAt: new Date().toISOString(),
    blocks: plan.blocks.map((b) => ({ label: b.label, kind: b.kind, restSeconds: b.restSeconds })),
    exercises
  };
}

/** Indexes of a block's exercises, and whether they alternate (only when they share one station). */
export function blockExercises(session: Session, bi: number) {
  const idx = session.exercises.map((e, i) => (e.blockIndex === bi ? i : -1)).filter((i) => i >= 0);
  const alternate = idx.length > 1 && sharedStation(idx.map((i) => session.exercises[i].exerciseId)) !== null;
  return { idx, alternate };
}

/**
 * Next set to do. In a pair on one station it alternates: 1a s1, 1b s1, 1a s2, …
 * If a swap left a pair on two stations, it does them one after the other instead.
 */
export function nextSet(session: Session): { ex: number; set: number } | null {
  for (let bi = 0; bi < session.blocks.length; bi++) {
    const { idx, alternate } = blockExercises(session, bi);
    if (alternate) {
      const rounds = Math.max(0, ...idx.map((i) => session.exercises[i].sets.length));
      for (let r = 0; r < rounds; r++)
        for (const i of idx) {
          const set = session.exercises[i].sets[r];
          if (set && !set.done) return { ex: i, set: r };
        }
    } else {
      for (const i of idx) {
        const r = session.exercises[i].sets.findIndex((x) => !x.done);
        if (r >= 0) return { ex: i, set: r };
      }
    }
  }
  return null;
}

/**
 * "Cable machine taken": swap every cable exercise that hasn't been started for a
 * non-cable stand-in (or, with on=false, swap back to the originals).
 */
export function cableSwap(session: Session, settings: Settings, history: Session[], calibrating: boolean, on: boolean) {
  const next: Session = structuredClone(session);
  const changes: [string, string][] = [];
  next.exercises.forEach((log) => {
    if (log.sets.some((x) => x.done)) return;
    let to: string | undefined;
    if (on && EXERCISE_BY_ID[log.exerciseId]?.load === 'cable') {
      const used = next.exercises.map((e) => e.exerciseId);
      to = alternatives(log.exerciseId, settings, used).find((e) => e.load !== 'cable')?.id;
      if (to) log.originalExerciseId = log.exerciseId;
    } else if (!on && log.originalExerciseId) {
      to = log.originalExerciseId;
      log.originalExerciseId = undefined;
    }
    if (!to) return;
    const ex = EXERCISE_BY_ID[to];
    const t = nextTarget(ex, history, settings, calibrating, session.intensity === 'light');
    changes.push([log.exerciseId, to]);
    log.exerciseId = to;
    log.holdSeconds = ex.holdSeconds;
    log.note = undefined;
    log.sets = log.sets.map((x) => ({ target: { weight: t.weight, reps: t.reps }, weight: t.weight, reps: t.reps, done: false, extra: x.extra }));
  });
  next.cableBusy = on;
  return { session: next, changes };
}

export const setCounts = (session: Session) => {
  const all = session.exercises.flatMap((e) => e.sets);
  return { done: all.filter((x) => x.done).length, total: all.length };
};

// ───────── guardrails for plans from Claude ─────────

export interface RawPlanItem { exercise_id: string; sets: number; reps: number; weight: number; rest_seconds?: number; hold_seconds?: number; note?: string }
export interface RawPlanBlock { label?: string; kind?: string; rest_seconds?: number; items: RawPlanItem[] }
/** New plans list exercises in order; older answers grouped them in blocks. Both are accepted. */
export interface RawPlan { title: string; focus: string; note: string; exercises?: RawPlanItem[]; blocks?: RawPlanBlock[] }

/**
 * Keep a plan inside safe, doable bounds no matter what came back:
 * known exercises only, equipment he has, no floor work unless switched on,
 * real dumbbell/stack weights, no jump of more than two notches over what he
 * last lifted, ~15 working sets, one exercise at a time, dumbbells before cables.
 */
export function sanitizePlan(raw: RawPlan, s: AppState, target?: ScheduleTarget | DayType): Plan {
  const tg = asTarget(s, target);
  const dayType = tg.dayType;
  const calibrating = isCalibrating(s);
  const done = finished(s);
  const heavyDone = done.filter((x) => x.intensity !== 'light');
  const used: string[] = [];
  let budget = 15;
  const flat: { it: RawPlanItem; rest?: number }[] = Array.isArray(raw.exercises)
    ? raw.exercises.map((it) => ({ it, rest: it?.rest_seconds }))
    : (Array.isArray(raw.blocks) ? raw.blocks : []).flatMap((b) =>
        (Array.isArray(b?.items) ? b.items : []).map((it) => ({ it, rest: it?.rest_seconds ?? (b.items.length > 1 ? undefined : b.rest_seconds) }))
      );
  const blocks: PlanBlock[] = [];
  // A stand-in for something he can't do must not be an exercise that's already further down the list.
  const requested = flat.map((f) => f.it?.exercise_id).filter((x): x is string => typeof x === 'string');
  for (const { it, rest } of flat.slice(0, 8)) {
    if (budget <= 0) break;
    if (!it || !EXERCISE_BY_ID[it.exercise_id]) continue;
    const id = usable(it.exercise_id, s.settings, [...used, ...requested.filter((r) => r !== it.exercise_id)]);
    const ex = EXERCISE_BY_ID[id];
    if (!ex || !plannable(ex, s.settings) || used.includes(id)) continue;
    const sets = Math.max(1, Math.min(5, Math.round(Number(it.sets) || 3), budget));
    budget -= sets;
    let weight = ex.load === 'bodyweight' ? 0 : roundToAvailable(ex, Number(it.weight) || ex.start, s.settings);
    const last = lastLogFor(heavyDone, id) ?? lastLogFor(done, id);
    if (ex.load !== 'bodyweight') {
      const ref = last ? workingSet(last).weight : ex.start;
      // Light days never go above the last heavy weight; heavy days move at most 1 step (2 in calibration).
      const cap = stepWeight(ex, ref, tg.intensity === 'light' ? 0 : calibrating ? 2 : 1, s.settings);
      if (weight > cap) weight = cap;
    }
    const reps = Math.max(1, Math.min(30, Math.round(Number(it.reps) || ex.repRange[0])));
    const hold = id === 'chin_tuck' ? Math.max(3, Math.min(15, Math.round(Number(it.hold_seconds) || 5))) : undefined;
    const restSeconds = Math.max(20, Math.min(240, Math.round(Number(rest) || defaultRest(ex))));
    used.push(id);
    blocks.push({
      label: ex.name,
      kind: kindFor(ex),
      restSeconds,
      items: [{ exerciseId: id, sets, reps, weight, holdSeconds: hold, note: typeof it.note === 'string' ? it.note.slice(0, 140) : undefined }]
    });
  }
  if (!blocks.length) throw new Error('Plan had no usable exercises');
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: 'claude',
    dayType,
    intensity: tg.intensity,
    weekOf: tg.weekOf,
    slot: tg.slot,
    plannedDate: tg.date,
    title: String(raw.title || TEMPLATES[dayType].title).slice(0, 40),
    focus: String(raw.focus || '').slice(0, 80),
    note: String(raw.note || '').slice(0, 280),
    blocks: fitToTime(orderByStation(blocks), s.settings.sessionMinutes * 60)
  };
}
