import { EMPTY_CONTROLS, type PlayerControls } from '../engine/types';
import type { Action } from './actions';

export const DEADZONE = 0.4;

/** Boutons de la disposition « standard » de la Gamepad API (Xbox / PlayStation). */
const BUTTON = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4,
  rb: 5,
  select: 8,
  start: 9,
  left: 14,
  right: 15,
} as const;

export type GamepadSource = () => ReadonlyArray<Gamepad | null>;

export interface GamepadPoll {
  players: [PlayerControls, PlayerControls];
  pressed: Set<Action>;
  held: Set<Action>;
  pads: [string | null, string | null];
  lost: number[];
  anyInput: boolean;
}

function isPressed(pad: Gamepad, index: number): boolean {
  const button = pad.buttons[index];
  return !!button && (button.pressed || button.value > 0.5);
}

/** Croix des joysticks non standard, souvent exposée sur l'axe 9 en valeurs discrètes. */
function hatDirection(pad: Gamepad): -1 | 0 | 1 {
  if (pad.mapping === 'standard' || pad.axes.length < 10) return 0;
  const value = pad.axes[9] ?? 2;
  if (Math.abs(value) > 1.01) return 0;
  const index = Math.round((value + 1) * 3.5) % 8;
  if (index >= 1 && index <= 3) return 1;
  if (index >= 5 && index <= 7) return -1;
  return 0;
}

/** Convertit une manette en commandes numériques, comme le joystick Atari. */
export function padControls(pad: Gamepad): PlayerControls {
  const standard = pad.mapping === 'standard';
  const x = pad.axes[0] ?? 0;
  const hat = hatDirection(pad);
  const left = x < -DEADZONE || (standard && isPressed(pad, BUTTON.left)) || hat === -1;
  const right = x > DEADZONE || (standard && isPressed(pad, BUTTON.right)) || hat === 1;
  const fire = standard ? isPressed(pad, BUTTON.a) : [0, 1, 2, 3].some(i => isPressed(pad, i));
  return { left, right, fire };
}

/**
 * Affecte de façon stable les deux premières manettes actives aux joueurs gauche et droit
 * et détecte les appuis (fronts montants) et les déconnexions.
 */
export class GamepadManager {
  private readonly slots: [number | null, number | null] = [null, null];
  private readonly previous = new Map<number, boolean[]>();

  constructor(private readonly source: GamepadSource) {}

  poll(): GamepadPoll {
    const connected = this.source().filter((pad): pad is Gamepad => !!pad && pad.connected);
    const byIndex = new Map(connected.map(pad => [pad.index, pad]));
    const lost: number[] = [];

    this.slots.forEach((padIndex, slot) => {
      if (padIndex !== null && !byIndex.has(padIndex)) {
        this.slots[slot] = null;
        this.previous.delete(padIndex);
        lost.push(slot);
      }
    });
    for (const pad of [...connected].sort((a, b) => a.index - b.index)) {
      if (this.slots.includes(pad.index)) continue;
      const free = this.slots.indexOf(null);
      if (free >= 0) this.slots[free] = pad.index;
    }

    const players: [PlayerControls, PlayerControls] = [EMPTY_CONTROLS, EMPTY_CONTROLS];
    const pressed = new Set<Action>();
    const held = new Set<Action>();
    let anyInput = false;

    this.slots.forEach((padIndex, slot) => {
      const pad = padIndex === null ? undefined : byIndex.get(padIndex);
      if (!pad) return;
      players[slot] = padControls(pad);
      const now = pad.buttons.map((_, i) => isPressed(pad, i));
      const before = this.previous.get(pad.index) ?? [];
      const edge = (i: number) => !!now[i] && !before[i];
      if (now.some((down, i) => down && !before[i])) anyInput = true;

      const standard = pad.mapping === 'standard';
      if (edge(BUTTON.start)) pressed.add('start');
      if (now[BUTTON.start]) held.add('start');
      if (edge(BUTTON.select)) pressed.add('select');
      if (now[BUTTON.select]) held.add('select');
      if (players[slot].fire && !(standard ? before[BUTTON.a] : [0, 1, 2, 3].some(i => before[i]))) pressed.add('confirm');
      if (standard) {
        if (edge(BUTTON.b)) pressed.add('back');
        if (edge(BUTTON.y)) pressed.add('matrix');
        if (edge(BUTTON.lb)) pressed.add('previous');
        if (edge(BUTTON.rb)) pressed.add('next');
        if (now[BUTTON.lb]) held.add('previous');
        if (now[BUTTON.rb]) held.add('next');
        if (edge(BUTTON.x)) pressed.add(slot === 0 ? 'difficulty-left' : 'difficulty-right');
      }
      this.previous.set(pad.index, now);
    });

    const name = (padIndex: number | null) => (padIndex === null ? null : (byIndex.get(padIndex)?.id ?? null));
    return { players, pressed, held, pads: [name(this.slots[0]), name(this.slots[1])], lost, anyInput };
  }

  /** Vibration de la manette d'un joueur, si elle le permet. */
  rumble(player: number, durationMs: number, strength: number): void {
    const padIndex = this.slots[player];
    if (padIndex === null || padIndex === undefined) return;
    const pad = this.source().find(p => p?.index === padIndex);
    void pad?.vibrationActuator?.playEffect('dual-rumble', {
      duration: durationMs,
      strongMagnitude: strength,
      weakMagnitude: strength * 0.6,
    }).catch(() => undefined);
  }
}
