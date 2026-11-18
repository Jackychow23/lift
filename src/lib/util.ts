export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

/** Estimated one-rep max (Epley). Used only to compare sets, never shown as a target. */
export const e1rm = (weight: number, reps: number) => (reps <= 0 ? 0 : weight * (1 + reps / 30));

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}

export const sameWeek = (a: Date, b: Date) => weekStart(a).getTime() === weekStart(b).getTime();

export const fmtClock = (secs: number) => {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Date(iso).toLocaleDateString(undefined, opts);

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
