import { useState } from 'react';
import { answer, nextQuestion, stats, type Question } from '../lib/srs';
import { useStore } from '../lib/store';

let lastCardId: string | undefined;

export default function Flashcard() {
  const { state, update } = useStore();
  const [q, setQ] = useState<Question | null>(() => nextQuestion(state.spanish, Date.now(), lastCardId));
  const [picked, setPicked] = useState<number | null>(null);
  const st = stats(state.spanish);

  if (!q) return null;
  const answered = picked !== null;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    lastCardId = q.card.id;
    update((s) => ({ ...s, spanish: answer(s.spanish, q.card.id, i === q.answerIndex) }));
  };

  const next = () => {
    setPicked(null);
    setQ(nextQuestion(state.spanish, Date.now(), lastCardId));
  };

  return (
    <section className="flash" aria-label="Spanish flashcard">
      <div className="between">
        <span className="label" style={{ color: 'var(--info)' }}>Español · Level {st.level}</span>
        <span className="small">
          {st.learning} learning · {st.due} due
        </span>
      </div>
      <p className="prompt" lang={q.promptLang}>
        {q.highlight ? (
          <>
            {q.highlight[0]}
            <mark>{q.highlight[1]}</mark>
            {q.highlight[2]}
          </>
        ) : (
          q.prompt
        )}
      </p>
      <p className="sub" lang={q.mode === 'word' ? undefined : undefined}>{q.question}</p>
      <div className="stack">
        {q.options.map((o, i) => {
          const cls = answered && i === q.answerIndex ? 'opt right' : answered && i === picked ? 'opt wrong' : 'opt';
          return (
            <button key={i} type="button" className={cls} onClick={() => pick(i)} lang={q.optionsLang} aria-disabled={answered}>
              <span>{o}</span>
              {answered && i === q.answerIndex && <span className="tag">Correct</span>}
              {answered && i === picked && i !== q.answerIndex && <span className="tag">Your pick</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="stack">
          <p className="body" style={{ color: 'var(--text-2)', fontSize: 14 }}>{q.explain}</p>
          <button type="button" className="btn" style={{ alignSelf: 'flex-start', borderColor: 'var(--info)', color: 'var(--info)', background: 'none' }} onClick={next}>
            Next card
          </button>
        </div>
      )}
    </section>
  );
}
