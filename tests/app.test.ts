import { describe, expect, it } from 'vitest';
import { App } from '../src/app/app';
import { AudioBus } from '../src/audio/audio';
import { IDLE_FRAME } from '../src/engine/types';
import type { Action, InputSnapshot } from '../src/input/actions';
import { Renderer, type PixelContext } from '../src/rendering/renderer';

const ctx: PixelContext = { fillStyle: '', imageSmoothingEnabled: true, fillRect: () => undefined, setTransform: () => undefined };

function snapshot(pressed: Action[] = [], extra: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
    controls: IDLE_FRAME,
    pressed: new Set(pressed),
    held: new Set(),
    pads: ['Manette', null],
    lost: [],
    anyInput: pressed.length > 0,
    ...extra,
  };
}

function setup() {
  const queue: InputSnapshot[] = [];
  let fullscreen = 0;
  const app = new App({
    renderer: new Renderer(ctx),
    audio: new AudioBus(),
    poll: () => queue.shift() ?? snapshot(),
    rumble: () => undefined,
    toggleFullscreen: () => { fullscreen++; },
  });
  const step = (input: InputSnapshot = snapshot()) => {
    queue.push(input);
    app.frame(1 / 60);
  };
  return { app, step, fullscreenCount: () => fullscreen };
}

describe('application', () => {
  it('démarre sur une action sans lancer de partie dans la foulée', () => {
    const { app, step } = setup();
    app.boot();
    step(snapshot(['start']));
    expect(app.mode).toBe('selection');
    step(snapshot(['start']));
    expect(app.mode).toBe('game');
  });

  it('démarre aussi par une manette', () => {
    const { app, step } = setup();
    step(snapshot(['confirm']));
    expect(app.mode).toBe('selection');
  });

  it('change de partie, ouvre la matrice et règle les difficultés', () => {
    const { app, step } = setup();
    app.boot();
    step();
    step(snapshot([], { controls: { players: [{ left: false, right: true, fire: false }, IDLE_FRAME.players[1]] } }));
    expect(app.gameNumber).toBe(2);
    step(snapshot(['difficulty-left']));
    expect(app.difficulties).toEqual(['A', 'B']);
    step(snapshot(['matrix']));
    expect(app.mode).toBe('matrix');
    step(snapshot(['back']));
    expect(app.mode).toBe('selection');
  });

  it('Select + Start fait défiler sans lancer la partie', () => {
    const { app, step } = setup();
    app.boot();
    step();
    const start = app.gameNumber;
    step(snapshot(['select'], { held: new Set<Action>(['select']) }));
    step(snapshot(['start'], { held: new Set<Action>(['select', 'start']) }));
    for (let i = 0; i < 60; i++) step(snapshot([], { held: new Set<Action>(['select', 'start']) }));
    expect(app.mode).toBe('selection');
    expect(app.gameNumber - start).toBeGreaterThan(10);
  });

  it('met en pause, puis revient au menu après confirmation', () => {
    const { app, step } = setup();
    app.boot();
    step();
    step(snapshot(['start']));
    step(snapshot(['start']));
    expect(app.overlay).toEqual({ kind: 'paused' });
    expect(app.game?.state.status).toBe('paused');
    step(snapshot(['start']));
    expect(app.overlay).toBeNull();
    step(snapshot(['select']));
    expect(app.overlay).toEqual({ kind: 'quit-confirm' });
    step(snapshot(['confirm']));
    expect(app.overlay).toBeNull();
    step(snapshot(['select']));
    step(snapshot(['start']));
    expect(app.mode).toBe('selection');
  });

  it('met en pause à la perte du focus et à la déconnexion d’une manette', () => {
    const { app, step } = setup();
    app.boot();
    step();
    step(snapshot(['start']));
    app.pauseFromSystem();
    expect(app.overlay).toEqual({ kind: 'paused' });
    step(snapshot(['start']));
    step(snapshot([], { lost: [0], pads: [null, null] }));
    expect(app.overlay).toEqual({ kind: 'pad-lost', player: 0 });
    step(snapshot(['start']));
    expect(app.overlay).toBeNull();
    expect(app.game?.state.status).toBe('playing');
  });

  it('bascule le plein écran avec l’action dédiée', () => {
    const { step, fullscreenCount } = setup();
    step(snapshot(['fullscreen']));
    expect(fullscreenCount()).toBe(1);
  });
});
