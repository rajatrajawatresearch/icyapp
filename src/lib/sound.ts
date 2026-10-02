/** Short two-tone chime via WebAudio — no asset to download. */
export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.15;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    });
  } catch {
    // Browsers block audio until the user has interacted with the page —
    // the badge still shows.
  }
}
