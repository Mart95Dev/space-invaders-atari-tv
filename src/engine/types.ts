import type { Variation } from '../config/variations';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Difficulty = 'A' | 'B';

export interface PlayerControls {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface ControlFrame {
  players: readonly [PlayerControls, PlayerControls];
}

export const EMPTY_CONTROLS: PlayerControls = Object.freeze({ left: false, right: false, fire: false });
export const IDLE_FRAME: ControlFrame = Object.freeze({ players: [EMPTY_CONTROLS, EMPTY_CONTROLS] as const });

export interface Invader {
  row: number;
  col: number;
  alive: boolean;
}

export interface InvaderGrid {
  x: number;
  y: number;
  dir: 1 | -1;
  stepTimer: number;
  frame: 0 | 1;
  march: number;
}

export interface Shield {
  /** Position de base, avant le décalage des boucliers mobiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  px: Uint8Array;
}

export type ProjectileKind = 'beam' | 'bomb';

export interface Projectile {
  kind: ProjectileKind;
  /** Canon propriétaire d'un tir (0 ou 1), -1 pour une bombe. */
  owner: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  /** Bombes en zigzag : position centrale et phase d'oscillation. */
  zigzag: { baseX: number; phase: number } | null;
}

export interface Cannon {
  index: number;
  /** Joueur dont la couleur et la difficulté s'appliquent (0 = gauche, 1 = droite). */
  player: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CommandShip {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
}

export interface Explosion {
  kind: 'invader' | 'ship' | 'cannon';
  x: number;
  y: number;
  w: number;
  timer: number;
  label: string | null;
}

/** Monde de jeu : une vague d'envahisseurs avec ses boucliers. La famille B en utilise deux. */
export interface World {
  wave: number;
  invaders: Invader[];
  grid: InvaderGrid;
  shields: Shield[];
  shieldsGone: boolean;
  shieldTime: number;
  projectiles: Projectile[];
  commandShip: CommandShip | null;
  commandShipTimer: number;
  bombTimer: number;
  revealTimer: number;
  explosions: Explosion[];
}

export type GameStatus =
  | 'ready'
  | 'playing'
  | 'paused'
  | 'player-hit'
  | 'wave-cleared'
  | 'turn-change'
  | 'game-over';

export type GameEvent =
  | { type: 'fire' }
  | { type: 'march'; step: number }
  | { type: 'invader-hit' }
  | { type: 'shield-hit' }
  | { type: 'cannon-hit'; player: number }
  | { type: 'ship-appear' }
  | { type: 'ship-gone' }
  | { type: 'ship-hit'; points: number }
  | { type: 'wave-cleared' }
  | { type: 'turn-change'; player: number }
  | { type: 'game-over' };

export interface GameState {
  variation: Variation;
  difficulties: [Difficulty, Difficulty];
  status: GameStatus;
  /** Statut à restaurer à la reprise après une pause. */
  pausedStatus: GameStatus | null;
  statusTimer: number;
  worlds: World[];
  activeWorld: number;
  cannons: Cannon[];
  /** Un score par joueur (familles B, C, D) ou un score commun. */
  scores: number[];
  /** Impacts restants : par joueur (B) ou partagés (autres familles). */
  hits: number[];
  /** Famille B : joueur dont c'est le tour. */
  turn: number;
  /** Famille D : canon autorisé à tirer. */
  shooter: number;
  shooterTimer: number;
  /** Famille F : joueur qui contrôle le canon commun. */
  controller: number;
  invaded: boolean;
  /** Dernier joueur touché (pour l'animation d'explosion du canon). */
  hitCannon: number | null;
  winner: number | 'tie' | null;
  time: number;
  events: GameEvent[];
}
