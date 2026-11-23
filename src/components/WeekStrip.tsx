import { finished, intensityOn, scheduleTarget, trainedDates, weekSlots } from '../lib/planner';
import type { AppState } from '../lib/types';
import { addDays, isoDate, sameDay, weekStart, weekdayIndex } from '../lib/util';
import { IconCheck } from './Icons';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * This week at a glance: done days, the next workout, what's left (A/B, heavy/light), rest days.
 * Remaining workouts fill the remaining training days in order, so a missed day just shifts them.
 */
export default function WeekStrip({ state, now = new Date() }: { state: AppState; now?: Date }) {
  const ws = weekStart(now);
  const today = weekdayIndex(now);
  const slots = weekSlots(state.settings.trainingDays);
  const trainingDays = slots.map((s) => s.weekday);
  const sessions = finished(state).filter((x) => new Date(x.finishedAt!) >= ws && new Date(x.finishedAt!) < addDays(ws, 7));
  const regular = sessions.filter((x) => !x.bonus).length;
  const target = scheduleTarget(state, now);
  const thisWeekTarget = target.weekOf === isoDate(ws);

  // Assign the remaining workouts to the remaining training days.
  const upcoming = new Map<number, (typeof slots)[number]>();
  if (thisWeekTarget) {
    const first = trainingDays.indexOf(weekdayIndex(new Date(`${target.date}T12:00`)));
    // Assume he trains each remaining day, so a third day in a row shows as light.
    const trained = trainedDates(state);
    let k = target.slot;
    for (let i = first; i >= 0 && i < trainingDays.length && k < slots.length; i++, k++) {
      const date = addDays(ws, trainingDays[i]);
      upcoming.set(trainingDays[i], { ...slots[k], intensity: intensityOn(date, trained) });
      trained.add(isoDate(date));
    }
  }

  return (
    <div className="week" role="list" aria-label={`This week: ${regular} of ${slots.length} workouts done`}>
      {LETTERS.map((letter, d) => {
        const day = addDays(ws, d);
        const done = sessions.find((x) => sameDay(new Date(x.finishedAt!), day));
        const plan = upcoming.get(d);
        const isNext = thisWeekTarget && target.date === isoDate(day);
        const isRest = !trainingDays.includes(d);
        const past = d < today;
        let cls = 'wk-day';
        let body: JSX.Element | string = '';
        let desc = '';
        if (done) {
          cls += ' wk-done';
          body = <IconCheck size={14} />;
          desc = `done${done.bonus ? ' (bonus)' : ''}: ${done.title}`;
        } else if (plan) {
          cls += isNext ? ' wk-next' : ' wk-planned';
          body = `${plan.dayType}${plan.intensity === 'light' ? '·L' : ''}`;
          desc = `${isNext ? 'next: ' : 'planned: '}Upper ${plan.dayType}, ${plan.intensity}`;
        } else if (isRest) {
          cls += ' wk-rest';
          body = '–';
          desc = 'rest day';
        } else {
          cls += past ? ' wk-missed' : ' wk-rest';
          body = '–';
          desc = past ? 'missed' : 'nothing left this week';
        }
        if (d === today) cls += ' wk-today';
        return (
          <div key={d} className={cls} role="listitem" aria-label={`${FULL[d]}${d === today ? ' (today)' : ''}: ${desc}`}>
            <span className="wk-letter">{letter}</span>
            <span className="wk-mark">{body}</span>
          </div>
        );
      })}
    </div>
  );
}
