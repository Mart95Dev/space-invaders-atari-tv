import type { Rect } from './types';

/** Chevauchement strict de deux rectangles (des bords qui se touchent ne comptent pas). */
export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
