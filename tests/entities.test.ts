import { describe, expect, it } from 'vitest';
import { createInvaders, createGrid, stepGrid, stepInterval, waveStartY } from '../src/entities/invaders';
import { createShields } from '../src/entities/shields';
import { createBomb, moveProjectile } from '../src/entities/projectiles';
import { cannonWidth } from '../src/entities/cannons';

describe('entités', () => {
  it('crée 36 envahisseurs en 6 × 6 et trois boucliers', () => {
    const invaders = createInvaders();
    expect(invaders).toHaveLength(36);
    expect(invaders[0]).toMatchObject({ row: 0, col: 0 });
    expect(invaders[35]).toMatchObject({ row: 5, col: 5 });
    expect(createShields()).toHaveLength(3);
  });

  it('accélère de façon exponentielle quand les envahisseurs disparaissent', () => {
    expect(stepInterval(35, 1)).toBeLessThan(stepInterval(36, 1));
    expect(stepInterval(1, 1)).toBeLessThan(stepInterval(2, 1));
    expect(stepInterval(36, 3)).toBeLessThan(stepInterval(36, 1));
  });

  it('fait démarrer les vagues plus bas, jusqu’à une limite', () => {
    expect(waveStartY(2)).toBeGreaterThan(waveStartY(1));
    expect(waveStartY(50)).toBe(waveStartY(20));
  });

  it('descend et repart dans l’autre sens au bord', () => {
    const grid = createGrid(1);
    const invaders = createInvaders();
    let descended = false;
    for (let i = 0; i < 100 && !descended; i++) descended = stepGrid(grid, invaders);
    expect(descended).toBe(true);
    expect(grid.dir).toBe(-1);
    expect(grid.y).toBeGreaterThan(waveStartY(1));
  });

  it('combine bombes rapides et en zigzag', () => {
    const bomb = createBomb(50, 0, true, true);
    const xs = new Set<number>();
    for (let i = 0; i < 30; i++) {
      moveProjectile(bomb, 1 / 60);
      xs.add(bomb.x);
    }
    expect(bomb.y).toBeCloseTo(75, 0);
    expect(xs.size).toBeGreaterThan(1);
  });

  it('double la largeur du canon en difficulté A', () => {
    expect(cannonWidth('A')).toBe(cannonWidth('B') * 2);
  });
});
