import type { Nav } from '../App';
import { IconCheck } from '../components/Icons';
import WeekStrip from '../components/WeekStrip';
import { useOnline } from '../lib/hooks';
import { setCounts, weekInfo } from '../lib/planner';
import { highlights } from '../lib/progress';
import { useStore } from '../lib/store';
import { fmtClock } from '../lib/util';

export default function Done({ nav, sessionId }: { nav: Nav; sessionId: string }) {
  const { state, coachBusy, refreshPlan } = useStore();
  const online = useOnline();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const counts = setCounts(session);
  const mins = (new Date(session.finishedAt!).getTime() - new Date(session.startedAt).getTime()) / 1000;
  const hl = highlights(session);
  const wk = weekInfo(state);
  const plan = state.plan;

  let status: { tone: string; head: string; body: string };
  if (session.bonus) status = { tone: 'var(--good)', head: 'Bonus logged', body: `Your regular plan (${plan?.title ?? 'next workout'}) is still waiting.` };
  else if (coachBusy) status = { tone: 'var(--info)', head: 'Claude is writing your next workout…', body: 'You can close the app; it saves either way.' };
  else if (plan?.source === 'claude') status = { tone: 'var(--good)', head: `Next plan ready · ${plan.title}`, body: "Written from today's sets. It'll be waiting when you open the app." };
  else if (!state.settings.apiKey) status = { tone: 'var(--accent)', head: `Next up: ${plan?.title ?? ''}`, body: 'Built-in plan is ready. Add a Claude API key in Settings for written plans.' };
  else if (!online) status = { tone: 'var(--accent)', head: `No signal · next up: ${plan?.title ?? ''}`, body: 'Claude writes the plan the next time you open the app with signal. A built-in plan is ready if you\'re still offline.' };
  else status = { tone: 'var(--accent)', head: `Next up: ${plan?.title ?? ''}`, body: `Couldn't reach Claude${state.claude.lastError ? ` (${state.claude.lastError})` : ''}. Built-in plan is ready; it'll retry.` };


  return (
    <div className="screen" style={{ paddingTop: 'calc(32px + env(safe-area-inset-top))' }}>
      <div className="stack" style={{ gap: 10 }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--good)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCheck size={28} />
        </span>
        <h1 className="h1" style={{ fontSize: 36 }}>Workout done</h1>
        <p className="sub num" style={{ fontSize: 16 }}>{session.title} · {fmtClock(mins)} · {counts.done} sets</p>
      </div>

      {hl.length > 0 && (
        <div className="list" aria-label="Highlights">
          {hl.map((h) => (
            <div key={h} className="list-row"><span style={{ fontSize: 15 }}>{h}</span></div>
          ))}
        </div>
      )}

      <section className="card outline stack" aria-label="Next workout" aria-live="polite">
        <div className="row">
          <span className="dot" style={{ background: status.tone }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{status.head}</span>
        </div>
        <p className="body" style={{ color: 'var(--text-2)', fontSize: 14 }}>{status.body}</p>
        {!coachBusy && !session.bonus && state.settings.apiKey && online && plan?.source !== 'claude' && (
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => void refreshPlan()}>Try again now</button>
        )}
      </section>

      <section className="stack" aria-label="This week">
        <h2 className="label">This week · {wk.regularCount} of {wk.planned}</h2>
        <WeekStrip state={state} />
        <span className="small" style={{ lineHeight: 1.45 }}>
          {wk.bonusDone
            ? 'Bonus done this week.'
            : wk.bonusAvailable
              ? `Optional bonus unlocked: repeats ${wk.weakest?.title}, your weakest day this week.`
              : `An optional bonus day unlocks after all ${wk.planned} workouts. It repeats whichever day went worst.`}
        </span>
      </section>

      <button type="button" className="btn primary big" style={{ marginTop: 'auto' }} onClick={() => nav.replace({ name: 'today' })}>
        Back to today
      </button>
    </div>
  );
}
