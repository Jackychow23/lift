import { useEffect, useState } from 'react';
import type { Nav } from '../App';
import { IconBack, IconCheck, IconPlay, IconPlus, IconSwap } from '../components/Icons';
import NumInput from '../components/NumInput';
import RestOverlay from '../components/RestOverlay';
import Sheet from '../components/Sheet';
import { EXERCISE_BY_ID } from '../data/exercises';
import { keepScreenOn, primeAudio, rearmOnVisible } from '../lib/device';
import { useNow } from '../lib/hooks';
import { alternatives, finished, isCalibrating, lastLogFor, nextSet, nextTarget, setCounts } from '../lib/planner';
import { useStore } from '../lib/store';
import type { Session } from '../lib/types';
import { fmtClock } from '../lib/util';

export default function Workout({ nav }: { nav: Nav }) {
  const { state, update, finishWorkout, discardWorkout } = useStore();
  const session = state.active;
  const now = useNow(1000);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);

  useEffect(() => {
    void keepScreenOn(true);
    const off = rearmOnVisible(() => true);
    return () => {
      off();
      void keepScreenOn(false);
    };
  }, []);

  useEffect(() => {
    if (!session) nav.replace({ name: 'today' });
  }, [session, nav]);
  if (!session) return null;

  const edit = (fn: (s: Session) => void) =>
    update((st) => {
      if (!st.active) return st;
      const copy: Session = structuredClone(st.active);
      fn(copy);
      return { ...st, active: copy };
    });

  const pointer = nextSet(session);
  const counts = setCounts(session);
  const history = finished(state);

  const describe = (p: { ex: number; set: number } | null) => {
    if (!p) return null;
    const e = session.exercises[p.ex];
    const ex = EXERCISE_BY_ID[e.exerciseId];
    const s = e.sets[p.set];
    const load = ex?.load === 'bodyweight' ? `${s.reps} reps` : `${s.weight} × ${s.reps}`;
    return `${ex?.name ?? e.exerciseId} · set ${p.set + 1} · ${load}`;
  };

  const logSet = (ei: number, si: number) => {
    primeAudio();
    const block = session.blocks[session.exercises[ei].blockIndex];
    edit((s) => {
      const set = s.exercises[ei].sets[si];
      set.done = true;
      set.doneAt = new Date().toISOString();
      const remaining = nextSet(s);
      s.rest = remaining ? { endsAt: Date.now() + block.restSeconds * 1000, total: block.restSeconds } : null;
    });
    // Next set inherits a weight change he made on this one.
    edit((s) => {
      const log = s.exercises[ei];
      const set = log.sets[si];
      for (let k = si + 1; k < log.sets.length; k++) {
        const later = log.sets[k];
        if (!later.done && later.weight === later.target.weight && set.weight !== set.target.weight) later.weight = set.weight;
      }
    });
    if (!nextSet({ ...session, exercises: session.exercises.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, done: true } : x)) } : e)) }))
      setConfirm('finish');
  };

  const undoSet = (ei: number, si: number) => edit((s) => { s.exercises[ei].sets[si].done = false; });

  const addSet = (ei: number) =>
    edit((s) => {
      const sets = s.exercises[ei].sets;
      const last = sets[sets.length - 1];
      sets.push({ target: { ...last.target }, weight: last.weight, reps: last.reps, done: false, extra: true });
    });

  const swap = (ei: number, newId: string) => {
    const ex = EXERCISE_BY_ID[newId];
    const t = nextTarget(ex, history, state.settings, isCalibrating(state));
    edit((s) => {
      const log = s.exercises[ei];
      log.exerciseId = newId;
      log.holdSeconds = ex.holdSeconds;
      log.note = undefined;
      log.sets = log.sets.map(() => ({ target: { weight: t.weight, reps: t.reps }, weight: t.weight, reps: t.reps, done: false }));
    });
    setSwapFor(null);
  };

  const finish = () => {
    const id = finishWorkout();
    if (id) nav.replace({ name: 'done', sessionId: id });
    else nav.replace({ name: 'today' });
  };

  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const lastText = (exId: string, si: number) => {
    const log = lastLogFor(history, exId);
    const set = log?.sets.filter((x) => x.done)[si] ?? log?.sets.filter((x) => x.done).slice(-1)[0];
    if (!set) return '—';
    return set.weight > 0 ? `${set.weight} × ${set.reps}` : `${set.reps}`;
  };

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Back to today (workout stays open)" onClick={() => nav.back()}>
          <IconBack />
        </button>
        <div className="center">
          <span style={{ fontSize: 16, fontWeight: 600 }}>{session.title}</span>
          <span className="small num">{fmtClock(elapsed)} elapsed</span>
        </div>
        <button type="button" className="btn link" onClick={() => setConfirm('finish')}>
          Finish
        </button>
      </header>
      <div className="screen tight" style={{ paddingTop: 4 }}>
        <div className="stack" style={{ gap: 6, padding: '0 4px' }}>
          <div className="progress"><div style={{ width: `${counts.total ? (counts.done / counts.total) * 100 : 0}%` }} /></div>
          <span className="small">{counts.done} of {counts.total} sets</span>
        </div>

        {session.blocks.map((b, bi) => {
          const idx = session.exercises.map((e, i) => (e.blockIndex === bi ? i : -1)).filter((i) => i >= 0);
          if (!idx.length) return null;
          return (
            <div className="stack" key={bi} style={{ gap: 10 }}>
              <div className="between" style={{ padding: '0 4px' }}>
                <span className="label">{b.label}{b.kind === 'pair' && idx.length > 1 ? ' · alternate these' : ''}</span>
                <span className="small">{b.restSeconds} s rest</span>
              </div>
              {idx.map((ei, k) => {
                const log = session.exercises[ei];
                const ex = EXERCISE_BY_ID[log.exerciseId];
                const bw = ex?.load === 'bodyweight';
                const t = log.sets[0]?.target;
                const anyDone = log.sets.some((x) => x.done);
                const tag = b.kind === 'pair' && idx.length > 1 ? `${String.fromCharCode(65 + bi)}${k + 1} · ` : '';
                return (
                  <section className="ex-card" key={ei} aria-label={ex?.name}>
                    <div className="ex-head">
                      <div className="stack" style={{ gap: 2 }}>
                        <h2 className="h2">{tag}{ex?.name ?? log.exerciseId}</h2>
                        <span className="small">
                          Target {log.sets.filter((x) => !x.extra).length} × {t?.reps}
                          {log.holdSeconds ? ` · ${log.holdSeconds} s hold` : ''}
                          {!bw && t ? ` · ${t.weight} lb${ex?.load === 'dumbbell' ? ' each hand' : ''}` : ''}
                        </span>
                        {log.note && <span className="note-line">{log.note}</span>}
                      </div>
                      <div className="ex-actions">
                        {!anyDone && (
                          <button type="button" className="icon-btn" aria-label={`Swap ${ex?.name}`} onClick={() => setSwapFor(ei)} style={{ color: 'var(--muted)' }}>
                            <IconSwap />
                          </button>
                        )}
                        <button type="button" className="btn link" onClick={() => nav.go({ name: 'demo', exerciseId: log.exerciseId })}>
                          <IconPlay /> How-to
                        </button>
                      </div>
                    </div>
                    <div className="set-grid head">
                      <span>Set</span><span>Last</span><span>{bw ? '' : 'lb'}</span><span>Reps</span><span />
                    </div>
                    {log.sets.map((set, si) => {
                      const isNext = pointer?.ex === ei && pointer.set === si;
                      return (
                        <div key={si} className={`set-grid set-row${isNext ? ' current' : ''}`}>
                          <span className={set.done ? 'faint' : ''}>{si + 1}</span>
                          <span className="faint" style={{ fontSize: 14 }}>{lastText(log.exerciseId, si)}</span>
                          {set.done ? (
                            <>
                              <span>{bw ? '' : set.weight}</span>
                              <span>{set.reps}</span>
                              <button type="button" className="check done" aria-label={`Set ${si + 1} logged. Tap to undo`} onClick={() => undoSet(ei, si)}>
                                <IconCheck />
                              </button>
                            </>
                          ) : (
                            <>
                              {bw ? <span /> : (
                                <NumInput decimal label={`${ex?.name} set ${si + 1} weight in pounds`} value={set.weight} onChange={(n) => edit((s) => { s.exercises[ei].sets[si].weight = n; })} />
                              )}
                              <NumInput label={`${ex?.name} set ${si + 1} reps`} value={set.reps} onChange={(n) => edit((s) => { s.exercises[ei].sets[si].reps = n; })} />
                              <button type="button" className={`check${isNext ? ' next' : ''}`} aria-label={`Log ${ex?.name} set ${si + 1}`} onClick={() => logSet(ei, si)}>
                                <IconCheck />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => addSet(ei)}>
                      <IconPlus /> Add set
                    </button>
                  </section>
                );
              })}
            </div>
          );
        })}
        <p className="small" style={{ margin: '4px 4px 0', lineHeight: 1.5 }}>
          Numbers start at today's target. Did more or fewer? Change them, then tap the check. Extra sets are fine.
        </p>
        <button type="button" className="btn big" onClick={() => setConfirm('finish')}>Finish workout</button>
      </div>

      {session.rest && session.rest.endsAt > now - 10 * 60_000 && (
        <RestOverlay
          endsAt={session.rest.endsAt}
          total={session.rest.total}
          nextLabel={describe(pointer)}
          sound={state.settings.sound}
          onAdjust={(d) => edit((s) => { if (s.rest) { s.rest.endsAt += d * 1000; s.rest.total = Math.max(0, s.rest.total + d); } })}
          onClose={() => edit((s) => { s.rest = null; })}
        />
      )}

      {swapFor !== null && (
        <Sheet title="Swap exercise" onClose={() => setSwapFor(null)}>
          <p className="small" style={{ margin: 0 }}>Station busy or something feels off? Pick a stand-in that works the same muscles.</p>
          {alternatives(session.exercises[swapFor].exerciseId, state.settings, session.exercises.map((e) => e.exerciseId)).map((alt) => (
            <button key={alt.id} type="button" className="sheet-item" onClick={() => swap(swapFor, alt.id)}>
              <span style={{ fontWeight: 600 }}>{alt.name}</span>
              <span className="small">{alt.feel.main.join(', ')}</span>
            </button>
          ))}
        </Sheet>
      )}

      {confirm === 'finish' && (
        <Sheet title={pointer ? 'Finish workout?' : 'All sets done'} onClose={() => setConfirm(null)}>
          <p className="body">
            {pointer
              ? `${counts.total - counts.done} set${counts.total - counts.done === 1 ? '' : 's'} not logged. That's fine; the plan adjusts.`
              : 'Nice work. Save it and get the next plan.'}
          </p>
          <button type="button" className="btn primary big" onClick={finish}>Save workout</button>
          {pointer && <button type="button" className="btn" onClick={() => setConfirm(null)}>Keep going</button>}
          <button type="button" className="btn ghost" onClick={() => setConfirm('discard')}>Discard this workout</button>
        </Sheet>
      )}
      {confirm === 'discard' && (
        <Sheet title="Discard workout?" onClose={() => setConfirm(null)}>
          <p className="body">Nothing from this session will be saved. Today's plan stays.</p>
          <button type="button" className="btn danger" onClick={() => { discardWorkout(); nav.replace({ name: 'today' }); }}>Discard</button>
          <button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button>
        </Sheet>
      )}
    </>
  );
}
