import { useState } from 'react';
import type { Nav } from '../App';
import { EXERCISE_BY_ID } from '../data/exercises';
import { CALIBRATION_SESSIONS } from '../lib/defaults';
import { finished, isCalibrating, regularCount } from '../lib/planner';
import { exerciseProgress, pushPullBalance } from '../lib/progress';
import { useStore } from '../lib/store';
import { fmtDate } from '../lib/util';

const WALL = { easy: 'Easily', effort: 'With effort', not_yet: 'Not yet' } as const;

export default function Progress({ nav }: { nav: Nav }) {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const n = regularCount(state);
  const rows = exerciseProgress(state);
  const bal = pushPullBalance(state);
  const checks = state.posture;
  const last = checks[checks.length - 1];
  const prev = checks[checks.length - 2];
  const history = finished(state).slice().reverse().slice(0, 20);

  const pctText = (p: number | null) => (p === null ? '–' : `${p >= 0 ? '+' : ''}${Math.round(p)}%`);
  const maxAbs = Math.max(10, Math.abs(bal.push ?? 0), Math.abs(bal.pull ?? 0));

  return (
    <div className="screen">
      <h1 className="h1" style={{ fontSize: 34 }}>Progress</h1>

      {isCalibrating(state) ? (
        <section className="card stack">
          <div className="between">
            <span style={{ fontSize: 15, fontWeight: 600 }}>Calibration</span>
            <span className="small num">{n} of {CALIBRATION_SESSIONS} sessions</span>
          </div>
          <div className="progress"><div style={{ width: `${(n / CALIBRATION_SESSIONS) * 100}%` }} /></div>
          <p className="body" style={{ fontSize: 14, color: 'var(--text-2)' }}>
            The first {CALIBRATION_SESSIONS} workouts find your real working weights. After that, Claude writes a weak-points check here.
          </p>
        </section>
      ) : null}

      {state.assessment && (
        <section className="card outline stack">
          <div className="between">
            <span style={{ fontSize: 15, fontWeight: 600 }}>Weak points</span>
            <span className="small">{fmtDate(state.assessment.date)}</span>
          </div>
          <p className="body" style={{ fontSize: 14, color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{state.assessment.text}</p>
        </section>
      )}

      <section className="card stack" aria-label="Push and pull balance">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Pressing vs pulling · change since you started</span>
        {bal.push === null && bal.pull === null ? (
          <p className="body" style={{ fontSize: 14, color: 'var(--text-2)' }}>Shows up once a few lifts have been logged twice.</p>
        ) : (
          <>
            {([['Pressing', bal.push, '#D9DAD6'], ['Pulling', bal.pull, 'var(--info)']] as const).map(([label, v, color]) => (
              <div className="bars" key={label}>
                <div className="between small"><span style={{ color: 'var(--text-2)' }}>{label}</span><span className="num">{pctText(v)}</span></div>
                <div className="bar"><div style={{ width: `${v === null ? 0 : Math.max(2, (Math.abs(v) / maxAbs) * 100)}%`, background: color }} /></div>
              </div>
            ))}
            {bal.push !== null && bal.pull !== null && (
              <p className="body" style={{ fontSize: 14, color: 'var(--text-2)' }}>
                {Math.abs(bal.push - bal.pull) < 5
                  ? 'Moving at about the same rate.'
                  : bal.pull < bal.push
                    ? 'Pulling is lagging. For posture you want it at least even with pressing.'
                    : 'Pulling is ahead, which is what you want for posture.'}
              </p>
            )}
          </>
        )}
      </section>

      <section className="stack" aria-label="Best recent sets">
        <h2 className="label">Best recent set</h2>
        {rows.length === 0 ? (
          <p className="small" style={{ margin: 0 }}>Nothing logged yet.</p>
        ) : (
          <div className="list">
            {rows.map((r) => {
              const bw = EXERCISE_BY_ID[r.id]?.load === 'bodyweight';
              const delta = r.first && r.times > 1 ? (bw ? r.best.reps - r.first.reps : r.best.weight - r.first.weight) : null;
              return (
                <div key={r.id} className="list-row">
                  <span style={{ fontSize: 15 }}>{r.name}</span>
                  <span className="row" style={{ gap: 12 }}>
                    <span className="val">{bw ? `${r.best.reps} reps` : `${r.best.weight} × ${r.best.reps}`}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 52, textAlign: 'right', color: delta && delta > 0 ? 'var(--good-ink)' : 'var(--muted)' }}>
                      {delta === null ? 'new' : delta > 0 ? `+${delta}${bw ? '' : ' lb'}` : delta < 0 ? `${delta}${bw ? '' : ' lb'}` : 'same'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card outline stack" aria-label="Monthly posture check">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Monthly posture check</span>
        {last ? (
          <>
            <div className="between">
              <span className="small" style={{ color: 'var(--text-2)' }}>Neck hold</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{last.neckHoldSeconds ?? '–'} s</span>
            </div>
            <span className="small">
              {prev?.neckHoldSeconds != null ? `Last time ${prev.neckHoldSeconds} s · ` : ''}healthy men average about 39 s
            </span>
            <div className="between">
              <span className="small" style={{ color: 'var(--text-2)' }}>Wall test</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{last.wallTest ? WALL[last.wallTest] : '–'}</span>
            </div>
            <span className="small">Checked {fmtDate(last.date)}</span>
          </>
        ) : (
          <p className="body" style={{ fontSize: 14, color: 'var(--text-2)' }}>Two quick tests that show whether your neck position is improving.</p>
        )}
        <button type="button" className="btn outline-accent" onClick={() => nav.go({ name: 'posture' })}>
          {last ? "Do this month's check" : 'Do the first check'} · 3 min
        </button>
      </section>

      {history.length > 0 && (
        <section className="stack" aria-label="History">
          <h2 className="label">History</h2>
          <div className="list">
            {history.map((s) => {
              const isOpen = open === s.id;
              return (
                <div key={s.id}>
                  <button
                    type="button"
                    className="list-row"
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : s.id)}
                  >
                    <span style={{ fontSize: 15 }}>{s.title}{s.planSource === 'claude' ? '' : ''}</span>
                    <span className="small">{fmtDate(s.finishedAt!)}</span>
                  </button>
                  {isOpen && (
                    <div className="stack" style={{ padding: '0 14px 12px', gap: 4 }}>
                      {s.exercises.map((e, i) => (
                        <span key={i} className="small" style={{ color: 'var(--text-2)' }}>
                          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{EXERCISE_BY_ID[e.exerciseId]?.name ?? e.exerciseId}</strong>{' '}
                          {e.sets.filter((x) => x.done).map((x) => (x.weight > 0 ? `${x.weight}×${x.reps}` : `${x.reps}`)).join(', ') || 'skipped'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
