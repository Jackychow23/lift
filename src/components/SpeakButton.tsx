import { useEffect, useState } from 'react';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { IconSpeaker } from './Icons';

/** Plays the Spanish out loud. Tapping again plays it slower, then back to normal speed. */
export default function SpeakButton({ text, label }: { text: string; label?: string }) {
  const [slowNext, setSlowNext] = useState(false);
  useEffect(() => {
    setSlowNext(false);
    return () => stopSpeaking();
  }, [text]);
  if (!canSpeak()) return null;
  const caption = slowNext ? 'Slower' : label;
  return (
    <button
      type="button"
      className="speak-btn"
      aria-label={`${slowNext ? 'Play slower' : 'Hear it'}${label ? `: ${label}` : ''}`}
      onClick={() => {
        speak(text, slowNext);
        setSlowNext(!slowNext);
      }}
    >
      <IconSpeaker />
      {caption && <span>{caption}</span>}
    </button>
  );
}
