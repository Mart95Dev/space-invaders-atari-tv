import { EMPTY_CONTROLS, type PlayerControls } from '../engine/types';
import type { Action } from './actions';

/** Touches des deux joueurs (clavier en solution de secours) et actions d'interface. */
const PLAYER_KEYS = [
  { left: ['arrowleft', 'q', 'a'], right: ['arrowright', 'd'], fire: [' '] },
  { left: ['j'], right: ['l'], fire: ['k'] },
] as const;

const ACTION_KEYS: Readonly<Record<string, Action>> = {
  enter: 'start',
  p: 'pause',
  escape: 'back',
  backspace: 'back',
  tab: 'select',
  m: 'matrix',
  '1': 'difficulty-left',
  '2': 'difficulty-right',
  f: 'fullscreen',
  pageup: 'previous',
  pagedown: 'next',
};

const PREVENT_DEFAULT = new Set([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'tab', 'backspace']);

export interface KeyboardPoll {
  players: [PlayerControls, PlayerControls];
  pressed: Set<Action>;
  held: Set<Action>;
  anyInput: boolean;
}

export class Keyboard {
  private readonly held = new Set<string>();
  /** Touches appuyées depuis le dernier relevé : un appui bref n'est jamais perdu. */
  private readonly tapped = new Set<string>();

  constructor(target: EventTarget) {
    target.addEventListener('keydown', event => this.onKeyDown(event as KeyboardEvent));
    target.addEventListener('keyup', event => this.held.delete(Keyboard.keyOf(event as KeyboardEvent)));
    target.addEventListener('blur', () => this.held.clear());
  }

  static keyOf(event: KeyboardEvent): string {
    return (event.key ?? '').toLowerCase();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = Keyboard.keyOf(event);
    if (PREVENT_DEFAULT.has(key)) event.preventDefault();
    this.held.add(key);
    if (!event.repeat) this.tapped.add(key);
  }

  poll(): KeyboardPoll {
    const isDown = (key: string) => this.held.has(key) || this.tapped.has(key);
    const players = PLAYER_KEYS.map(keys => ({
      left: keys.left.some(isDown),
      right: keys.right.some(isDown),
      fire: keys.fire.some(isDown),
    })) as [PlayerControls, PlayerControls];

    const pressed = new Set<Action>();
    const held = new Set<Action>();
    for (const key of this.tapped) {
      const action = ACTION_KEYS[key];
      if (action) pressed.add(action);
      if (key === ' ') pressed.add('confirm');
    }
    for (const key of this.held) {
      const action = ACTION_KEYS[key];
      if (action) held.add(action);
    }
    const anyInput = this.tapped.size > 0;
    this.tapped.clear();
    return { players: players.length === 2 ? players : [EMPTY_CONTROLS, EMPTY_CONTROLS], pressed, held, anyInput };
  }
}
