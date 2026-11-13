/**
 * Matrice officielle des 112 parties de Space Invaders sur Atari 2600 (manuel de 1980).
 *
 * Les parties sont regroupées en 7 familles de 16 numéros. Dans chaque famille,
 * les quatre options de jeu suivent les quatre bits de l'index de variante.
 */

export type Family = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Variation {
  readonly gameNumber: number;
  readonly family: Family;
  readonly playerCount: 1 | 2;
  readonly movingShields: boolean;
  readonly zigzagBombs: boolean;
  readonly fastBombs: boolean;
  readonly invisibleInvaders: boolean;
}

export const FIRST_GAME = 1;
export const LAST_GAME = 112;
export const VARIANTS_PER_FAMILY = 16;

export const FAMILIES: readonly Family[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function getVariation(gameNumber: number): Variation {
  if (!Number.isInteger(gameNumber) || gameNumber < FIRST_GAME || gameNumber > LAST_GAME) {
    throw new RangeError(`Le numéro de partie doit être un entier entre ${FIRST_GAME} et ${LAST_GAME}.`);
  }
  const index = gameNumber - 1;
  const variant = index % VARIANTS_PER_FAMILY;
  const family = FAMILIES[Math.floor(index / VARIANTS_PER_FAMILY)] ?? 'A';
  return Object.freeze({
    gameNumber,
    family,
    playerCount: family === 'A' ? 1 : 2,
    movingShields: (variant & 1) !== 0,
    zigzagBombs: (variant & 2) !== 0,
    fastBombs: (variant & 4) !== 0,
    invisibleInvaders: (variant & 8) !== 0,
  });
}

/** Premier numéro de partie d'une famille (A → 1, B → 17…). */
export function firstGameOfFamily(family: Family): number {
  return FAMILIES.indexOf(family) * VARIANTS_PER_FAMILY + 1;
}
