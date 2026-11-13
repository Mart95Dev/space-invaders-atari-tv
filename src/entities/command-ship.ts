import { COMMAND_SHIP, FIELD } from '../config/tuning';
import type { CommandShip } from '../engine/types';

export function createCommandShip(dir: 1 | -1): CommandShip {
  return {
    x: dir === 1 ? -COMMAND_SHIP.width : FIELD.width,
    y: COMMAND_SHIP.y,
    w: COMMAND_SHIP.width,
    h: COMMAND_SHIP.height,
    dir,
  };
}

/** Avance le vaisseau ; retourne faux quand il a quitté l'écran. */
export function moveCommandShip(ship: CommandShip, dt: number): boolean {
  ship.x += ship.dir * COMMAND_SHIP.speed * dt;
  return ship.x > -ship.w - 1 && ship.x < FIELD.width + 1;
}
