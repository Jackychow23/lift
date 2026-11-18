import { get, set } from 'idb-keyval';
import { freshState, migrate } from './defaults';
import type { AppState } from './types';

const KEY = 'lift-state-v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await get(KEY);
    return raw ? migrate(raw) : freshState();
  } catch {
    // IndexedDB unavailable (private mode etc.) — fall back to localStorage.
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? migrate(JSON.parse(raw)) : freshState();
    } catch {
      return freshState();
    }
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await set(KEY, state);
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* nothing else to try */
    }
  }
}

/** Ask the browser not to clear our data when space runs low. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Backup file without the API key. */
export function exportJson(state: AppState): string {
  const copy: AppState = { ...state, settings: { ...state.settings, apiKey: '' } };
  return JSON.stringify(copy, null, 2);
}

export function importJson(text: string, keepApiKey: string): AppState {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sessions)) throw new Error("That file doesn't look like a Lift backup.");
  const s = migrate(parsed);
  s.settings.apiKey = s.settings.apiKey || keepApiKey;
  return s;
}
