import { describe, expect, it } from 'vitest';
import { displayScore, formatScore, scoreForRow } from '../src/engine/scoring';

describe('scores', () => {
  it('attribue 30 à 5 points du haut vers le bas', () => {
    expect(Array.from({ length: 6 }, (_, r) => scoreForRow(r))).toEqual([30, 25, 20, 15, 10, 5]);
  });

  it('vaut 630 points pour une vague complète', () => {
    const total = Array.from({ length: 6 }, (_, r) => scoreForRow(r)).reduce((sum, points) => sum + points * 6, 0);
    expect(total).toBe(630);
  });

  it('refuse une rangée hors de 0 à 5', () => {
    expect(() => scoreForRow(6)).toThrow(RangeError);
    expect(() => scoreForRow(-1)).toThrow(RangeError);
  });

  it('limite l’affichage à 9999', () => {
    expect(displayScore(10000)).toBe(9999);
    expect(formatScore(42)).toBe('0042');
    expect(formatScore(12345)).toBe('9999');
  });
});
