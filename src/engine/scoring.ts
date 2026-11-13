import { RULES } from '../config/tuning';

/** Points par rangée, du haut (rangée 0) vers le bas (rangée 5). */
export const ROW_POINTS = [30, 25, 20, 15, 10, 5] as const;

export function scoreForRow(row: number): number {
  const points = ROW_POINTS[row];
  if (!Number.isInteger(row) || points === undefined) {
    throw new RangeError(`Rangée invalide : ${row}`);
  }
  return points;
}

/** Le compteur Atari n'affiche que quatre chiffres. */
export function displayScore(score: number): number {
  return Math.min(Math.max(0, Math.floor(score)), RULES.maxDisplayScore);
}

export function formatScore(score: number): string {
  return String(displayScore(score)).padStart(4, '0');
}
