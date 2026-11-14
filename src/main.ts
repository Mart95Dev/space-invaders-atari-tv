import { App } from './app/app';
import { AudioBus } from './audio/audio';
import { GamepadManager } from './input/gamepads';
import { InputManager } from './input/input-manager';
import { Keyboard } from './input/keyboard';
import { CANVAS_HEIGHT, CANVAS_WIDTH, Renderer } from './rendering/renderer';

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
const bootButton = document.querySelector<HTMLButtonElement>('#boot');
const context = canvas?.getContext('2d');
if (!canvas || !bootButton || !context) throw new Error('Canvas indisponible.');

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const gamepads = new GamepadManager(() => (navigator.getGamepads ? navigator.getGamepads() : []));
const input = new InputManager(new Keyboard(window), gamepads);
const audio = new AudioBus();

function isFullscreen(): boolean {
  return document.fullscreenElement !== null;
}

/** Plein écran : un refus du navigateur laisse le jeu utilisable dans la fenêtre. */
function enterFullscreen(): void {
  if (isFullscreen() || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen().catch(() => app.showNotice('PLEIN ECRAN REFUSE: TOUCHE F'));
}

function toggleFullscreen(): void {
  if (isFullscreen()) void document.exitFullscreen().catch(() => undefined);
  else enterFullscreen();
}

const app = new App({
  renderer: new Renderer(context),
  audio,
  poll: () => input.poll(),
  rumble: (player, duration, strength) => gamepads.rumble(player, duration, strength),
  toggleFullscreen,
});

/** Mise à l'échelle entière quand c'est possible (1080p, 4K), sinon ajustement au plus grand 4:3. */
function fit(): void {
  const ratio = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
  const scale = ratio >= 1 ? Math.floor(ratio) : ratio;
  canvas!.style.width = `${Math.floor(CANVAS_WIDTH * scale)}px`;
  canvas!.style.height = `${Math.floor(CANVAS_HEIGHT * scale)}px`;
}
window.addEventListener('resize', fit);
document.addEventListener('fullscreenchange', fit);
fit();

/** Première action clavier ou souris : son + plein écran (geste exigé par le navigateur). */
function bootFromGesture(): void {
  if (app.mode !== 'boot') return;
  enterFullscreen();
  app.boot();
  bootButton!.hidden = true;
}
bootButton.addEventListener('click', bootFromGesture);
window.addEventListener('keydown', bootFromGesture, { capture: true });
canvas.addEventListener('dblclick', toggleFullscreen);
canvas.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());

window.addEventListener('blur', () => app.pauseFromSystem());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.pauseFromSystem();
});

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
  last = now;
  app.frame(dt);
  if (app.mode !== 'boot') bootButton!.hidden = true;
  document.body.classList.toggle('playing', app.mode === 'game');
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/** Accès en lecture pour les tests navigateur. */
declare global {
  interface Window {
    __spaceInvaders?: {
      readonly mode: string;
      readonly gameNumber: number;
      readonly overlay: string | null;
      snapshot: () => unknown;
    };
  }
}
window.__spaceInvaders = {
  get mode() {
    return app.mode;
  },
  get gameNumber() {
    return app.gameNumber;
  },
  get overlay() {
    return app.overlay?.kind ?? null;
  },
  snapshot: () => app.game?.snapshot() ?? null,
};
