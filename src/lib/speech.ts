// Pronunciation with the phone's own text-to-speech. Works offline when a Spanish voice is
// installed on the phone (Android: Settings → General management → Text-to-speech).
import { useEffect, useState } from 'react';

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

let voices: SpeechSynthesisVoice[] = [];
const refresh = () => {
  const s = synth();
  if (s) voices = s.getVoices();
};

export const canSpeak = () => !!synth();

/** Mexican Spanish first, then US/Latin American, then any Spanish; on-device voices before network ones. */
export function spanishVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) refresh();
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const es = voices.filter((v) => norm(v).startsWith('es'));
  if (!es.length) return null;
  const order = ['es-mx', 'es-us', 'es-419'];
  const score = (v: SpeechSynthesisVoice) => {
    const i = order.findIndex((r) => norm(v).startsWith(r));
    return (i === -1 ? order.length : i) * 2 + (v.localService ? 0 : 1);
  };
  return [...es].sort((a, b) => score(a) - score(b))[0];
}

export function speak(text: string, slow = false): boolean {
  const s = synth();
  if (!s || !text.trim()) return false;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = spanishVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'es-MX';
  u.rate = slow ? 0.6 : 0.9;
  s.speak(u);
  return true;
}

export const stopSpeaking = () => synth()?.cancel();

/** The Spanish voice the phone will use (voices load a moment after start-up). */
export function useSpanishVoice(): SpeechSynthesisVoice | null {
  const [v, setV] = useState<SpeechSynthesisVoice | null>(() => spanishVoice());
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const on = () => {
      refresh();
      setV(spanishVoice());
    };
    s.addEventListener('voiceschanged', on);
    on();
    return () => s.removeEventListener('voiceschanged', on);
  }, []);
  return v;
}
