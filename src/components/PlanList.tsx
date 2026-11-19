import { EXERCISE_BY_ID } from '../data/exercises';
import type { Plan } from '../lib/types';
import { describeBlocks } from './blocks';

export function targetText(weight: number, reps: number, sets: number, exerciseId: string, hold?: number) {
  const ex = EXERCISE_BY_ID[exerciseId];
  const r = hold ? `${sets} × ${reps} · ${hold} s hold` : `${sets} × ${reps}`;
  if (!ex || ex.load === 'bodyweight') return r;
  return `${r} · ${weight} lb${ex.load === 'dumbbell' ? ' ea' : ''}`;
}

export default function PlanList({ plan, onOpen }: { plan: Plan; onOpen?: (exerciseId: string) => void }) {
  const views = describeBlocks(plan.blocks.map((b) => ({ kind: b.kind, ids: b.items.map((i) => i.exerciseId) })));
  return (
    <div className="stack-lg">
      {plan.blocks.map((b, bi) => {
        const v = views[bi];
        return (
          <div className="stack" key={bi}>
            <div className="between" style={{ alignItems: 'baseline' }}>
              <p className="label" style={{ whiteSpace: 'nowrap' }}>{v.title}</p>
              {v.how && <span className="small" style={{ textAlign: 'right' }}>{v.how}</span>}
            </div>
            <div className="list">
              {b.items.map((it, ii) => {
                const ex = EXERCISE_BY_ID[it.exerciseId];
                const inner = (
                  <>
                    <span className="name row" style={{ gap: 10 }}>
                      <span className="tag-pill">{v.tags[ii]}</span>
                      {ex?.name ?? it.exerciseId}
                    </span>
                    <span className="val">{targetText(it.weight, it.reps, it.sets, it.exerciseId, it.holdSeconds)}</span>
                  </>
                );
                return onOpen ? (
                  <button
                    key={ii}
                    type="button"
                    className="list-row"
                    style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', alignItems: 'center' }}
                    onClick={() => onOpen(it.exerciseId)}
                    aria-label={`${ex?.name}: how to`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="list-row" key={ii}>{inner}</div>
                );
              })}
            </div>
            {b.items.some((i) => i.note) && (
              <div className="stack" style={{ gap: 2 }}>
                {b.items.filter((i) => i.note).map((i, k) => (
                  <span key={k} className="note-line">{EXERCISE_BY_ID[i.exerciseId]?.name}: {i.note}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
