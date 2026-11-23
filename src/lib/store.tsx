import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { requestCards, requestContexts, requestPlan, requestStories } from './claude';
import { buildBuiltinPlan, estimateSeconds, fitToTime, planMatches, scheduleTarget, startSession, toStraightSets } from './planner';
import { allCards, contextsFor, stats } from './srs';
import { loadState, requestPersistence, saveState } from './storage';
import type { AppState, Plan } from './types';

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  coachBusy: boolean;
  /** Ask Claude for a plan. `force` replaces even a Claude plan that hasn't been started. */
  refreshPlan: (force?: boolean) => Promise<void>;
  startWorkout: (plan: Plan) => void;
  /** Saves the active workout. Returns its id, or null if nothing was logged (then it's discarded). */
  finishWorkout: () => string | null;
  discardWorkout: () => void;
  /** Re-target the plan to the schedule (after changing training days). */
  ensureSchedule: () => boolean;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

const AUTO_EVERY_MS = 10 * 60_000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const ref = useRef<AppState | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const busyRef = useRef(false);
  const [coachBusy, setCoachBusy] = useState(false);
  const lastAuto = useRef(0);
  const lastCards = useRef(0);

  const commit = useCallback((next: AppState) => {
    ref.current = next;
    setState(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveState(next), 250);
  }, []);

  const update = useCallback(
    (fn: (s: AppState) => AppState) => {
      if (ref.current) commit(fn(ref.current));
    },
    [commit]
  );

  // Keep the Spanish side stocked while online: new words, more example sentences, mini-stories.
  const topUpSpanish = useCallback(async () => {
    const s = ref.current;
    if (!s || !s.settings.apiKey || !navigator.onLine) return;
    if (Date.now() - lastCards.current < 3 * 3600_000) return;
    lastCards.current = Date.now();
    const st = stats(s.spanish);
    const jobs: Promise<void>[] = [];
    if (st.unseen < 12)
      jobs.push(
        requestCards(s).then((cards) => {
          if (cards.length) update((cur) => ({ ...cur, spanish: { ...cur.spanish, extraCards: [...cur.spanish.extraCards, ...cards] } }));
        })
      );
    if (st.storiesWaiting < 3 && st.seen >= 5)
      jobs.push(
        requestStories(s).then((stories) => {
          if (stories.length) update((cur) => ({ ...cur, spanish: { ...cur.spanish, stories: [...cur.spanish.stories, ...stories].slice(-40) } }));
        })
      );
    const thin = allCards(s.spanish)
      .filter((c) => (s.spanish.progress[c.id]?.box ?? 0) >= 1 && contextsFor(c, s.spanish).length < 3)
      .slice(0, 15);
    if (thin.length)
      jobs.push(
        requestContexts(s, thin).then((contexts) => update((cur) => ({ ...cur, spanish: { ...cur.spanish, contexts: { ...cur.spanish.contexts, ...contexts } } })))
      );
    await Promise.allSettled(jobs);
  }, [update]);

  const refreshPlan = useCallback(
    async (force = false) => {
      const s = ref.current;
      if (!s || busyRef.current || s.active) return;
      if (!s.settings.apiKey) {
        if (force) update((cur) => (cur.active ? cur : { ...cur, plan: buildBuiltinPlan(cur) }));
        return;
      }
      if (!navigator.onLine) return;
      if (!force && s.plan && s.plan.source === 'claude') {
        void topUpSpanish();
        return;
      }
      const planIdAtStart = s.plan?.id ?? null;
      busyRef.current = true;
      setCoachBusy(true);
      try {
        const { plan, assessment } = await requestPlan(s, { target: scheduleTarget(s) });
        update((cur) => {
          // Don't swap the plan out from under a workout that started meanwhile.
          if (cur.active || (cur.plan?.id ?? null) !== planIdAtStart) return { ...cur, claude: { lastError: null, lastSuccess: new Date().toISOString() } };
          return {
            ...cur,
            plan,
            assessment: assessment ?? cur.assessment,
            claude: { lastError: null, lastSuccess: new Date().toISOString() }
          };
        });
        void topUpSpanish();
      } catch (e) {
        update((cur) => ({ ...cur, claude: { ...cur.claude, lastError: (e as Error).message || 'Something went wrong' } }));
      } finally {
        busyRef.current = false;
        setCoachBusy(false);
      }
    },
    [update, topUpSpanish]
  );

  /** If the saved plan is for a different day of the schedule (new week, missed days, changed training days), replace it. */
  const ensureSchedule = useCallback((): boolean => {
    const s = ref.current;
    if (!s || s.active) return false;
    const target = scheduleTarget(s);
    if (planMatches(s.plan, target)) {
      // Same workout, just a day later (a missed day): keep his plan, move the date.
      if (s.plan && s.plan.plannedDate !== target.date) commit({ ...s, plan: { ...s.plan, plannedDate: target.date } });
      return false;
    }
    commit({ ...s, plan: buildBuiltinPlan(s, target) });
    return true;
  }, [commit]);

  // Load saved data once.
  useEffect(() => {
    void requestPersistence();
    loadState().then((s) => {
      let ready = !s.plan && !s.active ? { ...s, plan: buildBuiltinPlan(s) } : s;
      // Plans saved before one-exercise-at-a-time: split the pairs, put dumbbells before cables,
      // then ask Claude for a fresh plan written the new way.
      const fixed = ready.plan && !ready.active ? toStraightSets(ready.plan) : { plan: ready.plan, changed: false };
      if (fixed.changed) ready = { ...ready, plan: fixed.plan };
      // Make sure a saved plan fits the time limit.
      if (ready.plan && !ready.active && estimateSeconds(ready.plan.blocks) > ready.settings.sessionMinutes * 60)
        ready = { ...ready, plan: { ...ready.plan, blocks: fitToTime(ready.plan.blocks, ready.settings.sessionMinutes * 60) } };
      commit(ready);
      const moved = ensureSchedule();
      lastAuto.current = Date.now();
      void refreshPlan(fixed.changed || moved);
    });
  }, [commit, refreshPlan, ensureSchedule]);

  // Save right away when the app is hidden; check for a better plan when it comes back or goes online.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && ref.current) void saveState(ref.current);
      if (document.visibilityState === 'visible') {
        // A new day can mean a new week or a missed day: re-target right away, offline too.
        const moved = ensureSchedule();
        if (moved || Date.now() - lastAuto.current > AUTO_EVERY_MS) {
          lastAuto.current = Date.now();
          void refreshPlan(moved);
        }
      }
    };
    const onOnline = () => {
      lastAuto.current = Date.now();
      void refreshPlan();
    };
    const onHide = () => ref.current && void saveState(ref.current);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onHide);
    };
  }, [refreshPlan, ensureSchedule]);

  const startWorkout = useCallback((plan: Plan) => update((s) => (s.active ? s : { ...s, active: startSession(plan) })), [update]);

  const discardWorkout = useCallback(() => update((s) => ({ ...s, active: null })), [update]);

  const finishWorkout = useCallback((): string | null => {
    const s = ref.current;
    const a = s?.active;
    if (!s || !a) return null;
    if (!a.exercises.some((e) => e.sets.some((x) => x.done))) {
      commit({ ...s, active: null });
      return null;
    }
    const done = { ...a, finishedAt: new Date().toISOString() };
    let next: AppState = { ...s, active: null, sessions: [...s.sessions, done] };
    // The plan sticks until it's done. A bonus or catch-up workout leaves the next plan in place
    // unless it no longer fits the schedule.
    const target = scheduleTarget(next);
    if (!next.plan || next.plan.id === a.planId || !planMatches(next.plan, target)) next = { ...next, plan: buildBuiltinPlan(next, target) };
    commit(next);
    void saveState(next);
    window.setTimeout(() => void refreshPlan(), 50);
    return done.id;
  }, [commit, refreshPlan]);

  const value = useMemo(
    () => (state ? { state, update, coachBusy, refreshPlan, startWorkout, finishWorkout, discardWorkout, ensureSchedule } : null),
    [state, update, coachBusy, refreshPlan, startWorkout, finishWorkout, discardWorkout, ensureSchedule]
  );

  if (!value) return <div className="boot" aria-busy="true" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
