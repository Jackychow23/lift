import { useEffect } from 'react';
import type { Nav } from '../App';
import PlanList from '../components/PlanList';
import WeekStrip from '../components/WeekStrip';
import { CALIBRATION_SESSIONS } from '../lib/defaults';
import { primeAudio } from '../lib/device';
import { useOnline } from '../lib/hooks';
import { buildBonusPlan, buildBuiltinPlan, catchUpTarget, estimateMinutes, isCalibrating, regularCount, setCounts, weekInfo, weekSlots } from '../lib/planner';
import { useStore } from '../lib/store';
import { DAY_NAMES, daysBetween, isoDate, weekdayIndex } from '../lib/util';

export default function Today({ nav }: { nav: Nav }) {
  const { state, update, coachBusy, startWorkout } = useStore();
  const online = useOnline();
  const plan = state.plan;
  const wk = weekInfo(state);
  const n = regularCount(state);
  const lastCheck = state.posture[state.posture.length - 1];
  const checkDue = !lastCheck || daysBetween(new Date(lastCheck.date), new Date()) >= 30;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const isTrainingDay = weekSlots(state.settings.trainingDays).some((x) => x.weekday === weekdayIndex(new Date()));
  const plannedToday = plan?.plannedDate === isoDate(new Date());
  const catchUp = !state.active && !wk.bonusAvailable ? catchUpTarget(state) : null;
  const plannedDay = plan?.plannedDate ? DAY_NAMES[weekdayIndex(new Date(`${plan.plannedDate}T12:00`))] : null;

  // After a reset or restore there may be no plan yet: make the built-in one.
  useEffect(() => {
    if (!state.plan && !state.active) update((s) => (s.plan || s.active ? s : { ...s, plan: buildBuiltinPlan(s) }));
  }, [state.plan, state.active, update]);

  const start = () => {
    primeAudio();
    const p = plan ?? buildBuiltinPlan(state);
    if (!plan) update((s) => ({ ...s, plan: p }));
    startWorkout(p);
    nav.go({ name: 'workout' });
  };

  const startCatchUp = () => {
    if (!catchUp) return;
    primeAudio();
    startWorkout(buildBuiltinPlan(state, catchUp));
    nav.go({ name: 'workout' });
  };

  const startBonus = () => {
    const p = buildBonusPlan(state);
    if (!p) return;
    primeAudio();
    startWorkout(p);
    nav.go({ name: 'workout' });
  };

  return (
    <div className="screen">
      <div className="between">
        <span className="small">{today}</span>
        <span className="row small">
          <span className="dot" style={{ background: online ? 'var(--good)' : 'var(--accent)' }} />
          {online ? 'Saved on phone' : 'Offline · saved on phone'}
        </span>
      </div>

      <WeekStrip state={state} />

      {state.active ? (
        <div className="card outline stack">
          <p className="label">Workout in progress</p>
          <span className="h2">{state.active.title}</span>
          <span className="small">
            {setCounts(state.active).done} of {setCounts(state.active).total} sets logged
          </span>
          <button type="button" className="btn primary big" onClick={() => nav.go({ name: 'workout' })}>
            Resume workout
          </button>
        </div>
      ) : plan ? (
        <>
          <div className="stack" style={{ gap: 6 }}>
            {!plannedToday && plannedDay && (
              <p className="label" style={{ color: 'var(--accent-soft-ink)' }}>
                {isTrainingDay ? 'Next workout' : 'Rest day today · next workout'}: {plannedDay}
              </p>
            )}
            <h1 className="h1">{plan.title}</h1>
            <p className="sub">
              {plan.intensity ? `${plan.intensity === 'light' ? 'Light' : 'Heavy'} day · ` : ''}
              {plan.focus ? `${plan.focus} · ` : ''}about {estimateMinutes(plan.blocks)} min
            </p>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {isCalibrating(state) && <span className="chip">Calibration · {n + 1} of {CALIBRATION_SESSIONS}</span>}
            {coachBusy ? (
              <span className="chip info">Claude is updating this plan…</span>
            ) : plan.source === 'claude' ? (
              <span className="chip good">Planned by Claude</span>
            ) : (
              <span className="chip info">Built-in plan</span>
            )}
          </div>
          {plan.note && (
            <div className="card stack" style={{ gap: 6 }}>
              <p className="label">Today's note</p>
              <p className="body">{plan.note}</p>
            </div>
          )}
          <PlanList plan={plan} onOpen={(id) => nav.go({ name: 'demo', exerciseId: id })} />
          <button type="button" className="btn primary big" onClick={start}>
            Start workout
          </button>
        </>
      ) : null}

      {catchUp && (
        <div className="card outline stack">
          <p className="label">Catch-up · optional</p>
          <p className="body">
            {wk.planned - wk.regularCount === 1 ? 'One workout' : `${wk.planned - wk.regularCount} workouts`} left from this week. Do{' '}
            <strong>
              Upper {catchUp.dayType} · {catchUp.intensity}
            </strong>{' '}
            now, or rest; Monday starts fresh either way.
          </p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn outline-accent" onClick={startCatchUp}>
              Start catch-up workout
            </button>
            <button type="button" className="btn ghost" onClick={() => update((s) => ({ ...s, skipCatchUpWeek: catchUp.weekOf }))}>
              Not this week
            </button>
          </div>
        </div>
      )}

      {!state.active && wk.bonusAvailable && wk.weakest && (
        <div className="card outline stack">
          <p className="label">Bonus day · optional</p>
          <p className="body">
            All {wk.planned} workouts done this week. Want another go at your weakest day, <strong>{wk.weakest.title}</strong>?
          </p>
          <button type="button" className="btn outline-accent" onClick={startBonus}>
            Start bonus workout
          </button>
        </div>
      )}

      {checkDue && !state.active && (
        <button type="button" className="banner" style={{ textAlign: 'left' }} onClick={() => nav.go({ name: 'posture' })}>
          <span className="dot" style={{ background: 'var(--info)', marginTop: 6 }} />
          <span>
            <strong style={{ color: 'var(--text)' }}>Monthly posture check · 3 min.</strong> Two quick tests to track your neck position over time.
          </span>
        </button>
      )}

      {!state.settings.apiKey ? (
        <div className="banner">
          <span className="dot" style={{ background: 'var(--accent)', marginTop: 6 }} />
          <span>Add your Claude API key in Settings to get plans written for you. The built-in plan works in the meantime.</span>
        </div>
      ) : state.claude.lastError && plan?.source !== 'claude' && online ? (
        <div className="banner">
          <span className="dot" style={{ background: 'var(--bad)', marginTop: 6 }} />
          <span>Couldn't get a plan from Claude: {state.claude.lastError} Using the built-in plan for now; Settings → Test connection checks it again.</span>
        </div>
      ) : null}
    </div>
  );
}
