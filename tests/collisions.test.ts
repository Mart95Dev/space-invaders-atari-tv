import { describe, expect, it } from 'vitest';
import { overlap } from '../src/engine/collisions';
import { createShield, hitShield, isSolid, shieldOffset, solidCount } from '../src/entities/shields';

describe('collisions', () => {
  it('détecte un chevauchement strict', () => {
    expect(overlap({ x: 0, y: 0, w: 4, h: 4 }, { x: 3, y: 3, w: 2, h: 2 })).toBe(true);
    expect(overlap({ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 0, w: 2, h: 2 })).toBe(false);
  });
});

describe('boucliers', () => {
  it('un tir montant retire des pixels par le bas', () => {
    const shield = createShield(0, 100);
    const before = solidCount(shield);
    // Colonne 1 : pleine jusqu’en bas (rangée 9).
    expect(hitShield(shield, { x: 1, y: 105, w: 1, h: 6 }, 'up')).toBe(true);
    expect(isSolid(shield, 1, 9)).toBe(false);
    expect(isSolid(shield, 1, 2)).toBe(true);
    expect(solidCount(shield)).toBeLessThan(before);
  });

  it('une bombe descendante retire des pixels par le haut', () => {
    const shield = createShield(0, 100);
    expect(hitShield(shield, { x: 8, y: 97, w: 1, h: 4 }, 'down')).toBe(true);
    expect(isSolid(shield, 8, 0)).toBe(false);
    expect(isSolid(shield, 8, 6)).toBe(true);
  });

  it('laisse passer un tir dans l’arche', () => {
    const shield = createShield(0, 100);
    expect(hitShield(shield, { x: 8, y: 108, w: 1, h: 2 }, 'up')).toBe(false);
  });

  it('tient compte du décalage des boucliers mobiles', () => {
    const shield = createShield(0, 100);
    expect(hitShield(shield, { x: 1, y: 100, w: 1, h: 3 }, 'down', 10)).toBe(false);
    expect(hitShield(shield, { x: 11, y: 100, w: 1, h: 3 }, 'down', 10)).toBe(true);
  });

  it('fait osciller les boucliers mobiles seulement si l’option est active', () => {
    expect(shieldOffset(5, false)).toBe(0);
    const offsets = Array.from({ length: 100 }, (_, i) => shieldOffset(i * 0.1, true));
    expect(Math.min(...offsets)).toBeLessThan(0);
    expect(Math.max(...offsets)).toBeGreaterThan(0);
  });
});
