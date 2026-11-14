import { CANNON, FIELD, GROUND_Y } from '../config/tuning';
import type { GameSnapshot } from '../engine/game';
import { formatScore } from '../engine/scoring';
import { invaderRect } from '../entities/invaders';
import { GLYPH_ADVANCE, glyph, normalizeText, textWidth } from './font';
import { PALETTE, playerColor } from './palette';
import {
  matrixColumn,
  matrixLines,
  overlayLines,
  selectionLines,
  statusLines,
  type Line,
  type View,
} from './screens';
import {
  CANNON_DEBRIS,
  CANNON_SPRITE,
  COMMAND_SHIP_SPRITE,
  EXPLOSION_SPRITE,
  INVADER_SPRITES,
  patternRuns,
  widen,
  type Pattern,
} from './sprites';

/**
 * Le terrain logique de 160 × 192 est agrandi en pixels larges (8 × 5),
 * ce qui donne une image 4:3 de 1280 × 960, comme une TV de l'époque.
 */
export const SCALE_X = 8;
export const SCALE_Y = 5;
export const CANVAS_WIDTH = FIELD.width * SCALE_X;
export const CANVAS_HEIGHT = FIELD.height * SCALE_Y;

/** Sous-ensemble du contexte Canvas 2D réellement utilisé (facilite les tests). */
export interface PixelContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  imageSmoothingEnabled: boolean;
  fillRect(x: number, y: number, w: number, h: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

const WIDE_CANNON = widen(CANNON_SPRITE);
const WIDE_DEBRIS: readonly [Pattern, Pattern] = [widen(CANNON_DEBRIS[0]), widen(CANNON_DEBRIS[1])];
const LINE_HEIGHT = 8;

export class Renderer {
  /** Statistiques du dernier rendu (utilisées par les tests). */
  readonly stats = { invaders: 0 };

  constructor(private readonly ctx: PixelContext) {}

  render(view: View): void {
    this.begin();
    switch (view.screen) {
      case 'boot':
        this.textCentered('SPACE INVADERS', 70, PALETTE.invaders, 2);
        this.textCentered('APPUYEZ SUR UNE TOUCHE', 110, PALETTE.text);
        return;
      case 'selection':
        this.drawPlayfield(view.preview);
        this.drawSelectionHud(view.selection.gameNumber, view.preview.variation.playerCount);
        this.panel(selectionLines(view.selection), 104);
        if (view.selection.notice) this.textCentered(view.selection.notice, 184, PALETTE.dim);
        return;
      case 'matrix':
        this.drawMatrix(view.selection.gameNumber);
        return;
      case 'game': {
        this.drawPlayfield(view.game);
        this.drawHud(view.game);
        const lines = view.overlay ? overlayLines(view.overlay) : statusLines(view.game);
        if (lines) this.panel(lines);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- Primitives

  private begin(): void {
    this.stats.invaders = 0;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.setTransform(SCALE_X, 0, 0, SCALE_Y, 0, 0);
    this.rect(0, 0, FIELD.width, FIELD.height, PALETTE.background);
  }

  private rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private pattern(pattern: Pattern, x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (const run of patternRuns(pattern)) this.ctx.fillRect(ox + run.x, oy + run.y, run.length, 1);
  }

  private text(value: string, x: number, y: number, color: string, scale = 1): void {
    this.ctx.fillStyle = color;
    let cursor = Math.round(x);
    for (const char of normalizeText(value)) {
      for (const run of patternRuns(glyph(char))) {
        this.ctx.fillRect(cursor + run.x * scale, Math.round(y) + run.y * scale, run.length * scale, scale);
      }
      cursor += GLYPH_ADVANCE * scale;
    }
  }

  private textCentered(value: string, y: number, color: string, scale = 1): void {
    this.text(value, Math.round((FIELD.width - textWidth(value, scale)) / 2), y, color, scale);
  }

  /** Panneau de messages sur fond noir, centré verticalement par défaut. */
  private panel(lines: readonly Line[], top?: number): void {
    const height = lines.length * LINE_HEIGHT + 6;
    const y = top ?? Math.round((FIELD.height - height) / 2);
    const width = Math.max(...lines.map(line => textWidth(line.text))) + 10;
    const x = Math.round((FIELD.width - width) / 2);
    this.rect(x, y, width, height, PALETTE.panel);
    this.rect(x, y, width, 1, PALETTE.panelBorder);
    this.rect(x, y + height - 1, width, 1, PALETTE.panelBorder);
    lines.forEach((line, i) => {
      if (line.text) this.text(line.text, x + 5, y + 4 + i * LINE_HEIGHT, line.color);
    });
  }

  // ---------------------------------------------------------------- Terrain

  private drawPlayfield(game: GameSnapshot): void {
    const world = game.world;
    this.rect(FIELD.minX, GROUND_Y, FIELD.maxX - FIELD.minX, 1, PALETTE.ground);

    if (world.commandShip) this.pattern(COMMAND_SHIP_SPRITE, world.commandShip.x, world.commandShip.y, PALETTE.commandShip);

    if (game.invadersVisible) {
      for (const invader of world.invaders) {
        if (!invader.alive) continue;
        const rect = invaderRect(world.grid, invader);
        const frames = INVADER_SPRITES[invader.row] ?? INVADER_SPRITES[0];
        if (!frames) continue;
        this.pattern(frames[world.grid.frame], rect.x, rect.y, PALETTE.invaders);
        this.stats.invaders++;
      }
    }

    for (const explosion of world.explosions) {
      if (explosion.kind === 'invader') this.pattern(EXPLOSION_SPRITE, explosion.x, explosion.y, PALETTE.invaders);
      if (explosion.kind === 'ship' && explosion.label) {
        this.text(explosion.label, explosion.x, explosion.y, PALETTE.commandShip);
      }
    }

    if (!world.shieldsGone) {
      this.ctx.fillStyle = PALETTE.shields;
      for (const shield of world.shields) {
        const sx = Math.round(shield.x + game.shieldOffset);
        for (let row = 0; row < shield.h; row++) {
          let start = -1;
          for (let col = 0; col <= shield.w; col++) {
            const on = col < shield.w && shield.px[row * shield.w + col] === 1;
            if (on && start < 0) start = col;
            if (!on && start >= 0) {
              this.ctx.fillRect(sx + start, shield.y + row, col - start, 1);
              start = -1;
            }
          }
        }
      }
    }

    this.drawCannons(game);

    for (const projectile of game.projectiles) {
      this.rect(projectile.x, projectile.y, projectile.w, projectile.h, PALETTE.projectile);
    }
  }

  private drawCannons(game: GameSnapshot): void {
    const exploding = game.status === 'player-hit';
    const explosionTimer = game.world.explosions.find(e => e.kind === 'cannon')?.timer ?? 0;
    for (const cannon of game.cannons) {
      const wide = cannon.w > CANNON.widthB;
      const hit = exploding && (game.hitCannon === null || game.hitCannon === cannon.index);
      const dimmed = game.rules.alternatingFire && game.shooter !== cannon.index && game.status === 'playing';
      const color = playerColor(cannon.player, dimmed);
      if (hit) {
        const frame = Math.floor(explosionTimer * 10) % 2 === 0 ? 0 : 1;
        this.pattern((wide ? WIDE_DEBRIS : CANNON_DEBRIS)[frame], cannon.x, cannon.y, color);
      } else if (game.status !== 'game-over') {
        this.pattern(wide ? WIDE_CANNON : CANNON_SPRITE, cannon.x, cannon.y, color);
      }
    }
  }

  // ---------------------------------------------------------------- Informations

  private drawHud(game: GameSnapshot): void {
    const [left = 0, right = 0] = game.scores;
    if (game.scores.length === 2) {
      this.text(formatScore(left), FIELD.minX, 3, PALETTE.player1, 2);
      this.text(formatScore(right), FIELD.maxX - textWidth('0000', 2), 3, PALETTE.player2, 2);
    } else {
      const color = game.rules.alternatingControl ? playerColor(game.controller) : PALETTE.player1;
      this.text(formatScore(left), FIELD.minX, 3, color, 2);
    }

    const hitsY = GROUND_Y + 6;
    const [leftHits = 0, rightHits = 0] = game.hits;
    if (game.hits.length === 2) {
      this.text(String(leftHits), FIELD.minX, hitsY, PALETTE.player1);
      this.text(String(rightHits), FIELD.maxX - 3, hitsY, PALETTE.player2);
    } else {
      this.text(String(leftHits), FIELD.minX, hitsY, PALETTE.text);
    }
  }

  /** Comme sur la console : numéro de partie à gauche, nombre de joueurs à droite. */
  private drawSelectionHud(gameNumber: number, playerCount: number): void {
    this.text(String(gameNumber), FIELD.minX, 3, PALETTE.player1, 2);
    this.text(String(playerCount), FIELD.maxX - textWidth('0', 2), 3, PALETTE.player2, 2);
  }

  private drawMatrix(gameNumber: number): void {
    const lines = matrixLines(gameNumber);
    const top = 6;
    const x = 6;
    lines.forEach((line, i) => this.text(line.text, x, top + i * LINE_HEIGHT, line.color));
    // Surligne la colonne de la variante courante dans la grille des options.
    const gridStart = lines.findIndex(line => line.text.startsWith('VARIANTE'));
    const columnX = x + (10 + matrixColumn(gameNumber)) * GLYPH_ADVANCE;
    for (let row = gridStart; row < gridStart + 5; row++) {
      const line = lines[row];
      if (!line) continue;
      const char = line.text[10 + matrixColumn(gameNumber)] ?? ' ';
      this.text(char, columnX, top + row * LINE_HEIGHT, PALETTE.highlight);
    }
    this.rect(columnX - 1, top + (gridStart + 5) * LINE_HEIGHT - 2, GLYPH_ADVANCE + 1, 1, PALETTE.highlight);
  }
}
