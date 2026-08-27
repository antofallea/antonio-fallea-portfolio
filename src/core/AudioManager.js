export class AudioManager {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.timer = null;
    this.on = false;
    
    this.scale = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66];
    this.melody = [4, 6, 7, 6, 4, 3, 1, 3, 4, 6, 7, 6, 4, 3, 1, 0, 4, 6, 7, 6, 4, 3, 1, 3, 5, 7, 6, 4, 3, 1, 0, 1];
    this.bass = [0, 0, 0, 0, 4, 4, 4, 4, 5, 5, 5, 5, 3, 3, 3, 3, 0, 0, 0, 0, 4, 4, 4, 4, 6, 6, 6, 6, 3, 3, 3, 3];
    this.step = 0.115;
    
    this.button = document.querySelector('#audioToggle');
    if (this.button) {
      this.button.addEventListener('click', () => this.toggle());
    }
  }

  setup() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.25; // Lowered volume for ambient feel
    this.gain.connect(this.ctx.destination);
  }

  tone(freq, start, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env).connect(this.gain);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  kick(start) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(128, start);
    osc.frequency.exponentialRampToValueAtTime(42, start + 0.12);
    env.gain.setValueAtTime(0.09, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(env).connect(this.gain);
    osc.start(start);
    osc.stop(start + 0.15);
  }

  play() {
    if (!this.on || !this.ctx) return;
    const start = this.ctx.currentTime + 0.055;
    
    this.melody.forEach((note, i) => {
      const t = start + i * this.step;
      if (i % 4 === 0) {
        this.kick(t);
        this.tone(this.scale[this.bass[i]] * 0.5, t, 0.33, 'sawtooth', 0.03); // Softer bass
      }
      if (i % 2 === 0) this.tone(this.scale[note] * 2, t, 0.085, 'triangle', 0.025);
      if (i % 2 === 1) this.tone(5200, t, 0.018, 'square', 0.005);
      if (i % 8 === 6) this.tone(this.scale[(note + 3) % this.scale.length] * 4, t, 0.055, 'sine', 0.015);
    });
    
    return this.melody.length * this.step * 1000;
  }

  async startMusic() {
    this.setup();
    try { await this.ctx.resume(); } catch { return false; }
    if (this.ctx.state !== 'running') return false;
    if (this.on) return true;
    
    this.on = true;
    const duration = this.play();
    this.timer = setInterval(() => this.play(), duration);
    this.syncButton(true);
    return true;
  }

  async stopMusic() {
    this.on = false;
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) await this.ctx.suspend();
    this.syncButton(false);
    return false;
  }

  async toggle() {
    return this.on ? this.stopMusic() : this.startMusic();
  }

  syncButton(on) {
    if (!this.button) return;
    this.button.classList.toggle('active', on);
    this.button.setAttribute('aria-pressed', String(on));
    const span = this.button.querySelector('span');
    if (span) span.textContent = on ? 'ON' : 'OFF';
  }
}
