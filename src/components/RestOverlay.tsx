import { useEffect, useRef } from 'react';
import { restDone } from '../lib/device';
import { useNow } from '../lib/hooks';
import { fmtClock } from '../lib/util';
import Flashcard from './Flashcard';

interface Props {
  endsAt: number;
  total: number;
  nextLabel: string | null;
  sound: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onClose: () => void;
}

export default function RestOverlay({ endsAt, total, nextLabel, sound, onAdjust, onClose }: Props) {
  const now = useNow(250);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const fired = useRef(false);
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
        </div>
        <Flashcard />
      </div>
    </div>
  );
}
