import type { Nav } from '../App';
import ExerciseNotes from '../components/ExerciseNotes';
import { IconBack } from '../components/Icons';
import { EXERCISE_BY_ID, PATTERN_LABEL } from '../data/exercises';

export default function Demo({ nav, exerciseId }: { nav: Nav; exerciseId: string }) {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return null;
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
        <ExerciseNotes exerciseId={exerciseId} />
        <p className="small" style={{ margin: 0 }}>Photos: free-exercise-db (public domain).</p>
      </div>
    </>
  );
}
