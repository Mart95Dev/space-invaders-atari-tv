/**
 * Motifs pixel des sprites, reconstruits localement dans l'esprit de la cartouche Atari
 * (aucune donnée extraite d'une ROM). « X » = pixel allumé.
 */

export type Pattern = readonly string[];

/** Six envahisseurs différents (un par rangée, du haut vers le bas), deux images chacun. */
export const INVADER_SPRITES: readonly (readonly [Pattern, Pattern])[] = [
  [
    ['...XX...', '..XXXX..', '.XX..XX.', 'XXXXXXXX', '..X..X..', '.X.XX.X.', 'X.X..X.X'],
    ['...XX...', '..XXXX..', '.XX..XX.', 'XXXXXXXX', '.X.XX.X.', 'X......X', '.X....X.'],
  ],
  [
    ['X......X', '.X.XX.X.', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X....X.'],
    ['........', 'X.X..X.X', 'XXXXXXXX', 'XX.XX.XX', '.XXXXXX.', '..X..X..', 'X......X'],
  ],
  [
    ['..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.', '..X..X..'],
    ['..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X', 'X......X'],
  ],
  [
    ['.X....X.', '..XXXX..', '.XXXXXX.', 'X.X..X.X', 'XXXXXXXX', 'X.XXXX.X', '..X..X..'],
    ['.X....X.', 'X.XXXX.X', 'XXXXXXXX', 'X.X..X.X', '.XXXXXX.', '..X..X..', '.X....X.'],
  ],
  [
    ['...XX...', '.XXXXXX.', 'XXXXXXXX', 'X..XX..X', 'XXXXXXXX', '..X..X..', '.X.XX.X.'],
    ['...XX...', '.XXXXXX.', 'XXXXXXXX', 'X..XX..X', 'XXXXXXXX', '.X.XX.X.', 'X......X'],
  ],
  [
    ['X.XXXX.X', 'XXXXXXXX', 'XX.XX.XX', '.XXXXXX.', '..X..X..', '.X....X.', 'X......X'],
    ['..XXXX..', 'XXXXXXXX', 'XX.XX.XX', '.XXXXXX.', '.X.XX.X.', 'X......X', '.X....X.'],
  ],
];

export const CANNON_SPRITE: Pattern = [
  '...XX...',
  '...XX...',
  '.XXXXXX.',
  'XXXXXXXX',
  'XXXXXXXX',
  'XXXXXXXX',
];

export const CANNON_DEBRIS: readonly [Pattern, Pattern] = [
  ['X..X..X.', '..X..X.X', '.X.XX...', 'X.XXXX.X', '.XXXXXX.', 'XXXXXXXX'],
  ['.X....X.', 'X..X.X..', '..X..X.X', '.XX.XX..', 'XXXXXXX.', '.XXXXXXX'],
];

export const COMMAND_SHIP_SPRITE: Pattern = [
  '...XXXXXX...',
  '.XXXXXXXXXX.',
  'XX.XX..XX.XX',
  'XXXXXXXXXXXX',
  '..X......X..',
];

export const EXPLOSION_SPRITE: Pattern = [
  'X..XX..X',
  '.X....X.',
  '..X..X..',
  'XX....XX',
  '..X..X..',
  '.X....X.',
  'X..XX..X',
];

/** Double chaque pixel horizontalement (canon de la difficulté A). */
export function widen(pattern: Pattern): Pattern {
  return pattern.map(line => [...line].map(c => c + c).join(''));
}

export interface Run {
  x: number;
  y: number;
  length: number;
}

const runCache = new Map<Pattern, readonly Run[]>();

/** Convertit un motif en segments horizontaux pour limiter les appels de dessin. */
export function patternRuns(pattern: Pattern): readonly Run[] {
  const cached = runCache.get(pattern);
  if (cached) return cached;
  const runs: Run[] = [];
  pattern.forEach((line, y) => {
    let start = -1;
    for (let x = 0; x <= line.length; x++) {
      const on = line[x] === 'X';
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push({ x: start, y, length: x - start });
        start = -1;
      }
    }
  });
  runCache.set(pattern, runs);
  return runs;
}
