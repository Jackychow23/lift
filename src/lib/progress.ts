import { EXERCISE_BY_ID } from '../data/exercises';
import { finished } from './planner';
import type { AppState, Session } from './types';
import { e1rm } from './util';

export interface Best { exerciseId: string; weight: number; reps: number; score: number; date: string }

function bestIn(session: Session, exId: string): Best | null {
  let best: Best | null = null;
  for (const ex of session.exercises) {
    if (ex.exerciseId !== exId) continue;
    for (const s of ex.sets) {
      if (!s.done) continue;
      const score = s.weight > 0 ? e1rm(s.weight, s.reps) : s.reps;
      if (!best || score > best.score) best = { exerciseId: exId, weight: s.weight, reps: s.reps, score, date: session.finishedAt ?? session.startedAt };
    }
  }
  return best;
}

/** Per exercise: best set in the last 28 days and the first time it was logged. */
export function exerciseProgress(s: AppState, now = Date.now()) {
  const sessions = finished(s);
  const ids = [...new Set(sessions.flatMap((x) => x.exercises.filter((e) => e.sets.some((z) => z.done)).map((e) => e.exerciseId)))];
  return ids
    .map((id) => {
      const all = sessions.map((x) => bestIn(x, id)).filter((b): b is Best => !!b);
      const first = all[0];
      const recent = all.filter((b) => now - new Date(b.date).getTime() <= 28 * 86_400_000);
      const best = (recent.length ? recent : all.slice(-1)).reduce((a, b) => (b.score > a.score ? b : a));
      const changePct = first && first.score > 0 ? ((best.score - first.score) / first.score) * 100 : 0;
      return { id, name: EXERCISE_BY_ID[id]?.name ?? id, pattern: EXERCISE_BY_ID[id]?.pattern, first, best, changePct, times: all.length };
    })
    .sort((a, b) => b.times - a.times);
}

/** Average strength change since the start for pressing vs pulling. */
export function pushPullBalance(s: AppState) {
  const rows = exerciseProgress(s).filter((r) => r.times >= 2 && EXERCISE_BY_ID[r.id]?.load !== 'bodyweight');
  const avg = (pats: string[]) => {
    const xs = rows.filter((r) => r.pattern && pats.includes(r.pattern)).map((r) => r.changePct);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  return { push: avg(['h_push', 'v_push']), pull: avg(['h_pull', 'v_pull']) };
}

/** Plain-language highlights for the workout-done screen. */
export function highlights(session: Session): string[] {
  const out: { text: string; rank: number }[] = [];
  for (const ex of session.exercises) {
    const name = EXERCISE_BY_ID[ex.exerciseId]?.name ?? ex.exerciseId;
    const done = ex.sets.filter((x) => x.done);
    if (!done.length) continue;
    const t = ex.sets[0].target;
    const extraSets = done.filter((x) => x.extra).length;
    const heavier = done.filter((x) => x.weight > t.weight);
    const lighter = done.filter((x) => x.weight < t.weight);
    const beat = done.filter((x) => x.weight >= t.weight && x.reps > t.reps);
    const top = done.reduce((a, b) => ((b.weight > 0 ? e1rm(b.weight, b.reps) : b.reps) > (a.weight > 0 ? e1rm(a.weight, a.reps) : a.reps) ? b : a));
    const label = top.weight > 0 ? `${top.weight} × ${top.reps}` : `${top.reps} reps`;
    if (heavier.length) out.push({ text: `${name} · went heavier (${label}). Next plan starts from there.`, rank: 3 });
    else if (beat.length) out.push({ text: `${name} · ${label}, beat the target on ${beat.length} set${beat.length > 1 ? 's' : ''}.`, rank: 2 });
    else if (lighter.length) out.push({ text: `${name} · dropped to ${lighter[0].weight}. Next plan adjusts.`, rank: 1 });
    if (extraSets > 0) out.push({ text: `${name} · added ${extraSets} extra set${extraSets > 1 ? 's' : ''}.`, rank: 1 });
  }
  return out.sort((a, b) => b.rank - a.rank).slice(0, 4).map((o) => o.text);
}
