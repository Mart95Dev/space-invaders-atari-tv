import { CANNON, FIELD } from '../config/tuning';
import type { Cannon, Difficulty } from '../engine/types';

export function cannonWidth(difficulty: Difficulty): number {
  return difficulty === 'A' ? CANNON.widthA : CANNON.widthB;
}

export function createCannon(index: number, player: number, x: number, difficulty: Difficulty): Cannon {
  return { index, player, x, y: CANNON.y, w: cannonWidth(difficulty), h: CANNON.height };
}

export function moveCannon(cannon: Cannon, direction: -1 | 0 | 1, dt: number): void {
  cannon.x = Math.min(FIELD.maxX - cannon.w, Math.max(FIELD.minX, cannon.x + direction * CANNON.speed * dt));
}
