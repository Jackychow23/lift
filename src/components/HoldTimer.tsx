import { useEffect, useRef, useState } from 'react';
import { cue, primeAudio } from '../lib/device';
import { useNow } from '../lib/hooks';

type Phase = 'ready' | 'getready' | 'hold' | 'relax' | 'wait' | 'done';

interface Props {
  name: string;
  setLabel: string;
  targetReps: number;
  holdSeconds: number;
  mode: 'auto' | 'tap';
  sound: boolean;
  onModeChange: (m: 'auto' | 'tap') => void;
  /** Called with the number of reps completed; the set gets logged and the rest timer starts. */
  onFinish: (reps: number) => void;
  onCancel: () => void;
}

const GET_READY = 3;
const RELAX = 3;

/**
 * Counts timed holds for you, so you don't have to count seconds and reps at once.
 * Auto: tap Start once; every rep runs hold → relax → hold on its own, with a buzz at each change.
 * Tap: tap the big button to start each hold.
 */
export default function HoldTimer({ name, setLabel, targetReps, holdSeconds, mode, sound, onModeChange, onFinish, onCancel }: Props) {
  const now = useNow(100);
  const [phase, setPhase] = useState<Phase>('ready');
  const [reps, setReps] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const finished = useRef(false);

  const start = (p: Phase, secs: number) => {
    setPhase(p);
    setEndsAt(Date.now() + secs * 1000);
  };

  // Advance through the phases when a timer runs out.
  useEffect(() => {
    if (pausedLeft !== null || !['getready', 'hold', 'relax'].includes(phase) || now < endsAt) return;
    if (phase === 'getready' || phase === 'relax') {
      cue('start', sound);
      start('hold', holdSeconds);
      return;
    }
    // end of a hold
    const done = reps + 1;
    setReps(done);
    cue('end', sound);
    if (done >= targetReps) setPhase('done');
    else if (mode === 'auto') start('relax', RELAX);
    else setPhase('wait');
  }, [now, phase, endsAt, pausedLeft, reps, targetReps, holdSeconds, mode, sound]);

  // Log the set a moment after the last rep. (Refs so a re-render can't cancel it.)
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const repsRef = useRef(reps);
  repsRef.current = reps;
  useEffect(() => {
    if (phase !== 'done' || finished.current) return;
    finished.current = true;
    const t = window.setTimeout(() => finishRef.current(repsRef.current), 900);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Keep the page from scrolling behind.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const left = pausedLeft !== null ? pausedLeft : Math.max(0, (endsAt - now) / 1000);
  const timed = ['getready', 'hold', 'relax'].includes(phase);

  const begin = () => {
    primeAudio();
    if (mode === 'auto') start('getready', GET_READY);
    else {
      cue('start', sound);
      start('hold', holdSeconds);
    }
  };
  const tapRep = () => {
    primeAudio();
    cue('start', sound);
    start('hold', holdSeconds);
  };
  const togglePause = () => {
    if (pausedLeft === null) setPausedLeft(Math.max(0, (endsAt - Date.now()) / 1000));
    else {
      setEndsAt(Date.now() + pausedLeft * 1000);
      setPausedLeft(null);
    }
  };

  const big =
    phase === 'ready' ? `${targetReps} × ${holdSeconds} s`
    : phase === 'done' ? 'Done'
    : phase === 'wait' ? 'Tap'
    : `${Math.ceil(left)}`;
  const label =
    phase === 'ready' ? 'Ready when you are'
    : phase === 'getready' ? 'Get ready'
    : phase === 'hold' ? 'Hold'
    : phase === 'relax' ? 'Relax'
    : phase === 'wait' ? 'Relax · tap for the next rep'
    : 'Set logged';
  const color = phase === 'hold' ? 'var(--accent)' : phase === 'done' ? 'var(--good-ink)' : 'var(--text)';
  const pct = timed ? Math.min(100, (left / (phase === 'hold' ? holdSeconds : phase === 'relax' ? RELAX : GET_READY)) * 100) : 0;

  return (
    <div className="rest" role="dialog" aria-modal="true" aria-label={`${name} hold timer`}>
      <div className="rest-inner">
        <div className="between">
          <div className="stack" style={{ gap: 2 }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{name}</span>
            <span className="small">{setLabel}</span>
          </div>
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        </div>

        <div className="stack" style={{ alignItems: 'center', gap: 6, padding: '12px 0' }}>
          <span className="label" style={{ color }} aria-live="polite">{label}</span>
          <span className="clock" style={{ fontSize: phase === 'ready' ? 48 : 96, color }}>{big}</span>
          <div className="progress" style={{ width: '100%' }}><div style={{ width: `${pct}%`, background: color }} /></div>
        </div>

        <div className="card stack" style={{ alignItems: 'center', gap: 4 }}>
          <span className="label">Reps done</span>
          <span className="clock" style={{ fontSize: 56 }} aria-live="polite">{reps} <span className="muted" style={{ fontSize: 28 }}>of {targetReps}</span></span>
          {phase !== 'done' && phase !== 'ready' && (
            <div className="row">
              <button type="button" className="btn" aria-label="One rep fewer" onClick={() => setReps((r) => Math.max(0, r - 1))}>−1</button>
              <button type="button" className="btn" aria-label="One rep more" onClick={() => setReps((r) => Math.min(targetReps + 10, r + 1))}>+1</button>
            </div>
          )}
        </div>

        {phase === 'ready' && (
          <>
            <button type="button" className="btn primary big" style={{ height: 88, fontSize: 22 }} onClick={begin}>Start</button>
            <div className="row" role="radiogroup" aria-label="How reps start">
              <button type="button" role="radio" aria-checked={mode === 'auto'} className={`btn grow${mode === 'auto' ? ' outline-accent' : ''}`} onClick={() => onModeChange('auto')}>
                Automatic
              </button>
              <button type="button" role="radio" aria-checked={mode === 'tap'} className={`btn grow${mode === 'tap' ? ' outline-accent' : ''}`} onClick={() => onModeChange('tap')}>
                Tap each rep
              </button>
            </div>
            <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
              {mode === 'auto'
                ? `Tap Start once. After 3 seconds it buzzes once: hold for ${holdSeconds} s. Two buzzes: relax for ${RELAX} s. It keeps going until all ${targetReps} reps are done and counts them for you.`
                : `Tap the big button to start each ${holdSeconds}-second hold. One buzz to start, two when it's over. It counts the reps.`}
            </p>
            <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => onFinish(targetReps)}>
              Skip the timer and log {targetReps} reps
            </button>
          </>
        )}

        {phase === 'wait' && (
          <button type="button" className="btn primary big" style={{ height: 110, fontSize: 24 }} onClick={tapRep}>
            Start rep {reps + 1}
          </button>
        )}

        {timed && (
          <div className="row">
            <button type="button" className="btn grow" onClick={togglePause}>{pausedLeft === null ? 'Pause' : 'Resume'}</button>
            <button type="button" className="btn grow" onClick={() => onFinish(reps)} disabled={reps === 0}>Finish set ({reps})</button>
          </div>
        )}
        {phase === 'wait' && (
          <button type="button" className="btn" onClick={() => onFinish(reps)}>Finish set ({reps})</button>
        )}
      </div>
    </div>
  );
}
