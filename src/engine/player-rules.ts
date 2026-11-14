import { RULES } from '../config/tuning';
import type { Family } from '../config/variations';
import type { ControlFrame, PlayerControls } from './types';

/**
 * Règles propres à chaque famille de parties (manuel Atari 2600) :
 * A solo, B alternance, C compétition, D tirs alternés,
 * E coopération gauche/droite, F contrôle alterné, G déplacement/tir séparés.
 */
export interface PlayerRules {
  readonly family: Family;
  /** Nombre de canons à l'écran. */
  readonly cannons: 1 | 2;
  /** Famille B : chaque joueur possède sa propre vague. */
  readonly worlds: 1 | 2;
  /** Un score par joueur ou un score commun. */
  readonly scoreCount: 1 | 2;
  /** Famille B : les joueurs jouent chacun leur tour. */
  readonly alternatingTurns: boolean;
  /** Famille D : un seul canon peut tirer à la fois. */
  readonly alternatingFire: boolean;
  /** Famille F : le contrôle complet change de joueur après chaque tir. */
  readonly alternatingControl: boolean;
  /** Famille E : le joueur gauche va à gauche, le joueur droit à droite. */
  readonly splitDirections: boolean;
  /** Famille G : le joueur gauche déplace, le joueur droit tire. */
  readonly splitRoles: boolean;
  /** Points donnés à l'adversaire d'un joueur touché (familles C et D). */
  readonly hitBonus: number;
  readonly commandShipValue: number;
}

export function rulesForFamily(family: Family): PlayerRules {
  const competition = family === 'C' || family === 'D';
  return Object.freeze({
    family,
    cannons: competition ? 2 : 1,
    worlds: family === 'B' ? 2 : 1,
    scoreCount: family === 'B' || competition ? 2 : 1,
    alternatingTurns: family === 'B',
    alternatingFire: family === 'D',
    alternatingControl: family === 'F',
    splitDirections: family === 'E',
    splitRoles: family === 'G',
    hitBonus: competition ? RULES.competitionHitBonus : 0,
    commandShipValue: competition ? RULES.competitionCommandShipValue : RULES.commandShipValue,
  });
}

export type Direction = -1 | 0 | 1;

export interface CannonCommand {
  move: Direction;
  fire: boolean;
}

export interface TurnContext {
  turn: number;
  shooter: number;
  controller: number;
}

/** Direction numérique d'un joystick ; gauche + droite s'annulent. */
export function axis(controls: PlayerControls): Direction {
  if (controls.left === controls.right) return 0;
  return controls.left ? -1 : 1;
}

/** Traduit les commandes des deux joueurs en ordres pour chaque canon, selon la famille. */
export function resolveCommands(rules: PlayerRules, frame: ControlFrame, context: TurnContext): CannonCommand[] {
  const [left, right] = frame.players;
  switch (rules.family) {
    case 'A':
      return [{ move: axis(left), fire: left.fire }];
    case 'B': {
      const active = context.turn === 0 ? left : right;
      return [{ move: axis(active), fire: active.fire }];
    }
    case 'C':
      return [
        { move: axis(left), fire: left.fire },
        { move: axis(right), fire: right.fire },
      ];
    case 'D':
      return [
        { move: axis(left), fire: left.fire && context.shooter === 0 },
        { move: axis(right), fire: right.fire && context.shooter === 1 },
      ];
    case 'E': {
      const toLeft = left.left ? -1 : 0;
      const toRight = right.right ? 1 : 0;
      return [{ move: (toLeft + toRight) as Direction, fire: left.fire || right.fire }];
    }
    case 'F': {
      const active = context.controller === 0 ? left : right;
      return [{ move: axis(active), fire: active.fire }];
    }
    case 'G':
      return [{ move: axis(left), fire: right.fire }];
  }
}
