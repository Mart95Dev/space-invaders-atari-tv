import type { GameEvent } from '../engine/types';

/**
 * Sons rétro synthétisés localement (Web Audio API), sans fichier externe.
 * Le contexte audio n'est créé qu'après une action de l'utilisateur (unlock).
 * Si l'audio est indisponible, toutes les méthodes deviennent sans effet.
 */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private shipNodes: { osc: OscillatorNode; lfo: OscillatorNode } | null = null;
  private suspended = false;
  muted = false;

  unlock(): void {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        const length = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended' && !this.suspended) void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  consume(events: readonly GameEvent[]): void {
    if (this.suspended) return;
    for (const event of events) this.play(event);
  }

  /** Pause : coupe les sons continus et gèle le contexte. */
  suspend(): void {
    this.suspended = true;
    this.stopShip();
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    this.suspended = false;
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  /** Arrête tout son continu (retour au menu, fin de partie). */
  stopAll(): void {
    this.stopShip();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopShip();
  }

  private play(event: GameEvent): void {
    switch (event.type) {
      case 'fire':
        this.tone(1200, 0.14, 'square', 0.05, 180);
        break;
      case 'march':
        this.tone([92, 82, 73, 69][event.step] ?? 92, 0.08, 'square', 0.12);
        break;
      case 'invader-hit':
        this.noise(0.2, 0.2, 2600);
        break;
      case 'shield-hit':
        this.noise(0.05, 0.06, 1200);
        break;
      case 'cannon-hit':
        this.stopShip();
        this.noise(1.2, 0.3, 700);
        break;
      case 'ship-appear':
        this.startShip();
        break;
      case 'ship-gone':
        this.stopShip();
        break;
      case 'ship-hit':
        this.stopShip();
        this.tone(900, 0.4, 'square', 0.07, 90);
        this.noise(0.35, 0.12, 2200);
        break;
      case 'wave-cleared':
        [330, 440, 554, 660].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, null, i * 0.11));
        break;
      case 'turn-change':
        this.tone(440, 0.12, 'square', 0.05);
        this.tone(660, 0.16, 'square', 0.05, null, 0.14);
        break;
      case 'game-over':
        this.stopShip();
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'square', 0.06, null, i * 0.22));
        break;
    }
  }

  private ready(): AudioContext | null {
    if (!this.ctx || this.muted || this.suspended) return null;
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, slideTo: number | null = null, delay = 0): void {
    const ctx = this.ready();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, volume: number, cutoff: number): void {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  /** Sirène du vaisseau de commandement, tant qu'il traverse l'écran. */
  private startShip(): void {
    const ctx = this.ready();
    if (!ctx || this.shipNodes) return;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 480;
    lfo.frequency.value = 6;
    depth.gain.value = 120;
    gain.gain.value = 0.025;
    lfo.connect(depth).connect(osc.frequency);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    lfo.start();
    this.shipNodes = { osc, lfo };
  }

  private stopShip(): void {
    if (!this.shipNodes) return;
    try {
      this.shipNodes.osc.stop();
      this.shipNodes.lfo.stop();
    } catch {
      // Déjà arrêtés.
    }
    this.shipNodes = null;
  }
}
