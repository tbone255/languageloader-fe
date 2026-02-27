/**
 * Sound effects via Web Audio API.
 *
 * Design decision: Web Audio API over audio files — no CDN dependency,
 * instant response, ~200 bytes of code. Tones are intentionally subtle.
 * Correct: ascending major third (C5→E5, 150ms each)
 * Wrong: descending minor second (E4→Eb4, 100ms each)
 * Complete: ascending perfect fifth (C5→G5, 200ms + fade)
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, startTime: number, duration: number, gain = 0.25): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const gainNode = c.createGain();
  osc.connect(gainNode);
  gainNode.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

export function playCorrect(): void {
  try {
    const c = getCtx();
    const now = c.currentTime;
    // C5 → E5 (ascending major third)
    playTone(523.25, now, 0.15);
    playTone(659.25, now + 0.12, 0.18);
  } catch {
    // Ignore AudioContext errors (e.g. browser policy)
  }
}

export function playWrong(): void {
  try {
    const c = getCtx();
    const now = c.currentTime;
    // E4 → Eb4 (descending minor second)
    playTone(329.63, now, 0.10);
    playTone(311.13, now + 0.08, 0.12);
  } catch {
    // Ignore
  }
}

export function playComplete(): void {
  try {
    const c = getCtx();
    const now = c.currentTime;
    // C5 → G5 (ascending perfect fifth) with longer sustain
    playTone(523.25, now, 0.20);
    playTone(659.25, now + 0.15, 0.20);
    playTone(783.99, now + 0.30, 0.35, 0.30);
  } catch {
    // Ignore
  }
}
