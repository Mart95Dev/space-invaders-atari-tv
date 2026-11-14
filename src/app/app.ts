import { STEP } from '../config/tuning';
import { getVariation } from '../config/variations';
import type { AudioBus } from '../audio/audio';
import { Game } from '../engine/game';
import type { Difficulty, GameEvent } from '../engine/types';
import type { Action, InputSnapshot } from '../input/actions';
import type { Renderer } from '../rendering/renderer';
import type { Overlay, SelectionView, View } from '../rendering/screens';
import { Repeater, wrapGame } from './repeater';

export type Mode = 'boot' | 'selection' | 'matrix' | 'game';

/** Rattrapage maximal de la simulation par image (évite une cascade après un gros ralentissement). */
const MAX_STEPS_PER_FRAME = 5;
const NOTICE_DURATION = 5;

export interface AppDeps {
  renderer: Renderer;
  audio: AudioBus;
  poll: () => InputSnapshot;
  rumble: (player: number, durationMs: number, strength: number) => void;
  toggleFullscreen: () => void;
}

/** Cycle de l'application : démarrage, choix de partie, matrice, jeu, pause et retour au menu. */
export class App {
  mode: Mode = 'boot';
  gameNumber = 1;
  difficulties: [Difficulty, Difficulty] = ['B', 'B'];
  game: Game | null = null;
  overlay: Overlay | null = null;

  private preview: Game = new Game(1);
  private accumulator = 0;
  private padCount = 0;
  private notice: string | null = null;
  private noticeTimer = 0;
  private readonly gameRepeater = new Repeater();
  private readonly selectRepeater = new Repeater();
  /** Select + Start : défilement rapide, sans lancer la partie au relâchement. */
  private fastScroll = false;
  /** L'appui qui a servi au démarrage ne doit pas aussi lancer une partie. */
  private ignoreNextInput = false;

  constructor(private readonly deps: AppDeps) {}

  /** Première interaction : déverrouille l'audio puis affiche le choix de partie. */
  boot(notice: string | null = null): void {
    if (this.mode !== 'boot') return;
    this.deps.audio.unlock();
    this.mode = 'selection';
    this.ignoreNextInput = true;
    this.showNotice(notice);
  }

  showNotice(notice: string | null): void {
    this.notice = notice;
    this.noticeTimer = notice ? NOTICE_DURATION : 0;
  }

  /** Perte de focus ou onglet masqué : pause automatique. */
  pauseFromSystem(): void {
    if (this.mode === 'game' && !this.overlay && this.game?.state.status !== 'game-over') this.openOverlay({ kind: 'paused' });
  }

