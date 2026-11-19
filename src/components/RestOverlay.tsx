import { useEffect, useRef, useState } from 'react';
import { EXERCISE_BY_ID } from '../data/exercises';
import { restDone } from '../lib/device';
import { useNow } from '../lib/hooks';
import { fmtClock } from '../lib/util';
import ExerciseNotes from './ExerciseNotes';
import Flashcard from './Flashcard';
import Sheet from './Sheet';

interface Props {
  endsAt: number;
  total: number;
  nextLabel: string | null;
  /** Exercise just logged, and the one coming up (for the form-notes buttons). */
  lastExerciseId: string | null;
  nextExerciseId: string | null;
  sound: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onClose: () => void;
}

export default function RestOverlay({ endsAt, total, nextLabel, lastExerciseId, nextExerciseId, sound, onAdjust, onClose }: Props) {
  const now = useNow(250);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const fired = useRef(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      restDone(sound);
    }
    if (left > 0) fired.current = false;
  }, [left, sound]);

  // Stop the workout list scrolling behind the timer.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0;
  const formButtons: { id: string; label: string }[] = [];
  if (nextExerciseId) formButtons.push({ id: nextExerciseId, label: lastExerciseId === nextExerciseId ? 'This one' : 'Next up' });
  if (lastExerciseId && lastExerciseId !== nextExerciseId) formButtons.push({ id: lastExerciseId, label: 'Just did' });

  return (
    <div className="rest" role="dialog" aria-modal="true" aria-label="Rest timer">
      <div className="rest-inner">
        <div className="stack">
          <div className="between">
            <span className="label" style={left === 0 ? { color: 'var(--accent)' } : undefined}>{left === 0 ? 'Rest done · time to lift' : 'Resting'}</span>
            <span className="small">of {fmtClock(total)}</span>
          </div>
          <span className="clock" aria-live="off">{fmtClock(left)}</span>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          <div className="row">
            <button type="button" className="btn grow" onClick={() => onAdjust(-15)}>−15 s</button>
            <button type="button" className="btn grow" onClick={() => onAdjust(15)}>+15 s</button>
            <button type="button" className="btn primary grow" style={{ flexGrow: 1.4 }} onClick={onClose}>
              {nextLabel ? 'Next set' : 'Back'}
            </button>
          </div>
          {nextLabel && (
            <div className="card row" style={{ padding: '12px 14px' }}>
              <span className="label">Up next</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{nextLabel}</span>
            </div>
          )}
          {formButtons.length > 0 && (
            <div className="stack">
              {formButtons.map((b) => (
                <button key={b.id} type="button" className="btn" style={{ justifyContent: 'space-between', width: '100%', fontWeight: 500 }} onClick={() => setNotesFor(b.id)}>
                  <span className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span className="small" style={{ color: 'var(--accent)', fontWeight: 700, flex: 'none', width: 64, textAlign: 'left' }}>{b.label}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{EXERCISE_BY_ID[b.id]?.name}</span>
                  </span>
                  <span className="small" style={{ flex: 'none' }}>Form notes</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Flashcard />
      </div>

      {notesFor && (
        <Sheet title={`${EXERCISE_BY_ID[notesFor]?.name ?? ''} · ${left > 0 ? fmtClock(left) + ' left' : 'rest done'}`} onClose={() => setNotesFor(null)}>
          <ExerciseNotes exerciseId={notesFor} />
          <button type="button" className="btn big" onClick={() => setNotesFor(null)}>Back to rest timer</button>
        </Sheet>
      )}
    </div>
  );
}
