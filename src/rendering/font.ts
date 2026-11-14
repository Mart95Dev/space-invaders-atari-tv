/** Police pixel 3 × 5 (majuscules, chiffres et ponctuation utile), dessinée sans lissage. */
export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;
export const GLYPH_ADVANCE = 4;

const GLYPHS: Record<string, readonly string[]> = {
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  C: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  G: ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..X', '..X', '..X', 'X.X', '.X.'],
  K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  N: ['XXX', 'X.X', 'X.X', 'X.X', 'X.X'],
  O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  Q: ['.X.', 'X.X', 'X.X', 'XX.', '.XX'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  W: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'],
  X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  '0': ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XX.', '..X', '.X.', 'X..', 'XXX'],
  '3': ['XX.', '..X', '.X.', '..X', 'XX.'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XX.', '..X', 'XX.'],
  '6': ['.XX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XX.'],
  ':': ['...', '.X.', '...', '.X.', '...'],
  '-': ['...', '...', 'XXX', '...', '...'],
  '.': ['...', '...', '...', '...', '.X.'],
  ',': ['...', '...', '...', '.X.', 'X..'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '!': ['.X.', '.X.', '.X.', '...', '.X.'],
  '(': ['..X', '.X.', '.X.', '.X.', '..X'],
  ')': ['X..', '.X.', '.X.', '.X.', 'X..'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '=': ['...', 'XXX', '...', 'XXX', '...'],
  '<': ['..X', '.X.', 'X..', '.X.', '..X'],
  '>': ['X..', '.X.', '..X', '.X.', 'X..'],
  "'": ['.X.', '.X.', '...', '...', '...'],
  ' ': ['...', '...', '...', '...', '...'],
};

/** Retire les accents (É → E) et passe en majuscules, la police n'ayant que l'ASCII. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function glyph(char: string): readonly string[] {
  return GLYPHS[char] ?? GLYPHS['?'] ?? [];
}

export function textWidth(text: string, scale = 1): number {
  const length = normalizeText(text).length;
  return length === 0 ? 0 : (length * GLYPH_ADVANCE - 1) * scale;
}
