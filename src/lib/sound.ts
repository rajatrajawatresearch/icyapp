// The in-app "ting", made with WebAudio — no sound file to download.

let ctx: AudioContext | null = null;

function context() {
  try {
    ctx ??= new AudioContext();
  } catch {
    // No audio on this device; the badge and the banner still show.
  }
  return ctx;
}

/**
 * Browsers, iPhones above all, only let a page make sound after the person
 * has touched it. This wakes the audio on the first tap or key press, so a
 * notification that arrives later can ring. Returns a cleanup function.
 */
export function unlockSound() {
  const wake = () => {
    context()
      ?.resume()
      .catch(() => {});
  };
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
  return () => {
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
  };
}

/** A bright two-note ting. Silent if the page has never been touched. */
export function chime() {
  const audio = context();
  if (!audio) return;
  audio.resume().catch(() => {});
  if (audio.state !== "running") return;
  [1318.5, 1760].forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime + i * 0.16;
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.6);
  });
}
