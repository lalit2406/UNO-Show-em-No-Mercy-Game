let audioCtx = null;
let enabled = localStorage.getItem('sound_enabled') !== 'false';
let volume = parseFloat(localStorage.getItem('sound_volume') ?? '0.5');
const lastPlayTimes = {};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

// Unlock Audio Context on first user action (mobile Safari/Chrome restriction)
const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}

// Throttle to prevent overlapping audio spam
const shouldPlay = (soundName, cooldownMs = 120) => {
  const now = Date.now();
  if (lastPlayTimes[soundName] && now - lastPlayTimes[soundName] < cooldownMs) {
    return false;
  }
  lastPlayTimes[soundName] = now;
  return true;
};

const soundManager = {
  isEnabled: () => enabled,
  getVolume: () => volume,

  toggleEnabled: () => {
    enabled = !enabled;
    localStorage.setItem('sound_enabled', enabled.toString());
    return enabled;
  },

  setVolume: (v) => {
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('sound_volume', volume.toString());
  },

  playCardPlay: () => {
    if (!enabled || !shouldPlay('card-play', 100)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gainNode.gain.setValueAtTime(volume * 0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  },

  playCardDraw: () => {
    if (!enabled || !shouldPlay('card-draw', 120)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.12);

    gainNode.gain.setValueAtTime(volume * 0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  },

  playPenalty: () => {
    if (!enabled || !shouldPlay('penalty', 300)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    // Dramatic heavy brass triad chord
    const frequencies = [110, 147, 165];
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gainNode.gain.setValueAtTime(volume * 0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  },

  playUnoCall: () => {
    if (!enabled || !shouldPlay('uno-call', 500)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    // Bright rising arpeggio C5 -> E5 -> G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(volume * 0.4, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      osc.start(time);
      osc.stop(time + 0.25);
    });
  },

  playUnoPenalty: () => {
    if (!enabled || !shouldPlay('uno-penalty', 500)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(133, now);

    gainNode.gain.setValueAtTime(volume * 0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  },

  playYourTurn: () => {
    if (!enabled || !shouldPlay('your-turn', 800)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    // Soft notification double-chime: E5 -> A5
    const notes = [659.25, 880.00];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(volume * 0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      osc.start(time);
      osc.stop(time + 0.25);
    });
  },

  playColorChange: () => {
    if (!enabled || !shouldPlay('color-change', 200)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.3);

    gainNode.gain.setValueAtTime(volume * 0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  },

  playReverse: () => {
    if (!enabled || !shouldPlay('reverse', 200)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.15);
    osc.frequency.linearRampToValueAtTime(300, now + 0.25);

    gainNode.gain.setValueAtTime(volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  },

  playSkip: () => {
    if (!enabled || !shouldPlay('skip', 200)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(140, now + 0.05);

    gainNode.gain.setValueAtTime(volume * 0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  },

  playDiscardAll: () => {
    if (!enabled || !shouldPlay('discard-all', 300)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const notes = [600, 480, 360, 240];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(volume * 0.25, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.start(time);
      osc.stop(time + 0.1);
    });
  },

  playVictory: () => {
    if (!enabled || !shouldPlay('victory', 1000)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.1;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(volume * 0.35, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      osc.start(time);
      osc.stop(time + 0.5);
    });
  },

  playDefeat: () => {
    if (!enabled || !shouldPlay('defeat', 1000)) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const notes = [261.63, 207.65, 196.00, 174.61];
    notes.forEach((freq, idx) => {
      const time = now + idx * 0.15;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(volume * 0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.65);

      osc.start(time);
      osc.stop(time + 0.65);
    });
  }
};

export default soundManager;
