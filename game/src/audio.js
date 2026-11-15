// Web Audio synthesized SFX — no network, no asset files. Each sound is generated
// procedurally on demand. Returns a small API.
export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let enabled = true;

  function ensureCtx() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(ctx.destination);
    } catch (e) {
      enabled = false;
    }
  }

  function resume() {
    ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // tone with envelope
  function tone({ freq, type = 'sine', dur = 0.1, attack = 0.005, decay = 0.05, gain = 0.5, sweep = null }) {
    if (!enabled) return;
    ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (sweep !== null) {
      osc.frequency.linearRampToValueAtTime(Math.max(40, freq + sweep), ctx.currentTime + dur);
    }
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  // noise burst (good for shotgun, explosion, hit)
  function noise({ dur = 0.15, gain = 0.4, filterFreq = 1800, filterType = 'lowpass' }) {
    if (!enabled) return;
    ensureCtx();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter).connect(g).connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  const SFX = {
    pulse:    () => tone({ freq: 660, type: 'square',   dur: 0.07, gain: 0.18, sweep: -200 }),
    vector:   () => tone({ freq: 720, type: 'sawtooth', dur: 0.05, gain: 0.14, sweep: -100 }),
    plasma:   () => tone({ freq: 880, type: 'triangle', dur: 0.08, gain: 0.16, sweep: -150 }),
    beam:     () => { tone({ freq: 220, type: 'sawtooth', dur: 0.25, gain: 0.3, sweep: 800 }); noise({ dur: 0.1, gain: 0.2, filterFreq: 600 }); },
    flak:     () => noise({ dur: 0.18, gain: 0.4, filterFreq: 1400 }),
    reload:   () => { tone({ freq: 320, type: 'sine', dur: 0.08, gain: 0.15 }); setTimeout(() => tone({ freq: 420, type: 'sine', dur: 0.06, gain: 0.15 }), 200); },
    hit:      () => tone({ freq: 1400, type: 'sine', dur: 0.04, gain: 0.1 }),
    headshot: () => { tone({ freq: 1800, type: 'square', dur: 0.06, gain: 0.2 }); noise({ dur: 0.05, gain: 0.15, filterFreq: 3000 }); },
    death:    () => tone({ freq: 200, type: 'sawtooth', dur: 0.4, gain: 0.25, sweep: -150 }),
    buy:      () => { tone({ freq: 660, type: 'triangle', dur: 0.05, gain: 0.15 }); setTimeout(() => tone({ freq: 880, type: 'triangle', dur: 0.06, gain: 0.15 }), 60); },
    roundWin: () => { tone({ freq: 523, dur: 0.12, gain: 0.2 }); setTimeout(() => tone({ freq: 659, dur: 0.12, gain: 0.2 }), 120); setTimeout(() => tone({ freq: 784, dur: 0.18, gain: 0.2 }), 240); },
    roundLose:() => { tone({ freq: 392, dur: 0.18, gain: 0.2, type: 'sawtooth' }); setTimeout(() => tone({ freq: 311, dur: 0.25, gain: 0.2, type: 'sawtooth' }), 180); },
    bombPlant:() => { tone({ freq: 880, dur: 0.1, gain: 0.2, type: 'square' }); setTimeout(() => tone({ freq: 440, dur: 0.2, gain: 0.2, type: 'sawtooth' }), 100); },
    bombTick: () => tone({ freq: 1200, dur: 0.02, gain: 0.08, type: 'square' }),
    explosion:() => { noise({ dur: 0.5, gain: 0.6, filterFreq: 800 }); tone({ freq: 80, type: 'sawtooth', dur: 0.4, gain: 0.3, sweep: -40 }); },
    footstep: () => noise({ dur: 0.06, gain: 0.08, filterFreq: 600 }),
    ui:       () => tone({ freq: 880, type: 'sine', dur: 0.03, gain: 0.1 }),
  };

  return {
    resume,
    play: (name) => { if (SFX[name]) SFX[name](); },
    setEnabled: (v) => { enabled = v; if (masterGain) masterGain.gain.value = v ? 0.35 : 0; },
    isEnabled: () => enabled,
  };
}
