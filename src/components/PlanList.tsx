import { EXERCISE_BY_ID } from '../data/exercises';
import type { Plan } from '../lib/types';
import { GROUP_LABEL, describeBlocks, restText } from './blocks';

export function targetText(weight: number, reps: number, sets: number, exerciseId: string, hold?: number) {
  const ex = EXERCISE_BY_ID[exerciseId];
  const r = hold ? `${sets} × ${reps} · ${hold} s hold` : `${sets} × ${reps}`;
  if (!ex || ex.load === 'bodyweight') return r;
  return `${r} · ${weight} lb${ex.load === 'dumbbell' ? ' ea' : ''}`;
}

/** Today's plan: one numbered list, grouped by where you'll be (dumbbells, then the cable machine). */
export default function PlanList({ plan, onOpen }: { plan: Plan; onOpen?: (exerciseId: string) => void }) {
  const views = describeBlocks(plan.blocks.map((b) => ({ kind: b.kind, ids: b.items.map((i) => i.exerciseId) })));
  const groups: { label: string; rows: { tag: string; id: string; text: string; rest: number; note?: string }[]; how: string[] }[] = [];
  plan.blocks.forEach((b, bi) => {
    const v = views[bi];
    if (v.newGroup || !groups.length) groups.push({ label: GROUP_LABEL[v.station], rows: [], how: [] });
    const g = groups[groups.length - 1];
    if (v.how) g.how.push(v.how);
    b.items.forEach((it, ii) =>
      g.rows.push({ tag: v.tags[ii], id: it.exerciseId, text: targetText(it.weight, it.reps, it.sets, it.exerciseId, it.holdSeconds), rest: b.restSeconds, note: it.note })
    );
  });

  return (
    <div className="stack-lg">
      {groups.map((g, gi) => (
        <div className="stack" key={gi}>
          <p className="label">{g.label}</p>
          <div className="list">
            {g.rows.map((r) => {
              const ex = EXERCISE_BY_ID[r.id];
              const inner = (
                <>
                  <span className="row" style={{ gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                    <span className="tag-pill" style={{ marginTop: 1 }}>{r.tag}</span>
                    <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                      <span className="name">{ex?.name ?? r.id}</span>
                      <span className="small">{restText(r.rest)}</span>
                    </span>
                  </span>
                  <span className="val">{r.text}</span>
                </>
              );
              return onOpen ? (
                <button
                  key={r.tag}
                  type="button"
                  className="list-row"
                  style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', alignItems: 'center' }}
                  onClick={() => onOpen(r.id)}
                  aria-label={`${ex?.name}: how to`}
                >
                  {inner}
                </button>
              ) : (
                <div className="list-row" key={r.tag}>{inner}</div>
              );
            })}
          </div>
          {g.how.map((h, k) => <span key={k} className="small">{h}</span>)}
          {g.rows.filter((r) => r.note).map((r) => (
            <span key={r.tag} className="note-line">{EXERCISE_BY_ID[r.id]?.name}: {r.note}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
