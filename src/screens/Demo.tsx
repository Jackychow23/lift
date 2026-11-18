import { useEffect, useState } from 'react';
import type { Nav } from '../App';
import { IconBack } from '../components/Icons';
import { EXERCISE_BY_ID, PATTERN_LABEL } from '../data/exercises';

export default function Demo({ nav, exerciseId }: { nav: Nav; exerciseId: string }) {
  const ex = EXERCISE_BY_ID[exerciseId];
  const [frame, setFrame] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => setFrame((f) => (f + 1) % 2), 1300);
    return () => window.clearInterval(t);
  }, [auto]);

  if (!ex) return null;
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <header className="topbar" style={{ justifyContent: 'flex-start', gap: 4 }}>
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => nav.back()}>
          <IconBack />
        </button>
        <div className="stack" style={{ gap: 2 }}>
          <h1 className="h2" style={{ fontFamily: 'var(--display)', fontSize: 22 }}>{ex.name}</h1>
          <span className="small">{PATTERN_LABEL[ex.pattern]}{ex.load === 'dumbbell' ? ' · weight is per hand' : ''}</span>
        </div>
      </header>
      <div className="screen" style={{ paddingTop: 8 }}>
        <div className="stack">
          <button
            type="button"
            onClick={() => setAuto((a) => !a)}
            aria-label={auto ? 'Pause the flipping photos' : 'Resume the flipping photos'}
            style={{ padding: 0, border: 'none', background: 'none', position: 'relative' }}
          >
            {ex.images.map((src, i) => (
              <img
                key={src}
                className="photo"
                src={base + src}
                alt={`${ex.name}, position ${i + 1} of 2`}
                style={i === frame ? undefined : { position: 'absolute', inset: 0, opacity: 0 }}
              />
            ))}
          </button>
          <div className="between">
            <span style={{ fontSize: 14, fontWeight: 600 }}>Position {frame + 1} of 2</span>
            <span className="small">{auto ? 'Flipping · tap to pause' : 'Paused · tap to flip'}</span>
          </div>
          {!auto && (
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setFrame(0)} aria-pressed={frame === 0}>Position 1</button>
              <button type="button" className="btn grow" onClick={() => setFrame(1)} aria-pressed={frame === 1}>Position 2</button>
            </div>
          )}
        </div>

        <section className="stack" aria-label="How to do it">
          <h2 className="label">How to do it</h2>
          <ol className="steps">
            {ex.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {ex.holdSeconds && <p className="small" style={{ margin: 0 }}>Hold each rep for the seconds shown in your plan.</p>}
        </section>

        <section className="stack" aria-label="Where you should feel it">
          <h2 className="label">You should feel it in</h2>
          <div className="feel-chips">
            {ex.feel.main.map((m) => <span key={m} className="feel-chip main">{m}</span>)}
            {ex.feel.also.map((m) => <span key={m} className="feel-chip">{m}</span>)}
          </div>
        </section>

        <section className="stack" aria-label="Where you should not feel it">
          <h2 className="label" style={{ color: 'var(--bad-ink)' }}>Stop and fix if you feel it in</h2>
          <div className="list">
            {ex.notFeel.map((n) => (
              <div key={n.where} className="stack" style={{ gap: 3, padding: '12px 14px' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{n.where}</span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text-2)' }}>{n.fix}</span>
              </div>
            ))}
          </div>
        </section>
        <p className="small" style={{ margin: 0 }}>Photos: free-exercise-db (public domain).</p>
      </div>
    </>
  );
}
