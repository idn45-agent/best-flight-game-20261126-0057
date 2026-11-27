// Synthesised sound for Langit Pos: every sound is a WebAudio oscillator or a
// filtered noise buffer, built at run time. No audio file is ever loaded.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 600;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSource.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* sound is decoration; never break the game */ }
  }

  return {
    /** Call from the first user gesture; browsers require it. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(m) {
      muted = m;
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
    },
    isMuted() { return muted; },
    isStarted() { return started; },
    /** Continuous engine and wind, called every frame with the flight state. */
    update(throttle, speed, airborne) {
      if (!ctx || muted || !started) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(airborne || throttle > 0.05 ? 0.045 + throttle * 0.05 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + throttle * 68 + speed * 0.25, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.09, Math.max(0, speed - 18) * 0.0016), t, 0.15);
      windFilter.frequency.setTargetAtTime(420 + speed * 9, t, 0.2);
    },
    /** A ring chime that climbs in pitch with the combo: a streak sounds like one. */
    ring(combo) {
      const step = Math.max(0, Math.min(4, combo || 0));
      const base = 880 + step * 110;
      blip(base, 0.35, 'sine', 0.2, base * 1.5);
      blip(base * 1.5, 0.3, 'sine', 0.1, base * 2);
    },
    click() { blip(660, 0.06, 'square', 0.06); },
    stall() { blip(220, 0.25, 'square', 0.08, 180); },
    touchdown() { blip(140, 0.3, 'sine', 0.25, 70); blip(90, 0.4, 'triangle', 0.2, 55); },
    crash() {
      if (!ctx || muted) return;
      try {
        const len = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.value = 0.3;
        src.connect(g);
        g.connect(ctx.destination);
        src.start();
      } catch { /* ignore */ }
      blip(160, 0.6, 'sawtooth', 0.15, 40);
    },
    fanfare() {
      blip(523, 0.18, 'triangle', 0.16);
      setTimeout(() => blip(659, 0.18, 'triangle', 0.16), 160);
      setTimeout(() => blip(784, 0.35, 'triangle', 0.18), 320);
    },
  };
}
