// Small phone helpers: keep the screen on during a workout, buzz/beep when rest ends.

type Sentinel = { release: () => Promise<void> };
let lock: Sentinel | null = null;

export async function keepScreenOn(on: boolean) {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    if (on && wl && !lock) lock = await wl.request('screen');
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}

/** Wake locks drop when the app is hidden; take it again when it comes back. */
export function rearmOnVisible(active: () => boolean) {
  const h = () => {
    if (document.visibilityState === 'visible' && active()) {
      lock = null;
      void keepScreenOn(true);
    }
  };
  document.addEventListener('visibilitychange', h);
  return () => document.removeEventListener('visibilitychange', h);
}

let ctx: AudioContext | null = null;

/** Call from a tap so the browser allows sound later. */
export function primeAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* no audio */
  }
}

/** Short cue for timed holds: 'start' = one tap, 'end' = two taps. */
export function cue(kind: 'start' | 'end', sound: boolean) {
  try {
    navigator.vibrate?.(kind === 'start' ? 120 : [180, 90, 180]);
  } catch {
    /* no vibration */
  }
  if (!sound || !ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = kind === 'start' ? 660 : 990;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.17);
  } catch {
    /* ignore */
  }
}

export function restDone(sound: boolean) {
  try {
    navigator.vibrate?.([250, 120, 250]);
  } catch {
    /* no vibration */
  }
  if (!sound || !ctx) return;
  try {
    const t = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + offset);
      g.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t + offset);
      o.stop(t + offset + 0.2);
    });
  } catch {
    /* ignore */
  }
}
