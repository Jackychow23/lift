import { useState } from 'react';
import type { Nav } from '../App';
import { IconBack } from '../components/Icons';
import { useNow } from '../lib/hooks';
import { useStore } from '../lib/store';
import type { WallTest } from '../lib/types';

export default function Posture({ nav }: { nav: Nav }) {
  const { update } = useStore();
  const [startAt, setStartAt] = useState<number | null>(null);
  const [secs, setSecs] = useState<number | null>(null);
  const [wall, setWall] = useState<WallTest | null>(null);
  const now = useNow(200);
  const running = startAt !== null;
  const live = running ? (now - startAt!) / 1000 : secs ?? 0;

  const save = () => {
    update((s) => ({ ...s, posture: [...s.posture, { date: new Date().toISOString(), neckHoldSeconds: secs, wallTest: wall }] }));
    nav.back();
  };

  const opt = (v: WallTest, label: string) => (
    <button type="button" className={`opt${wall === v ? ' right' : ''}`} aria-pressed={wall === v} onClick={() => setWall(v)}>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <header className="topbar" style={{ justifyContent: 'flex-start', gap: 4 }}>
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => nav.back()}><IconBack /></button>
        <h1 className="h2" style={{ fontFamily: 'var(--display)', fontSize: 22 }}>Posture check</h1>
      </header>
      <div className="screen" style={{ paddingTop: 8 }}>
        <section className="card stack">
          <p className="label">1 · Neck hold</p>
          <p className="body">
            Lie on your back, knees bent. Tuck your chin, then lift your head about an inch off the floor, keeping the tuck. Hold as long as
            you can. Stop when your chin pokes up or your head drops.
          </p>
          <span className="clock" style={{ fontSize: 52 }}>{live.toFixed(0)} s</span>
          <div className="row">
            {!running ? (
              <button type="button" className="btn primary grow" onClick={() => { setSecs(null); setStartAt(Date.now()); }}>
                {secs === null ? 'Start' : 'Redo'}
              </button>
            ) : (
              <button type="button" className="btn primary grow" onClick={() => { setSecs(Math.round((Date.now() - startAt!) / 1000)); setStartAt(null); }}>
                Stop
              </button>
            )}
          </div>
          <p className="small" style={{ margin: 0 }}>For reference, healthy men averaged about 39 seconds in one study. Your own trend matters more.</p>
        </section>

        <section className="card stack">
          <p className="label">2 · Wall test</p>
          <p className="body">
            Stand with heels, butt and upper back against a wall, eyes level. Can the back of your head touch the wall without tilting your chin up?
          </p>
          {opt('easy', 'Yes, easily')}
          {opt('effort', 'Yes, with effort')}
          {opt('not_yet', 'Not yet')}
        </section>

        <button type="button" className="btn primary big" disabled={secs === null && wall === null} onClick={save}>Save check</button>
      </div>
    </>
  );
}
