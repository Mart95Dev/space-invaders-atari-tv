/**
 * Réglages centralisés du jeu (unités logiques : terrain de 160 × 192, temps en secondes).
 * Les valeurs s'inspirent du comportement de la cartouche Atari 2600,
 * pas de la borne d'arcade.
 */

export const FIELD = {
  width: 160,
  height: 192,
  /** Limites horizontales jouables (bordures noires de l'Atari). */
  minX: 8,
  maxX: 152,
} as const;

export const STEP = 1 / 60;

export const INVADERS = {
  rows: 6,
  cols: 6,
  width: 8,
  height: 7,
  cellWidth: 16,
  cellHeight: 12,
  startX: 36,
  startY: 30,
  /** Chaque vague suivante démarre plus bas, jusqu'à cette limite. */
  waveDrop: 6,
  maxStartY: 60,
  stepX: 2,
  stepY: 6,
  /** Intervalle entre deux pas avec 36 envahisseurs, puis facteur appliqué par envahisseur détruit. */
  baseStepInterval: 0.55,
  killFactor: 0.925,
  waveFactor: 0.92,
  minWaveFactor: 0.6,
  minStepInterval: 1 / 60,
  /** Durée de révélation des envahisseurs invisibles après un impact. */
  revealTime: 0.45,
  /** Révélation au début d'une vague avant qu'ils ne disparaissent. */
  waveRevealTime: 1.5,
} as const;

export const SHIELDS = {
  count: 3,
  y: 148,
  centers: [40, 80, 120],
  /** Amplitude et vitesse des boucliers mobiles. */
  moveAmplitude: 10,
  moveSpeed: 12,
} as const;

export const CANNON = {
  y: 166,
  height: 6,
  widthB: 8,
  widthA: 16,
  speed: 60,
  soloStartX: 20,
  leftStartX: 24,
  rightStartX: 128,
} as const;

export const GROUND_Y = 174;

export const BEAM = {
  width: 1,
  height: 5,
  speed: 180,
  topLimit: 14,
} as const;

export const BOMBS = {
  width: 1,
  height: 4,
  speed: 75,
  fastSpeed: 150,
  maxActive: 2,
  minDelay: 0.45,
  maxDelay: 1.3,
  /** Probabilité de choisir la colonne la plus proche d'un canon. */
  aimChance: 0.5,
  zigzagAmplitude: 2,
  zigzagFrequency: 5,
} as const;

export const COMMAND_SHIP = {
  y: 18,
  width: 12,
  height: 5,
  speed: 30,
  minDelay: 12,
  maxDelay: 20,
} as const;

export const RULES = {
  hits: 3,
  hitPause: 1.5,
  waveClearedPause: 1.5,
  turnChangePause: 1.8,
  /** Famille D : délai avant le tir automatique (le manuel ne précise pas de valeur). */
  autoFireDelay: 3,
  competitionHitBonus: 200,
  commandShipValue: 200,
  competitionCommandShipValue: 100,
  maxDisplayScore: 9999,
} as const;
