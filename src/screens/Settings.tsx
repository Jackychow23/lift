import { useRef, useState } from 'react';
import { testConnection } from '../lib/claude';
import NotesPanel from '../components/NotesPanel';
import { testGithub, unsent } from '../lib/notes';
import { canSpeak, speak, useSpanishVoice } from '../lib/speech';
import { DEFAULT_ABOUT_ME, DEFAULT_SPANISH_FOCUS, freshState } from '../lib/defaults';
import { useOnline } from '../lib/hooks';
import { stats } from '../lib/srs';
import { exportJson, importJson } from '../lib/storage';
import { fitToTime } from '../lib/planner';
import { useStore } from '../lib/store';
import type { EquipmentKey, Settings } from '../lib/types';
import { fmtDate } from '../lib/util';

const EQUIPMENT: [EquipmentKey, string][] = [
  ['flat_bench', 'Flat bench'],
  ['adjustable_bench', 'Adjustable (incline) bench'],
  ['rope', 'Cable rope'],
  ['pulldown_row', 'Pulldown / seated row machine'],
  ['v_bar', 'V-handle'],
  ['d_handle', 'Single handle'],
  ['straight_bar', 'Short straight bar']
];

export default function SettingsScreen() {
  const { state, update, coachBusy, refreshPlan, ensureSchedule, syncNotes } = useStore();
  const [showGh, setShowGh] = useState(false);
  const [ghTest, setGhTest] = useState<string | null>(null);
  const voice = useSpanishVoice();
  const waiting = unsent(state.notes).length;
  const online = useOnline();
  const s = state.settings;
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<string | null>(null);
  const [dbText, setDbText] = useState(s.dumbbells.join(', '));
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sp = stats(state.spanish);

  const set = (patch: Partial<Settings>) =>
    update((st) => ({
      ...st,
      settings: { ...st.settings, ...patch },
      // A new key or model gets a clean slate; the old error no longer applies.
      claude: 'apiKey' in patch || 'model' in patch ? { ...st.claude, lastError: null } : st.claude
    }));
  const setEq = (k: EquipmentKey, v: boolean) => update((st) => ({ ...st, settings: { ...st.settings, equipment: { ...st.settings.equipment, [k]: v } } }));

  const runTest = async () => {
    setTest('Checking…');
    try {
      await testConnection(s);
      setTest('Connected. Plans will come from Claude.');
    } catch (e) {
      setTest((e as Error).message);
    }
  };

  const download = () => {
    const blob = new Blob([exportJson(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const restore = async (file: File) => {
    try {
      const next = importJson(await file.text(), s.apiKey, s.githubToken);
      update(() => next);
      setMsg(`Restored ${next.sessions.length} workouts.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <h1 className="h1" style={{ fontSize: 34 }}>Settings</h1>

      <section className="card stack-lg" aria-label="Claude">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Claude</span>
        <label className="field">
          <span>API key</span>
          <div className="row">
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              value={s.apiKey}
              onChange={(e) => set({ apiKey: e.target.value.trim() })}
            />
            <button type="button" className="btn" onClick={() => setShowKey((v) => !v)}>{showKey ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
          Stays on this phone only and is left out of backups. Get one at console.anthropic.com; each plan costs a few cents at most.
        </p>
        <label className="field">
          <span>Model</span>
          <input className="input" value={s.model} onChange={(e) => set({ model: e.target.value })} spellCheck={false} />
        </label>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn" disabled={!s.apiKey || !online} onClick={runTest}>Test connection</button>
          <button type="button" className="btn outline-accent" disabled={coachBusy || !!state.active} onClick={() => void refreshPlan(true)}>
            {coachBusy ? 'Writing a plan…' : 'Get a new plan now'}
          </button>
        </div>
        {test && <p className="small" style={{ margin: 0 }} aria-live="polite">{test}</p>}
        <p className="small" style={{ margin: 0 }}>
          {state.claude.lastSuccess ? `Last plan from Claude: ${fmtDate(state.claude.lastSuccess)}.` : 'No plans from Claude yet.'}
          {state.claude.lastError ? ` Last problem: ${state.claude.lastError}` : ''}
        </p>
      </section>

      <section className="card stack" aria-label="About me">
        <span style={{ fontSize: 15, fontWeight: 600 }}>About me</span>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>Claude reads this every time it plans. Update it as things change: goals, aches, likes, what the gym has.</p>
        <label className="field">
          <span className="sr-only">About me</span>
          <textarea className="input" value={s.aboutMe} onChange={(e) => set({ aboutMe: e.target.value })} />
        </label>
        <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => set({ aboutMe: DEFAULT_ABOUT_ME })}>Reset to original</button>
      </section>

      <section className="card stack" aria-label="Training days">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Training days</span>
        <div className="day-chips" role="group" aria-label="Training days">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, d) => {
            const on = s.trainingDays.includes(d);
            const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={names[d]}
                onClick={() => {
                  const next = on ? s.trainingDays.filter((x) => x !== d) : [...s.trainingDays, d].sort((a, b) => a - b);
                  if (!next.length) return;
                  set({ trainingDays: next });
                  if (ensureSchedule()) void refreshPlan(true);
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
          Upper A and B alternate. A third day in a row is a light day (lighter weights, a few more reps). Miss a day and the next one picks up where you left off; one still left after the last training day shows up as an optional catch-up. Each week starts fresh on Monday, and the bonus day unlocks once the week's workouts are done.
        </p>
      </section>

      <section className="card stack" aria-label="Workout length">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Workout length</span>
        <label className="field">
          <span>Minutes per workout, everything included</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={15}
            max={120}
            value={s.sessionMinutes}
            onChange={(e) => {
              const mins = Math.round(Number(e.target.value));
              if (!(mins >= 15 && mins <= 120)) return;
              // Trim today's plan right away if it no longer fits; new plans are written to fit.
              update((st) => ({
                ...st,
                settings: { ...st.settings, sessionMinutes: mins },
                plan: st.plan && !st.active ? { ...st.plan, blocks: fitToTime(st.plan.blocks, mins * 60) } : st.plan
              }));
            }}
          />
        </label>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>Plans count set-up, your warm-up sets, every set and the rests, and trim accessories first if it won't fit.</p>
      </section>

      <section className="card stack-lg" aria-label="Equipment">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Gym equipment</span>
        <label className="field">
          <span>Dumbbells (lb, comma-separated)</span>
          <input
            className="input"
            inputMode="decimal"
            value={dbText}
            onChange={(e) => setDbText(e.target.value)}
            onBlur={() => {
              const list = [...new Set(dbText.split(/[,\s]+/).map(Number).filter((n) => n > 0 && n < 300))].sort((a, b) => a - b);
              if (list.length) set({ dumbbells: list });
              setDbText((list.length ? list : s.dumbbells).join(', '));
            }}
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Cable step (lb)</span>
            <input className="input" inputMode="decimal" type="number" min={1} value={s.cableIncrement} onChange={(e) => Number(e.target.value) > 0 && set({ cableIncrement: Number(e.target.value) })} />
          </label>
          <label className="field grow">
            <span>Cable max (lb)</span>
            <input className="input" inputMode="decimal" type="number" min={10} value={s.cableMax} onChange={(e) => Number(e.target.value) > 0 && set({ cableMax: Number(e.target.value) })} />
          </label>
        </div>
        {s.equipment.pulldown_row && (
          <div className="row">
            <label className="field grow">
              <span>Pulldown/row machine step (lb)</span>
              <input className="input" inputMode="decimal" type="number" min={1} value={s.machineIncrement} onChange={(e) => Number(e.target.value) > 0 && set({ machineIncrement: Number(e.target.value) })} />
            </label>
            <label className="field grow">
              <span>Machine max (lb)</span>
              <input className="input" inputMode="decimal" type="number" min={10} value={s.machineMax} onChange={(e) => Number(e.target.value) > 0 && set({ machineMax: Number(e.target.value) })} />
            </label>
          </div>
        )}
        <div className="list" style={{ background: 'var(--bg)' }}>
          {EQUIPMENT.map(([k, label]) => (
            <label key={k} className="toggle">
              <span>{label}</span>
              <input type="checkbox" checked={s.equipment[k]} onChange={(e) => setEq(k, e.target.checked)} />
            </label>
          ))}
          <label className="toggle">
            <span>Floor exercises (push-ups, floor press)</span>
            <input type="checkbox" checked={s.allowFloor} onChange={(e) => set({ allowFloor: e.target.checked })} />
          </label>
          <label className="toggle">
            <span>Include legs</span>
            <input type="checkbox" checked={s.includeLegs} onChange={(e) => set({ includeLegs: e.target.checked })} />
          </label>
        </div>
      </section>

      <section className="card stack" aria-label="Rest timer and Spanish">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Rest timer + Spanish</span>
        <div className="list" style={{ background: 'var(--bg)' }}>
          <label className="toggle">
            <span>Beep when rest is over (it always vibrates)</span>
            <input type="checkbox" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
          </label>
        </div>
        <label className="field">
          <span>What Spanish is for</span>
          <textarea className="input" style={{ minHeight: 120 }} value={s.spanishFocus} onChange={(e) => set({ spanishFocus: e.target.value })} />
        </label>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>Claude reads this when it writes new words, example sentences and mini-stories. Change it when your plans change.</p>
        <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => set({ spanishFocus: DEFAULT_SPANISH_FOCUS })}>Reset to the Tulum trip</button>
        <div className="between" style={{ gap: 10 }}>
          <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
            {!canSpeak()
              ? 'This browser can’t read words out loud.'
              : voice
                ? `Pronunciation voice: ${voice.name} (${voice.lang})${voice.localService ? '' : ', needs a connection'}.`
                : 'No Spanish voice found yet. On the phone: Settings → General management → Text-to-speech → (the engine’s settings) → install Spanish (Mexico or US). Then reopen the app.'}
          </p>
          {canSpeak() && (
            <button type="button" className="btn" style={{ flex: 'none' }} onClick={() => speak('¿Cuánto cuesta al centro?')}>
              Test
            </button>
          )}
        </div>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
          Spanish: level {sp.level} · {sp.seen} words seen · {sp.mastered} well learned · {sp.unseen} new waiting
          {state.spanish.extraCards.length ? ` · ${state.spanish.extraCards.length} written by Claude` : ''}.
        </p>
      </section>

      <section className="card stack" aria-label="Notes">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Notes</span>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
          Notes you save during a workout stay on this phone, and the coach reads recent ones when it plans. To send them where Claude in chat can read them, connect a private GitHub repo: each note becomes an issue there as soon as you're online.
        </p>
        <label className="field">
          <span>Private repo for notes</span>
          <input className="input" value={s.githubRepo} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => set({ githubRepo: e.target.value.trim() })} />
        </label>
        <label className="field">
          <span>GitHub token (Issues: read and write)</span>
          <div className="row">
            <input
              className="input grow"
              type={showGh ? 'text' : 'password'}
              value={s.githubToken}
              placeholder="github_pat_…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => set({ githubToken: e.target.value.trim() })}
              onBlur={() => void syncNotes()}
            />
            <button type="button" className="btn" onClick={() => setShowGh(!showGh)}>{showGh ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            disabled={!online}
            onClick={async () => {
              setGhTest('Checking…');
              try {
                setGhTest(await testGithub(s));
                void syncNotes(true);
              } catch (e) {
                setGhTest((e as Error).message);
              }
            }}
          >
            Test
          </button>
          {waiting > 0 && (
            <button type="button" className="btn" disabled={!online || !s.githubToken} onClick={() => void syncNotes(true)}>
              Send {waiting} waiting
            </button>
          )}
        </div>
        {ghTest && <p className="small" style={{ margin: 0 }} aria-live="polite">{ghTest}</p>}
        {state.notes.length > 0 && (
          <button
            type="button"
            className="btn ghost"
            style={{ alignSelf: 'flex-start' }}
            onClick={async () => {
              const text = state.notes
                .slice(-20)
                .map((n) => `${new Date(n.at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${n.where ? ` (${n.where})` : ''}: ${n.text}`)
                .join('\n');
              try {
                await navigator.clipboard.writeText(text);
                setGhTest('Copied your last notes. Paste them into a chat.');
              } catch {
                setGhTest('Couldn’t copy on this phone.');
              }
            }}
          >
            Copy recent notes
          </button>
        )}
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>The token stays on this phone and is left out of backups.</p>
        <NotesPanel where="Outside a workout" filter={(n) => state.notes.indexOf(n) >= state.notes.length - 20} placeholder="Write a note…" />
      </section>

      <section className="card stack" aria-label="Data">
        <span style={{ fontSize: 15, fontWeight: 600 }}>Your data</span>
        <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>Everything lives on this phone. Save a backup now and then, especially before switching phones or clearing browser data.</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={download}>Save backup</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restore backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
        </div>
        {msg && <p className="small" style={{ margin: 0 }} aria-live="polite">{msg}</p>}
        {!confirmReset ? (
          <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start', color: 'var(--bad-ink)' }} onClick={() => setConfirmReset(true)}>Erase everything…</button>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn danger" onClick={() => { update(() => ({ ...freshState(), settings: { ...freshState().settings, apiKey: s.apiKey, githubToken: s.githubToken, githubRepo: s.githubRepo } })); setConfirmReset(false); }}>
              Yes, erase all workouts and progress
            </button>
            <button type="button" className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
      </section>

      <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
        Lift 0.1 · Exercise photos from free-exercise-db (public domain). Works offline once installed.
      </p>
    </div>
  );
}
