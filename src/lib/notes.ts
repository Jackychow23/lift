// Workout notes: saved on the phone right away, then filed as GitHub issues on his repo once
// there's a connection, so they can be read back later (and the coach reads them too).
import type { Note, Settings } from './types';

const API = 'https://api.github.com';

const headers = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token.trim()}`,
  'X-GitHub-Api-Version': '2022-11-28'
});

/** Problems the user has to fix (bad token, wrong repo). Network trouble is not one of these. */
export class NoteSetupError extends Error {}

function explain(status: number, repo: string): string {
  if (status === 401) return 'GitHub didn’t accept the token. Make a new one and paste it in Settings → Notes.';
  if (status === 403) return `The token can’t write issues on ${repo}. It needs “Issues: Read and write” for that repo.`;
  if (status === 404) return `Couldn’t find ${repo}. Check the repo name in Settings → Notes, and that the token includes it.`;
  if (status === 410) return `Issues are turned off for ${repo}.`;
  return `GitHub said ${status}.`;
}

export function noteIssue(note: Note): { title: string; body: string } {
  const first = note.text.trim().split('\n')[0];
  const title = `Note: ${first.length > 70 ? `${first.slice(0, 67)}…` : first}`;
  const when = new Date(note.at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const body = `${note.text.trim()}\n\n---\n${when}${note.where ? ` · ${note.where}` : ''}\n_Sent from the Lift app._`;
  return { title, body };
}

const verified = new Set<string>();

/**
 * Notes can be personal (pain, injuries), so they only go to a private repo with issues on.
 * Checked once per token + repo.
 */
async function checkRepo(settings: Settings): Promise<string> {
  const repo = settings.githubRepo.trim();
  const key = `${settings.githubToken.trim()}|${repo}`;
  if (verified.has(key)) return repo;
  const res = await fetch(`${API}/repos/${repo}`, { headers: headers(settings.githubToken) });
  if (!res.ok) {
    if ([401, 403, 404].includes(res.status)) throw new NoteSetupError(explain(res.status, repo));
    throw new Error(`GitHub ${res.status}`);
  }
  const json = (await res.json()) as { private?: boolean; has_issues?: boolean; full_name?: string };
  if (json.private !== true)
    throw new NoteSetupError(`${repo} is public, so anyone could read notes sent there. Use a private repo for notes (Settings → Notes).`);
  if (json.has_issues === false) throw new NoteSetupError(explain(410, repo));
  verified.add(key);
  return json.full_name ?? repo;
}

/** Files one note as an issue. Returns its URL. Throws NoteSetupError for setup problems. */
export async function sendNote(note: Note, settings: Settings): Promise<string> {
  const repo = await checkRepo(settings);
  const res = await fetch(`${API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: { ...headers(settings.githubToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(noteIssue(note))
  });
  if (!res.ok) {
    if ([401, 403, 404, 410, 422].includes(res.status)) throw new NoteSetupError(explain(res.status, repo));
    throw new Error(`GitHub ${res.status}`);
  }
  const json = (await res.json()) as { html_url?: string };
  return json.html_url ?? '';
}

/** Checks the token can see the repo's issues. */
export async function testGithub(settings: Settings): Promise<string> {
  if (!settings.githubToken.trim()) throw new Error('Paste a GitHub token first.');
  const repo = await checkRepo(settings);
  return `Connected to ${repo} (private). Notes will be sent there.`;
}

export const unsent = (notes: Note[]) => notes.filter((n) => !n.sentAt);
