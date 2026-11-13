import { SHIELDS } from '../config/tuning';
import type { Rect, Shield } from '../engine/types';

const SHIELD_PATTERN = [
  '..XXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXX......XXXXX',
  'XXXX........XXXX',
  'XXXX........XXXX',
] as const;

export const SHIELD_WIDTH = 16;
export const SHIELD_HEIGHT = SHIELD_PATTERN.length;

/** Masques d'impact déterministes : le tir creuse dans son sens de déplacement. */
const MASK_UP: readonly (readonly [number, number])[] = [
  [0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, -2],
];
const MASK_DOWN: readonly (readonly [number, number])[] = MASK_UP.map(([dx, dy]) => [dx, -dy] as const);

export function createShield(x: number, y: number): Shield {
  const px = new Uint8Array(SHIELD_WIDTH * SHIELD_HEIGHT);
  SHIELD_PATTERN.forEach((line, row) => {
    for (let col = 0; col < SHIELD_WIDTH; col++) {
      px[row * SHIELD_WIDTH + col] = line[col] === 'X' ? 1 : 0;
    }
  });
  return { x, y, w: SHIELD_WIDTH, h: SHIELD_HEIGHT, px };
}

export function createShields(): Shield[] {
  return SHIELDS.centers.map(center => createShield(center - SHIELD_WIDTH / 2, SHIELDS.y));
}

export function isSolid(shield: Shield, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= shield.w || row >= shield.h) return false;
  return shield.px[row * shield.w + col] === 1;
}

export function solidCount(shield: Shield): number {
  let count = 0;
  for (const value of shield.px) count += value;
  return count;
}

/**
 * Teste un projectile contre un bouclier. Si un pixel est touché, retire le premier
 * pixel solide rencontré dans le sens du tir et son voisinage, puis retourne vrai.
 */
export function hitShield(shield: Shield, shot: Rect, direction: 'up' | 'down', offsetX = 0): boolean {
  const sx = shield.x + offsetX;
  if (shot.x + shot.w <= sx || shot.x >= sx + shield.w || shot.y + shot.h <= shield.y || shot.y >= shield.y + shield.h) {
    return false;
  }
  const c0 = Math.max(0, Math.floor(shot.x - sx));
  const c1 = Math.min(shield.w - 1, Math.ceil(shot.x + shot.w - sx) - 1);
  const r0 = Math.max(0, Math.floor(shot.y - shield.y));
  const r1 = Math.min(shield.h - 1, Math.ceil(shot.y + shot.h - shield.y) - 1);

  let hit: { col: number; row: number } | null = null;
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isSolid(shield, col, row)) continue;
      // Tir montant : premier pixel = le plus bas ; bombe descendante : le plus haut.
      if (!hit || (direction === 'up' ? row > hit.row : row < hit.row)) hit = { col, row };
    }
  }
  if (!hit) return false;

  for (const [dx, dy] of direction === 'up' ? MASK_UP : MASK_DOWN) {
    const col = hit.col + dx;
    const row = hit.row + dy;
    if (col >= 0 && row >= 0 && col < shield.w && row < shield.h) shield.px[row * shield.w + col] = 0;
  }
  return true;
}

/** Décalage horizontal des boucliers mobiles (aller-retour régulier). */
export function shieldOffset(time: number, moving: boolean): number {
  if (!moving) return 0;
  const span = SHIELDS.moveAmplitude * 2;
  const distance = (time * SHIELDS.moveSpeed) % (span * 2);
  const position = distance < span ? distance : span * 2 - distance;
  return Math.round(position - SHIELDS.moveAmplitude);
}
