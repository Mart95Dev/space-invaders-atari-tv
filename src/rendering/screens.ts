import { getVariation, type Family } from '../config/variations';
import type { GameSnapshot } from '../engine/game';
import type { Difficulty } from '../engine/types';
import { PALETTE } from './palette';

export interface Line {
  text: string;
  color: string;
}

export interface SelectionView {
  gameNumber: number;
  difficulties: readonly [Difficulty, Difficulty];
  /** Nombre de manettes affectées aux joueurs. */
  padCount: number;
  /** Message non bloquant (plein écran refusé, etc.). */
  notice: string | null;
}

export type Overlay =
  | { kind: 'paused' }
  | { kind: 'quit-confirm' }
  | { kind: 'pad-lost'; player: number };

export type View =
  | { screen: 'boot' }
  | { screen: 'selection'; preview: GameSnapshot; selection: SelectionView }
  | { screen: 'matrix'; selection: SelectionView }
  | { screen: 'game'; game: GameSnapshot; overlay: Overlay | null; selection: SelectionView };

export const FAMILY_LABELS: Record<Family, string> = {
  A: '1 JOUEUR',
  B: '2 JOUEURS - CHACUN SON TOUR',
  C: '2 JOUEURS - EN MEME TEMPS',
  D: '2 JOUEURS - TIRS ALTERNES',
  E: 'EQUIPE - J1 GAUCHE, J2 DROITE',
  F: 'EQUIPE - CONTROLE ALTERNE',
  G: 'EQUIPE - J1 BOUGE, J2 TIRE',
};

const MATRIX_LABELS: Record<Family, string> = {
  A: 'SOLO',
  B: 'CHACUN SON TOUR',
  C: 'COMPETITION',
  D: 'COMPETITION, TIRS ALTERNES',
  E: 'EQUIPE GAUCHE/DROITE',
  F: 'EQUIPE, CONTROLE ALTERNE',
  G: 'EQUIPE, BOUGE/TIRE',
};

const yesNo = (value: boolean): string => (value ? 'OUI' : 'NON');

function option(label: string, value: boolean): Line {
  return { text: `${label.padEnd(19)}${yesNo(value)}`, color: value ? PALETTE.highlight : PALETTE.dim };
}

export function selectionLines(selection: SelectionView): Line[] {
  const variation = getVariation(selection.gameNumber);
  const [left, right] = selection.difficulties;
  const twoPlayers = variation.playerCount === 2;
  const lines: Line[] = [
    { text: `PARTIE ${variation.gameNumber}  FAMILLE ${variation.family}`, color: PALETTE.text },
    { text: FAMILY_LABELS[variation.family], color: PALETTE.player1 },
    option('BOUCLIERS MOBILES', variation.movingShields),
    option('BOMBES EN ZIGZAG', variation.zigzagBombs),
    option('BOMBES RAPIDES', variation.fastBombs),
    option('INVISIBLES', variation.invisibleInvaders),
    { text: twoPlayers ? `CANON J1:${left}  J2:${right}` : `CANON ${left === 'A' ? 'LARGE (A)' : 'NORMAL (B)'}`, color: PALETTE.text },
  ];
  if (twoPlayers && selection.padCount < 2) {
    lines.push({ text: 'MANETTE 2 ABSENTE: J2 = J L K', color: PALETTE.player2 });
  } else {
    lines.push({ text: '< > PARTIE   X/1/2 CANON', color: PALETTE.dim });
  }
  lines.push({ text: 'START JOUER   Y/M MATRICE', color: PALETTE.dim });
  return lines;
}

export function matrixLines(gameNumber: number): Line[] {
  const current = getVariation(gameNumber);
  const lines: Line[] = [{ text: 'MATRICE DES 112 PARTIES', color: PALETTE.text }];
  (Object.keys(MATRIX_LABELS) as Family[]).forEach((family, index) => {
    const first = index * 16 + 1;
    const range = `${first}-${first + 15}`.padStart(7);
    lines.push({
      text: `${family}${range}  ${MATRIX_LABELS[family]}`,
      color: family === current.family ? PALETTE.highlight : PALETTE.dim,
    });
  });
  const bits = (bit: number) => Array.from({ length: 16 }, (_, v) => ((v & bit) !== 0 ? 'X' : '.')).join('');
  lines.push(
    { text: '', color: PALETTE.dim },
    { text: `VARIANTE  ${Array.from({ length: 16 }, (_, v) => String((v + 1) % 10)).join('')}`, color: PALETTE.text },
    { text: `MOBILES   ${bits(1)}`, color: PALETTE.dim },
    { text: `ZIGZAG    ${bits(2)}`, color: PALETTE.dim },
    { text: `RAPIDES   ${bits(4)}`, color: PALETTE.dim },
    { text: `INVISIB.  ${bits(8)}`, color: PALETTE.dim },
    { text: '', color: PALETTE.dim },
    { text: 'J1: FLECHES/Q D  ESPACE', color: PALETTE.player1 },
    { text: 'J2: J L  K', color: PALETTE.player2 },
    { text: 'START PAUSE  TAB/SELECT MENU', color: PALETTE.dim },
    { text: 'F PLEIN ECRAN  ECHAP RETOUR', color: PALETTE.dim },
  );
  return lines;
}

/** Colonne de la variante courante dans la grille de la matrice (0 à 15). */
export function matrixColumn(gameNumber: number): number {
  return (gameNumber - 1) % 16;
}

export function overlayLines(overlay: Overlay): Line[] {
  switch (overlay.kind) {
    case 'paused':
      return [
        { text: 'PAUSE', color: PALETTE.text },
        { text: 'START: REPRENDRE', color: PALETTE.dim },
        { text: 'SELECT: CHOIX DE PARTIE', color: PALETTE.dim },
      ];
    case 'quit-confirm':
      return [
        { text: 'RETOUR AU CHOIX DE PARTIE ?', color: PALETTE.text },
        { text: 'START: OUI', color: PALETTE.highlight },
        { text: 'A / ECHAP: NON', color: PALETTE.dim },
      ];
    case 'pad-lost':
      return [
        { text: `MANETTE ${overlay.player + 1} DECONNECTEE`, color: PALETTE.highlight },
        { text: 'RECONNECTEZ-LA', color: PALETTE.text },
        { text: 'PUIS START', color: PALETTE.dim },
      ];
  }
}

export function statusLines(game: GameSnapshot): Line[] | null {
  if (game.status === 'turn-change') {
    return [
      { text: `JOUEUR ${game.turn + 1}`, color: game.turn === 0 ? PALETTE.player1 : PALETTE.player2 },
      { text: 'A VOUS DE JOUER', color: PALETTE.text },
    ];
  }
  if (game.status !== 'game-over') return null;
  const lines: Line[] = [{ text: 'FIN DE PARTIE', color: PALETTE.text }];
  if (game.invaded) lines.push({ text: 'LA TERRE EST ENVAHIE', color: PALETTE.highlight });
  if (game.winner === 'tie') lines.push({ text: 'EGALITE', color: PALETTE.text });
  else if (game.winner !== null) {
    lines.push({ text: `JOUEUR ${game.winner + 1} GAGNE`, color: game.winner === 0 ? PALETTE.player1 : PALETTE.player2 });
  }
  lines.push(
    { text: 'START: REJOUER', color: PALETTE.dim },
    { text: 'SELECT: CHOIX DE PARTIE', color: PALETTE.dim },
  );
  return lines;
}