  frame(dt: number): void {
    const input = this.deps.poll();
    if (this.ignoreNextInput) {
      this.ignoreNextInput = false;
      this.deps.renderer.render(this.view());
      return;
    }
    this.padCount = input.pads.filter(Boolean).length;
    if (input.pressed.has('fullscreen')) this.deps.toggleFullscreen();
    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0) this.notice = null;
    }

    switch (this.mode) {
      case 'boot':
        if (input.anyInput) this.boot('F OU DOUBLE-CLIC: PLEIN ECRAN');
        break;
      case 'selection':
        this.handleSelection(input, dt);
        break;
      case 'matrix':
        this.handleMatrix(input, dt);
        break;
      case 'game':
        this.handleGame(input, dt);
        break;
    }
    this.deps.renderer.render(this.view());
  }

  view(): View {
    const selection: SelectionView = {
      gameNumber: this.gameNumber,
      difficulties: this.difficulties,
      padCount: this.padCount,
      notice: this.notice,
    };
    if (this.mode === 'boot') return { screen: 'boot' };
    if (this.mode === 'matrix') return { screen: 'matrix', selection };
    if (this.mode === 'game' && this.game) return { screen: 'game', game: this.game.snapshot(), overlay: this.overlay, selection };
    return { screen: 'selection', preview: this.preview.snapshot(), selection };
  }

  // ---------------------------------------------------------------- Choix de partie

  private navigate(input: InputSnapshot, dt: number): void {
    const [left, right] = input.controls.players;
    const toLeft = left.left || right.left || input.held.has('previous');
    const toRight = left.right || right.right || input.held.has('next');
    const direction = toLeft === toRight ? 0 : toLeft ? -1 : 1;
    let delta = this.gameRepeater.update(direction, dt);

    if (input.pressed.has('start') && input.held.has('select')) this.fastScroll = true;
    if (!input.held.has('select')) this.fastScroll = false;
    delta += this.selectRepeater.update(input.held.has('select') || input.pressed.has('select') ? 1 : 0, dt, this.fastScroll);

    if (delta !== 0) this.setGame(wrapGame(this.gameNumber, delta));
  }

  /** Choix direct d'un numéro de partie depuis l'écran de sélection. */
  selectGame(gameNumber: number): void {
    if (this.mode === 'selection' || this.mode === 'matrix') this.setGame(wrapGame(1, gameNumber - 1));
  }

  private setGame(gameNumber: number): void {
    this.gameNumber = gameNumber;
    this.preview = new Game(gameNumber, { difficulties: this.difficulties });
  }

  private toggleDifficulty(player: 0 | 1): void {
    const next: Difficulty = this.difficulties[player] === 'A' ? 'B' : 'A';
    this.difficulties = player === 0 ? [next, this.difficulties[1]] : [this.difficulties[0], next];
    this.setGame(this.gameNumber);
  }

  private handleSelection(input: InputSnapshot, dt: number): void {
    this.navigate(input, dt);
    if (input.pressed.has('difficulty-left')) this.toggleDifficulty(0);
    if (input.pressed.has('difficulty-right')) this.toggleDifficulty(1);
    if (input.pressed.has('matrix')) {
      this.mode = 'matrix';
      return;
    }
    const launch = (input.pressed.has('start') && !this.fastScroll && !input.held.has('select')) || input.pressed.has('confirm');
    if (launch) this.launch();
  }

  private handleMatrix(input: InputSnapshot, dt: number): void {
    this.navigate(input, dt);
    const exits: readonly Action[] = ['matrix', 'back', 'start', 'confirm'];
    if (exits.some(action => input.pressed.has(action))) this.mode = 'selection';
  }

  // ---------------------------------------------------------------- Partie

  launch(): void {
    this.game = new Game(this.gameNumber, { difficulties: this.difficulties, seed: Date.now() });
    this.game.start();
    this.overlay = null;
    this.accumulator = 0;
    this.mode = 'game';
    this.deps.audio.resume();
  }

  private toSelection(): void {
    this.game = null;
    this.overlay = null;
    this.mode = 'selection';
    this.deps.audio.stopAll();
    this.deps.audio.resume();
    this.setGame(this.gameNumber);
  }

  private openOverlay(overlay: Overlay): void {
    this.overlay = overlay;
    this.game?.pause();
    this.deps.audio.suspend();
  }

  private closeOverlay(): void {
    this.overlay = null;
    this.accumulator = 0;
    this.game?.resume();
    this.deps.audio.resume();
  }

  private handleGame(input: InputSnapshot, dt: number): void {
    const game = this.game;
    if (!game) return;
    const pressed = (action: Action) => input.pressed.has(action);
    const twoPlayers = getVariation(this.gameNumber).playerCount === 2;

    // Déconnexion d'une manette utilisée : pause et consigne de reconnexion.
    const lostSlot = input.lost.find(slot => slot === 0 || twoPlayers);
    if (lostSlot !== undefined && game.state.status !== 'game-over') {
      this.openOverlay({ kind: 'pad-lost', player: lostSlot });
      return;
    }

    if (this.overlay) {
      switch (this.overlay.kind) {
        case 'paused':
          if (pressed('start') || pressed('pause') || pressed('back')) this.closeOverlay();
          else if (pressed('select')) this.overlay = { kind: 'quit-confirm' };
          return;
        case 'quit-confirm':
          if (pressed('start')) this.toSelection();
          else if (pressed('confirm') || pressed('back') || pressed('select')) this.closeOverlay();
          return;
        case 'pad-lost':
          if (pressed('start')) this.closeOverlay();
          return;
      }
    }

    if (game.state.status === 'game-over') {
      if (pressed('start') || pressed('confirm')) this.launch();
      else if (pressed('select') || pressed('back')) this.toSelection();
      return;
    }

    if (pressed('start') || pressed('pause') || pressed('back')) {
      this.openOverlay({ kind: 'paused' });
      return;
    }
    if (pressed('select')) {
      this.openOverlay({ kind: 'quit-confirm' });
      return;
    }

    // Simulation à pas fixe, indépendante de la fréquence de l'écran.
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
      game.update(STEP, input.controls);
      this.accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;

    const events = game.drainEvents();
    this.deps.audio.consume(events);
    this.rumbleFor(events);
  }

  private rumbleFor(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'cannon-hit') this.deps.rumble(event.player, 450, 1);
    }
  }
}
