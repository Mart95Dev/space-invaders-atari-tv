import { BEAM, BOMBS } from '../config/tuning';
import type { Projectile } from '../engine/types';

export function createBeam(owner: number, centerX: number, top: number): Projectile {
  return {
    kind: 'beam',
    owner,
    x: Math.round(centerX),
    y: top - BEAM.height,
    w: BEAM.width,
    h: BEAM.height,
    vy: -BEAM.speed,
    zigzag: null,
  };
}

export function createBomb(centerX: number, top: number, fast: boolean, zigzag: boolean): Projectile {
  const x = Math.round(centerX);
  return {
    kind: 'bomb',
    owner: -1,
    x,
    y: top,
    w: BOMBS.width,
    h: BOMBS.height,
    vy: fast ? BOMBS.fastSpeed : BOMBS.speed,
    zigzag: zigzag ? { baseX: x, phase: 0 } : null,
  };
}

/** Déplace un projectile ; les bombes en zigzag oscillent autour de leur axe. */
export function moveProjectile(p: Projectile, dt: number): void {
  p.y += p.vy * dt;
  if (p.zigzag) {
    p.zigzag.phase += dt * BOMBS.zigzagFrequency;
    const t = p.zigzag.phase % 1;
    const wave = t < 0.5 ? t * 4 - 1 : 3 - t * 4;
    p.x = p.zigzag.baseX + Math.round(wave * BOMBS.zigzagAmplitude);
  }
}
