import { describe, expect, it } from 'vitest';
import { Repeater, wrapGame } from '../src/app/repeater';
import { GamepadManager, padControls } from '../src/input/gamepads';
import { Keyboard } from '../src/input/keyboard';

interface FakePad {
  index: number;
  id: string;
  connected: boolean;
  mapping: GamepadMappingType;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
}

function pad(index: number, mapping: GamepadMappingType = 'standard'): FakePad {
  return {
    index,
    id: `Manette ${index}`,
    connected: true,
    mapping,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}

function press(p: FakePad, button: number, down = true): void {
  p.buttons[button] = { pressed: down, value: down ? 1 : 0 };
}

const asGamepad = (p: FakePad) => p as unknown as Gamepad;

function manager(pads: FakePad[]) {
  return new GamepadManager(() => pads.map(asGamepad));
}

describe('manettes', () => {
  it('applique une zone morte et convertit en directions numériques', () => {
    const p = pad(0);
    p.axes[0] = 0.2;
    expect(padControls(asGamepad(p))).toEqual({ left: false, right: false, fire: false });
    p.axes[0] = -0.9;
    expect(padControls(asGamepad(p)).left).toBe(true);
    p.axes[0] = 0;
    press(p, 15);
    press(p, 0);
    expect(padControls(asGamepad(p))).toEqual({ left: false, right: true, fire: true });
  });

  it('lit la croix « hat » d’un joystick non standard', () => {
    const p = pad(0, '');
    p.axes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.714];
    expect(padControls(asGamepad(p)).left).toBe(true);
    p.axes[9] = 1.28;
    expect(padControls(asGamepad(p)).left).toBe(false);
  });

  it('affecte les deux premières manettes de façon stable', () => {
    const pads = [pad(3), pad(1), pad(7)];
    const m = manager(pads);
    expect(m.poll().pads).toEqual(['Manette 1', 'Manette 3']);
    press(pads[0]!, 0);
    expect(m.poll().players[1].fire).toBe(true);
  });

  it('détecte les appuis sur front montant uniquement', () => {
    const p = pad(0);
    const m = manager([p]);
    m.poll();
    press(p, 9);
    expect(m.poll().pressed.has('start')).toBe(true);
    const held = m.poll();
    expect(held.pressed.has('start')).toBe(false);
    expect(held.held.has('start')).toBe(true);
  });

  it('associe X à la difficulté du joueur de la manette', () => {
    const left = pad(0);
    const right = pad(1);
    const m = manager([left, right]);
    m.poll();
    press(right, 2);
    const poll = m.poll();
    expect(poll.pressed.has('difficulty-right')).toBe(true);
    expect(poll.pressed.has('difficulty-left')).toBe(false);
  });

  it('signale une déconnexion puis réaffecte la manette reconnectée', () => {
    const pads = [pad(0), pad(1)];
    const m = manager(pads);
    m.poll();
    pads[1]!.connected = false;
    const lost = m.poll();
    expect(lost.lost).toEqual([1]);
    expect(lost.pads).toEqual(['Manette 0', null]);
    pads[1]!.connected = true;
    expect(m.poll().pads).toEqual(['Manette 0', 'Manette 1']);
  });
});

function key(target: EventTarget, type: 'keydown' | 'keyup', value: string, repeat = false): void {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, { key: { value }, repeat: { value: repeat } });
  target.dispatchEvent(event);
}

describe('clavier', () => {
  it('associe flèches/Q/D/Espace au joueur 1 et J/L/K au joueur 2', () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);
    key(target, 'keydown', 'q');
    key(target, 'keydown', ' ');
    key(target, 'keydown', 'l');
    const poll = keyboard.poll();
    expect(poll.players[0]).toEqual({ left: true, right: false, fire: true });
    expect(poll.players[1]).toEqual({ left: false, right: true, fire: false });
  });

  it('ne perd pas un appui bref entre deux relevés', () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);
    key(target, 'keydown', ' ');
    key(target, 'keyup', ' ');
    expect(keyboard.poll().players[0].fire).toBe(true);
    expect(keyboard.poll().players[0].fire).toBe(false);
  });

  it('traduit les touches d’interface en actions sans répétition', () => {
    const target = new EventTarget();
    const keyboard = new Keyboard(target);
    key(target, 'keydown', 'Enter');
    key(target, 'keydown', 'Tab');
    key(target, 'keydown', 'f');
    key(target, 'keydown', 'p');
    key(target, 'keydown', 'Escape');
    const poll = keyboard.poll();
    expect([...poll.pressed].sort()).toEqual(['back', 'fullscreen', 'pause', 'select', 'start']);
    key(target, 'keydown', 'Enter', true);
    const repeat = keyboard.poll();
    expect(repeat.pressed.has('start')).toBe(false);
    expect(repeat.held.has('start')).toBe(true);
  });
});

describe('défilement des parties', () => {
  it('avance d’un pas immédiatement puis accélère', () => {
    const repeater = new Repeater();
    expect(repeater.update(1, 0)).toBe(1);
    expect(repeater.update(1, 0.3)).toBe(0);
    let steps = 0;
    for (let i = 0; i < 60; i++) steps += repeater.update(1, 1 / 60);
    expect(steps).toBeGreaterThan(5);
    expect(repeater.update(0, 1)).toBe(0);
  });

  it('défile beaucoup plus vite avec Select + Start', () => {
    const normal = new Repeater();
    const fast = new Repeater();
    normal.update(1, 0);
    fast.update(1, 0, true);
    let n = 0;
    let f = 0;
    for (let i = 0; i < 30; i++) {
      n += normal.update(1, 1 / 60);
      f += fast.update(1, 1 / 60, true);
    }
    expect(f).toBeGreaterThan(n * 3);
  });

  it('boucle de 112 à 1', () => {
    expect(wrapGame(112, 1)).toBe(1);
    expect(wrapGame(1, -1)).toBe(112);
    expect(wrapGame(50, 30)).toBe(80);
  });
});
