import { useCallback, useEffect, useRef, useState } from 'react';
import { IconProgress, IconSettings, IconToday } from './components/Icons';
import { useStore } from './lib/store';
import Demo from './screens/Demo';
import Done from './screens/Done';
import Posture from './screens/Posture';
import Progress from './screens/Progress';
import SettingsScreen from './screens/Settings';
import Today from './screens/Today';
import Workout from './screens/Workout';

export type View =
  | { name: 'today' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'workout' }
  | { name: 'done'; sessionId: string }
  | { name: 'demo'; exerciseId: string }
  | { name: 'posture' };

export interface Nav {
  go: (v: View) => void;
  /** Switch tabs / jump without adding a back step. */
  replace: (v: View) => void;
  back: () => void;
}

const TABS: View['name'][] = ['today', 'progress', 'settings'];

export default function App() {
  const { state } = useStore();
  const [stack, setStack] = useState<View[]>(() => [state.active ? { name: 'workout' } : { name: 'today' }]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  // Android back gesture: each pushed screen gets a history entry.
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((v: View) => {
    history.pushState({ depth: stackRef.current.length }, '');
    setStack((s) => [...s, v]);
    window.scrollTo(0, 0);
  }, []);
  const replace = useCallback((v: View) => {
    setStack((s) => [...s.slice(0, -1), v]);
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => {
    if (stackRef.current.length > 1) history.back();
    else setStack([{ name: 'today' }]);
  }, []);
  const nav: Nav = { go, replace, back };

  const view = stack[stack.length - 1];
  const isTab = TABS.includes(view.name);

  let screen;
  switch (view.name) {
    case 'today': screen = <Today nav={nav} />; break;
    case 'progress': screen = <Progress nav={nav} />; break;
    case 'settings': screen = <SettingsScreen />; break;
    case 'workout': screen = <Workout nav={nav} />; break;
    case 'done': screen = <Done nav={nav} sessionId={view.sessionId} />; break;
    case 'demo': screen = <Demo nav={nav} exerciseId={view.exerciseId} />; break;
    case 'posture': screen = <Posture nav={nav} />; break;
  }

  const tab = (name: 'today' | 'progress' | 'settings', label: string, icon: JSX.Element) => (
    <button type="button" aria-current={view.name === name ? 'page' : undefined} onClick={() => setStack([{ name }])}>
      {icon}
      {label}
    </button>
  );

  return (
    <div className="app">
      <main className="grow" style={{ display: 'flex', flexDirection: 'column' }}>{screen}</main>
      {isTab && (
        <nav className="nav" aria-label="Main">
          {tab('today', 'Today', <IconToday />)}
          {tab('progress', 'Progress', <IconProgress />)}
          {tab('settings', 'Settings', <IconSettings />)}
        </nav>
      )}
    </div>
  );
}
