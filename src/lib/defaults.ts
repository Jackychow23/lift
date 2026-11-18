import type { AppState, Settings } from './types';

export const DEFAULT_ABOUT_ME = `Goal: strength. Training 4 days a week, about 30 minutes each, sometimes a 5th day.
Coming back after 2–3 years without regular lifting. Old barbell numbers from back then: deadlift 345×4, bench 155×6, squat 240×4 — not current, just a reference.
Posture: my neck/head sits too far forward. I want work that strengthens posture in every week.
Skipping legs for now until the routine is consistent. I don't like squats. I like deadlifts but they take too long to set up.
Keep setup quick: no power rack, no barbells or plates, and I'd rather avoid the Smith machine.
If a set feels easy I add reps or a set; if it's too hard I lower the weight. I don't rate difficulty.
I warm up by doing the workout itself at a lighter weight first, so no separate warm-up.`;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'claude-sonnet-5-5',
  dumbbells: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  cableIncrement: 5,
  cableMax: 200,
  equipment: {
    flat_bench: true,
    adjustable_bench: false,
    rope: true,
    lat_bar: true,
    v_bar: true,
    d_handle: true,
    straight_bar: true
  },
  includeLegs: false,
  sound: true,
  aboutMe: DEFAULT_ABOUT_ME
};

export function freshState(): AppState {
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    plan: null,
    active: null,
    sessions: [],
    posture: [],
    assessment: null,
    spanish: { progress: {}, extraCards: [], recent: [] },
    claude: { lastError: null, lastSuccess: null }
  };
}

/** Fill in anything missing from an older or imported save. */
export function migrate(raw: unknown): AppState {
  const base = freshState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<AppState>;
  return {
    ...base,
    ...s,
    version: 1,
    settings: {
      ...base.settings,
      ...(s.settings ?? {}),
      equipment: { ...base.settings.equipment, ...(s.settings?.equipment ?? {}) }
    },
    sessions: Array.isArray(s.sessions) ? s.sessions : [],
    posture: Array.isArray(s.posture) ? s.posture : [],
    spanish: {
      progress: s.spanish?.progress ?? {},
      extraCards: s.spanish?.extraCards ?? [],
      recent: s.spanish?.recent ?? []
    },
    claude: { ...base.claude, ...(s.claude ?? {}) }
  };
}

/** Sessions before the plan starts pushing the weights. */
export const CALIBRATION_SESSIONS = 8;
