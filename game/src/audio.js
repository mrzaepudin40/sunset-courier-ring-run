// Sound, synthesised with WebAudio only: no audio files, no network. A soft
// engine hum whose pitch follows speed, a chime for a ring, a low thud for a
// bump, and a little fanfare for landing. Everything is created lazily on the
// first user gesture, so browsers never autoplay sound.

export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter).connect(engineGain).connect(ctx.destination);
      engine.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ensure() || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* sound is decoration; a failure never breaks the game */ }
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    /** speed 0..1 sets the engine hum. Call every frame while playing. */
    engine(level, on) {
      if (!ensure() || muted) return;
      try {
        engine.frequency.value = 48 + level * 46;
        engineGain.gain.setTargetAtTime(on ? 0.028 + level * 0.02 : 0, ctx.currentTime, 0.1);
      } catch { /* ignore */ }
    },
    ring(perfect) {
      tone(880, 0.35, 'sine', 0.16);
      tone(1318, 0.4, 'sine', 0.12, 0.07);
      if (perfect) tone(1760, 0.5, 'sine', 0.12, 0.14);
    },
    bump() { tone(110, 0.25, 'triangle', 0.2); tone(70, 0.3, 'sine', 0.18, 0.02); },
    land() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.14, i * 0.12));
    },
    over() { [392, 330, 262].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.16)); },
    toggleMute() {
      muted = !muted;
      if (engineGain && ctx) engineGain.gain.value = 0;
      return muted;
    },
  };
}
