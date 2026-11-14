import { Game, type GameOptions } from '../src/engine/game';
import { invaderRect } from '../src/entities/invaders';
import { createBeam, createBomb } from '../src/entities/projectiles';
import { EMPTY_CONTROLS, IDLE_FRAME, type ControlFrame, type PlayerControls } from '../src/engine/types';

export const DT = 1 / 60;

export function controls(partial: Partial<PlayerControls> = {}): PlayerControls {
  return { ...EMPTY_CONTROLS, ...partial };
}

export function frame(left: Partial<PlayerControls> = {}, right: Partial<PlayerControls> = {}): ControlFrame {
  return { players: [controls(left), controls(right)] };
}

/** Partie démarrée sans bombes ni vaisseau aléatoires, pour des tests déterministes. */
export function calmGame(gameNumber: number, options: GameOptions = {}): Game {
  const game = new Game(gameNumber, { seed: 42, ...options });
  calm(game);
  game.start();
  return game;
}

export function calm(game: Game): void {
  for (const world of game.state.worlds) {
    world.bombTimer = 1e9;
    world.commandShipTimer = 1e9;
  }
}

export function run(game: Game, seconds: number, input: ControlFrame = IDLE_FRAME): void {
  game.update(seconds, input);
}

/** Place un tir du canon `owner` juste sous un envahisseur vivant, qui sera touché à la prochaine image. */
export function shootInvader(game: Game, owner = 0, row = 5, col = 0): void {
  const world = game.world;
  const invader = world.invaders.find(i => i.row === row && i.col === col && i.alive);
  if (!invader) throw new Error('Envahisseur absent');
  const rect = invaderRect(world.grid, invader);
  const beam = createBeam(owner, rect.x + 4, rect.y + rect.h + 6);
  world.projectiles.push(beam);
}

/** Place une bombe juste au-dessus d'un canon. */
export function bombCannon(game: Game, index = 0): void {
  const cannon = game.state.cannons[index];
  if (!cannon) throw new Error('Canon absent');
  game.world.projectiles.push(createBomb(cannon.x + cannon.w / 2, cannon.y - 3, false, false));
}

/** Touche un canon et laisse passer la pause d'impact. */
export function loseHit(game: Game, index = 0): void {
  bombCannon(game, index);
  run(game, DT);
  run(game, 2);
}
