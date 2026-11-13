import { describe, expect, it } from 'vitest';
import { getVariation } from '../src/config/variations';

describe('matrice Atari', () => {
  it('couvre exactement 112 parties et sept familles', () => {
    const all = Array.from({ length: 112 }, (_, i) => getVariation(i + 1));
    expect(new Set(all.map(v => v.family)).size).toBe(7);
    expect(all[0]).toMatchObject({ family: 'A', playerCount: 1, movingShields: false });
    expect(all[111]).toMatchObject({ gameNumber: 112, family: 'G', invisibleInvaders: true });
    for (const family of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(all.filter(v => v.family === family)).toHaveLength(16);
    }
  });

  it.each([
    [1, false, false, false, false],
    [2, true, false, false, false],
    [3, false, true, false, false],
    [5, false, false, true, false],
    [9, false, false, false, true],
    [16, true, true, true, true],
    [34, true, false, false, false],
  ])('résout la partie %i', (n, moving, zigzag, fast, invisible) => {
    expect(getVariation(n)).toMatchObject({
      movingShields: moving,
      zigzagBombs: zigzag,
      fastBombs: fast,
      invisibleInvaders: invisible,
    });
  });

  it('attribue deux joueurs aux familles B à G', () => {
    expect(getVariation(16).playerCount).toBe(1);
    expect(getVariation(17).playerCount).toBe(2);
    expect(getVariation(112).playerCount).toBe(2);
  });

  it.each([0, 113, -1, 1.5, Number.NaN])('refuse %s', n => {
    expect(() => getVariation(n)).toThrow(RangeError);
  });
});
