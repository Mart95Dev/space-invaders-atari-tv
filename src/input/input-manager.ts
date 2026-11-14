import type { InputSnapshot } from './actions';
import { mergeControls } from './actions';
import { GamepadManager } from './gamepads';
import { Keyboard } from './keyboard';

/** Fusionne clavier et manettes en un seul relevé par image. */
export class InputManager {
  constructor(
    private readonly keyboard: Keyboard,
    readonly gamepads: GamepadManager,
  ) {}

  poll(): InputSnapshot {
    const keys = this.keyboard.poll();
    const pads = this.gamepads.poll();
    return {
      controls: {
        players: [mergeControls(keys.players[0], pads.players[0]), mergeControls(keys.players[1], pads.players[1])],
      },
      pressed: new Set([...keys.pressed, ...pads.pressed]),
      held: new Set([...keys.held, ...pads.held]),
      pads: pads.pads,
      lost: pads.lost,
      anyInput: keys.anyInput || pads.anyInput,
    };
  }
}
