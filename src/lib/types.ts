export type Pattern =
  | 'h_push' // bench-style pressing
  | 'v_push' // overhead pressing
  | 'h_pull' // rows
  | 'v_pull' // pulldowns
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'posture' // neck + upper back + rear shoulder work
  | 'hinge'; // hip hinge (legs) — only used when legs are switched on

/** dumbbell = weight per hand; cable = cable machine stack; machine = pulldown/row machine stack; bodyweight = reps only */
export type Load = 'dumbbell' | 'cable' | 'machine' | 'bodyweight';

export type EquipmentKey =
  | 'flat_bench'
  | 'adjustable_bench'
  | 'rope'
  | 'lat_bar'
  | 'v_bar'
  | 'd_handle'
  | 'straight_bar'
  | 'pulldown_row';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  load: Load;
  needs: EquipmentKey[];
  repRange: [number, number];
  /** Conservative first-time weight in lb (per hand for dumbbells). */
  start: number;
  /** Seconds to hold each rep (chin tucks). */
  holdSeconds?: number;
  legs?: boolean;
  /** Done lying or kneeling on the floor — left out unless floor work is switched on. */
  floor?: boolean;
  /** One arm at a time: a set covers both sides, so it takes about twice as long. */
  unilateral?: boolean;
  images: string[];
  steps: string[];
  feel: { main: string[]; also: string[] };
  notFeel: { where: string; fix: string }[];
}

export interface PlanItem {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  holdSeconds?: number;
  note?: string;
}

export type BlockKind = 'pair' | 'single' | 'finisher';

export interface PlanBlock {
  label: string;
  kind: BlockKind;
  restSeconds: number;
  items: PlanItem[];
}

export type DayType = 'A' | 'B';

/** Heavy = first or second day after a rest day; light = third+ day in a row. */
export type Intensity = 'heavy' | 'light';

export interface Plan {
  id: string;
  createdAt: string;
  source: 'claude' | 'builtin';
  dayType: DayType;
  bonus?: boolean;
  intensity?: Intensity;
  /** Which week (its Monday, YYYY-MM-DD) and which workout of that week this plan is for. */
  weekOf?: string;
  slot?: number;
  /** The day it's planned for (YYYY-MM-DD). */
  plannedDate?: string;
  title: string;
  focus: string;
  note: string;
  /** No longer used: he warms up with lighter sets of the first exercise. Kept so old saves still load. */
  warmup?: string;
  blocks: PlanBlock[];
}

export interface SetLog {
  target: { weight: number; reps: number };
  weight: number;
  reps: number;
  done: boolean;
  doneAt?: string;
  /** Added during the workout beyond the plan. */
  extra?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  /** Set when the exercise was swapped for "cable machine taken", so it can be swapped back. */
  originalExerciseId?: string;
  blockIndex: number;
  holdSeconds?: number;
  note?: string;
  sets: SetLog[];
}

export interface Session {
  id: string;
  planId: string;
  planSource: Plan['source'];
  dayType: DayType;
  bonus?: boolean;
  intensity?: Intensity;
  title: string;
  startedAt: string;
  finishedAt?: string;
  blocks: { label: string; kind: BlockKind; restSeconds: number }[];
  exercises: ExerciseLog[];
  /** Running rest timer, kept so it survives leaving the app. */
  rest?: { endsAt: number; total: number; lastExerciseId?: string } | null;
  /** "Cable machine taken" is on for this workout. */
  cableBusy?: boolean;
}

export type WallTest = 'easy' | 'effort' | 'not_yet';

export interface PostureCheck {
  date: string;
  neckHoldSeconds: number | null;
  wallTest: WallTest | null;
}

export interface Settings {
  apiKey: string;
  model: string;
  dumbbells: number[];
  cableIncrement: number;
  cableMax: number;
  /** The Precor pulldown/seated row machine: 10 lb plates plus a 5 lb add-on lever. */
  machineIncrement: number;
  machineMax: number;
  equipment: Record<EquipmentKey, boolean>;
  includeLegs: boolean;
  /** Push-ups, floor press: off by default. */
  allowFloor: boolean;
  /** Time limit for a workout, including warm-up sets and rests. */
  sessionMinutes: number;
  /** Timed holds (chin tucks): run every rep automatically, or wait for a tap before each one. */
  holdMode: 'auto' | 'tap';
  /** Training days, 0 = Monday … 6 = Sunday. The rest are rest days. */
  trainingDays: number[];
  sound: boolean;
  /** Free text the coach reads every time — goals, injuries, likes, dislikes. */
  aboutMe: string;
  /** What the Spanish cards and stories should be about. Claude reads it when writing new ones. */
  spanishFocus: string;
  /** GitHub token (Issues: read and write on one repo) for sending notes. Stays on this phone. */
  githubToken: string;
  /** owner/repo the notes go to as issues. */
  githubRepo: string;
}

/** A note typed during a workout. Saved right away; sent as a GitHub issue once online. */
export interface Note {
  id: string;
  text: string;
  at: string;
  sessionId?: string;
  /** Where he was, e.g. "Upper B · Lat Pulldown, set 2". */
  where?: string;
  sentAt?: string;
  url?: string;
  /** Last problem sending it (bad token, etc.). Network trouble just waits. */
  error?: string;
}

export interface SpanishCard {
  id: string;
  /** Target word or phrase, as it should be learned (with article for nouns). */
  word: string;
  /** English meaning of the word. */
  en: string;
  /** Spanish sentence that uses the word. */
  es: string;
  /** English meaning of the sentence. */
  sentenceEn: string;
  level: number;
  cat: string;
  /** Memory hook for English speakers (a related English word or a vivid picture). */
  hook?: string;
}

/** Another sentence that uses a card's word, so it isn't always the same one. */
export interface Context {
  es: string;
  en: string;
}

/** A 2–3 sentence reading with one comprehension question. Written by Claude, stored for offline. */
export interface Story {
  id: string;
  es: string;
  en: string;
  question: string;
  options: string[];
  answerIndex: number;
  gloss: Context[];
  createdAt: string;
  seenAt?: string;
  correct?: boolean;
}

export interface CardProgress {
  box: number; // 0 = new, 1..7 Leitner boxes
  due: number; // epoch ms
  seen: number;
  correct: number;
  last: number;
}

export interface SpanishState {
  progress: Record<string, CardProgress>;
  /** Cards Claude wrote later, appended to the built-in deck. */
  extraCards: SpanishCard[];
  /** Most recent answers, true = correct (newest last, max 30). */
  recent: boolean[];
  /** Extra sentences per card id, written by Claude. */
  contexts: Record<string, Context[]>;
  stories: Story[];
}

export interface Assessment {
  date: string;
  text: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  plan: Plan | null;
  active: Session | null;
  sessions: Session[];
  posture: PostureCheck[];
  assessment: Assessment | null;
  spanish: SpanishState;
  claude: { lastError: string | null; lastSuccess: string | null };
  notes: Note[];
  /** Week (Monday's date) whose catch-up workout he turned down. */
  skipCatchUpWeek?: string;
}
