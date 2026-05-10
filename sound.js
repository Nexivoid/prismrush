window.PrismAudio = (() => {
  let ctx;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  }
  function tone(freq, duration = 0.08, type = "sine", gain = 0.045, delay = 0) {
    ensure();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  function start() { tone(220, 0.09, "triangle", 0.035); tone(330, 0.1, "triangle", 0.035, 0.06); tone(495, 0.12, "triangle", 0.035, 0.12); }
  function hit(combo = 1) { const base = 320 + Math.min(combo, 12) * 24; tone(base, 0.07, "square", 0.032); tone(base * 1.5, 0.08, "triangle", 0.025, 0.035); }
  function miss() { tone(140, 0.14, "sawtooth", 0.035); }
  function power() { tone(520, 0.08, "triangle", 0.038); tone(780, 0.12, "triangle", 0.036, 0.045); }
  function blast() { tone(150, 0.16, "sawtooth", 0.05); tone(620, 0.2, "triangle", 0.046, 0.04); tone(930, 0.16, "sine", 0.032, 0.1); }
  return { ensure, start, hit, miss, power, blast };
})();
