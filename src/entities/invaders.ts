import { FIELD, INVADERS } from '../config/tuning';
import type { Invader, InvaderGrid, Rect } from '../engine/types';

/** Crée les 36 envahisseurs, rangées dans l'ordre haut → bas. */
export function createInvaders(): Invader[] {
  const invaders: Invader[] = [];
  for (let row = 0; row < INVADERS.rows; row++) {
    for (let col = 0; col < INVADERS.cols; col++) {
      invaders.push({ row, col, alive: true });
    }
  }
  return invaders;
}

export function waveStartY(wave: number): number {
  return Math.min(INVADERS.startY + (wave - 1) * INVADERS.waveDrop, INVADERS.maxStartY);
}

export function createGrid(wave: number): InvaderGrid {
  return { x: INVADERS.startX, y: waveStartY(wave), dir: 1, stepTimer: 0, frame: 0, march: 0 };
}

export function invaderRect(grid: InvaderGrid, invader: Invader): Rect {
  return {
    x: grid.x + invader.col * INVADERS.cellWidth,
    y: grid.y + invader.row * INVADERS.cellHeight,
    w: INVADERS.width,
    h: INVADERS.height,
  };
}

export function countAlive(invaders: readonly Invader[]): number {
  let alive = 0;
  for (const invader of invaders) if (invader.alive) alive++;
  return alive;
}

/**
 * Intervalle entre deux pas : décroissance exponentielle selon le nombre
 * d'envahisseurs détruits, plus rapide à chaque vague. Le dernier survivant est le plus rapide.
 */
export function stepInterval(alive: number, wave: number): number {
  const killed = INVADERS.rows * INVADERS.cols - alive;
  const waveFactor = Math.max(INVADERS.minWaveFactor, Math.pow(INVADERS.waveFactor, wave - 1));
  const interval = INVADERS.baseStepInterval * Math.pow(INVADERS.killFactor, killed) * waveFactor;
  return Math.max(INVADERS.minStepInterval, interval);
}

export interface Bounds {
  left: number;
  right: number;
  bottom: number;
}

export function aliveBounds(grid: InvaderGrid, invaders: readonly Invader[]): Bounds | null {
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const invader of invaders) {
    if (!invader.alive) continue;
    const r = invaderRect(grid, invader);
    left = Math.min(left, r.x);
    right = Math.max(right, r.x + r.w);
    bottom = Math.max(bottom, r.y + r.h);
  }
  return left === Infinity ? null : { left, right, bottom };
}

/**
 * Avance la formation d'un pas : latéralement, ou descente et demi-tour au bord.
 * Retourne vrai si la formation est descendue.
 */
export function stepGrid(grid: InvaderGrid, invaders: readonly Invader[]): boolean {
  const bounds = aliveBounds(grid, invaders);
  grid.frame = grid.frame === 0 ? 1 : 0;
  grid.march = (grid.march + 1) % 4;
  if (!bounds) return false;
  const dx = grid.dir * INVADERS.stepX;
  if (bounds.right + dx > FIELD.maxX || bounds.left + dx < FIELD.minX) {
    grid.y += INVADERS.stepY;
    grid.dir = grid.dir === 1 ? -1 : 1;
    return true;
  }
  grid.x += dx;
  return false;
}
