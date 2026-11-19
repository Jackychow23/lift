import { useState } from 'react';
import { answer, markStory, nextQuestion, nextStory, stats, type Question } from '../lib/srs';
import { useStore } from '../lib/store';
import type { SpanishState, Story } from '../lib/types';

// Remembered across rest periods within a session.
let lastCardId: string | undefined;
let cardsSinceStory = 0;

type Item = { kind: 'card'; q: Question } | { kind: 'story'; story: Story };

function pickItem(sp: SpanishState): Item | null {
  const story = cardsSinceStory >= 3 ? nextStory(sp) : null;
  if (story) return { kind: 'story', story };
  const q = nextQuestion(sp, Date.now(), lastCardId);
  return q ? { kind: 'card', q } : null;
}

export default function Flashcard() {
  const { state, update } = useStore();
  const [item, setItem] = useState<Item | null>(() => pickItem(state.spanish));
  const [picked, setPicked] = useState<number | null>(null);
  const [hinted, setHinted] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const st = stats(state.spanish);

  if (!item) return null;
  const answered = picked !== null;

  const next = () => {
    setPicked(null);
    setHinted(false);
    setShowEn(false);
    setItem(pickItem(state.spanish));
  };

  const header = (label: string) => (
    <div className="between">
      <span className="label" style={{ color: 'var(--info)' }}>{label}</span>
      <span className="small">{st.learning} learning · {st.due} due</span>
    </div>
  );

  const options = (opts: string[], right: number, lang: 'es' | 'en', onPick: (i: number) => void) => (
    <div className="stack">
      {opts.map((o, i) => {
        const cls = answered && i === right ? 'opt right' : answered && i === picked ? 'opt wrong' : 'opt';
        return (
          <button key={i} type="button" className={cls} onClick={() => !answered && onPick(i)} lang={lang} aria-disabled={answered}>
            <span>{o}</span>
            {answered && i === right && <span className="tag">Correct</span>}
            {answered && i === picked && i !== right && <span className="tag">Your pick</span>}
          </button>
        );
      })}
    </div>
  );

  const nextBtn = (
    <button type="button" className="btn" style={{ alignSelf: 'flex-start', borderColor: 'var(--info)', color: 'var(--info)', background: 'none' }} onClick={next}>
      Next card
    </button>
  );

  if (item.kind === 'story') {
    const s = item.story;
    const pick = (i: number) => {
      setPicked(i);
      cardsSinceStory = 0;
      update((cur) => ({ ...cur, spanish: markStory(cur.spanish, s.id, i === s.answerIndex) }));
    };
    return (
      <section className="flash" aria-label="Spanish mini-story">
        {header('Mini-story')}
        <p className="body" lang="es" style={{ fontSize: 19, lineHeight: 1.5 }}>{s.es}</p>
        {s.gloss.length > 0 && (
          <p className="small" style={{ margin: 0 }}>
            New: {s.gloss.map((g) => `${g.es} = ${g.en}`).join(' · ')}
          </p>
        )}
        {(showEn || answered) ? (
          <p className="body" style={{ fontSize: 14, color: 'var(--text-2)' }}>{s.en}</p>
        ) : (
          <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEn(true)}>Show English</button>
        )}
        <p className="sub">{s.question}</p>
        {options(s.options, s.answerIndex, 'en', pick)}
        {answered && nextBtn}
      </section>
    );
  }

  const q = item.q;
  const pick = (i: number) => {
    setPicked(i);
    lastCardId = q.card.id;
    cardsSinceStory += 1;
    update((cur) => ({ ...cur, spanish: answer(cur.spanish, q.card.id, i === q.answerIndex, Date.now(), hinted) }));
  };

  return (
    <section className="flash" aria-label="Spanish flashcard">
      {header(`Español · Level ${st.level}`)}
      <p className="prompt" lang={q.promptLang}>
        {q.highlight ? (
          <>
            {q.highlight[0]}
            {q.mode === 'cloze' && !answered ? <span className="blank" aria-label="blank">_____</span> : <mark>{q.highlight[1]}</mark>}
            {q.highlight[2]}
          </>
        ) : (
          q.prompt
        )}
      </p>
      {q.support && <p className="small" style={{ margin: 0, fontSize: 14 }}>{q.support}</p>}
      <p className="sub">{q.question}</p>
      {options(q.options, q.answerIndex, q.optionsLang, pick)}
      {!answered && q.card.hook && !hinted && (
        <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setHinted(true)}>Hint</button>
      )}
      {!answered && hinted && <p className="small" style={{ margin: 0, color: 'var(--accent-soft-ink)' }}>Hint: {q.card.hook}</p>}
      {answered && (
        <div className="stack">
          <p className="body" style={{ color: 'var(--text-2)', fontSize: 14 }}>{q.explain}</p>
          {nextBtn}
        </div>
      )}
    </section>
  );
}
