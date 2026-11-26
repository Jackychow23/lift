import { useState } from 'react';
import { useOnline } from '../lib/hooks';
import { useStore } from '../lib/store';
import type { Note } from '../lib/types';

/** Where a note stands, in plain words. */
function status(n: Note, hasToken: boolean, online: boolean): { text: string; tone: 'good' | 'wait' | 'bad' } {
  if (n.sentAt) return { text: 'Sent', tone: 'good' };
  if (n.error) return { text: n.error, tone: 'bad' };
  if (!hasToken) return { text: 'Saved on this phone. To send notes, set up Settings → Notes.', tone: 'wait' };
  return { text: online ? 'Sending…' : 'Saved. Sends when you’re back online.', tone: 'wait' };
}

const TONE = { good: 'var(--good-ink)', wait: 'var(--muted)', bad: 'var(--bad-ink)' } as const;

/**
 * Type a note, save it on the phone, and it goes out (as a GitHub issue) once there's a
 * connection. `filter` picks which notes to list.
 */
export default function NotesPanel({
  where,
  sessionId,
  filter,
  placeholder = 'Anything to remember? Pain, a busy machine, an app bug…'
}: {
  where?: string;
  sessionId?: string;
  filter: (n: Note) => boolean;
  placeholder?: string;
}) {
  const { state, addNote, deleteNote } = useStore();
  const online = useOnline();
  const [text, setText] = useState('');
  const hasToken = !!state.settings.githubToken.trim();
  const list = state.notes.filter(filter).slice().reverse();

  const save = () => {
    if (!text.trim()) return;
    addNote(text, { where, sessionId });
    setText('');
  };

  return (
    <div className="notes stack">
      <textarea className="input" rows={2} style={{ minHeight: 72 }} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} aria-label="Note" />
      <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={!text.trim()} onClick={save}>
        Save note
      </button>
      {list.map((n) => {
        const st = status(n, hasToken, online);
        return (
          <div key={n.id} className="note">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p>{n.text}</p>
              <span className="small" style={{ color: TONE[st.tone] }}>
                {n.where ? `${n.where} · ` : ''}
                {n.sentAt && n.url ? (
                  <a href={n.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                    Sent
                  </a>
                ) : (
                  st.text
                )}
              </span>
            </div>
            {!n.sentAt && (
              <button type="button" className="btn ghost" aria-label="Delete note" onClick={() => deleteNote(n.id)}>
                Delete
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
