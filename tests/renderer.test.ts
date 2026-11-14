import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { PALETTE } from '../src/rendering/palette';
import { Renderer, type PixelContext } from '../src/rendering/renderer';
import { matrixLines, selectionLines, type SelectionView } from '../src/rendering/screens';
import { normalizeText, textWidth } from '../src/rendering/font';
import { calmGame, run } from './helpers';

class FakeContext implements PixelContext {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  imageSmoothingEnabled = true;
  readonly fills: { color: string; x: number; y: number; w: number; h: number }[] = [];
  transform: number[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.fills.push({ color: String(this.fillStyle), x, y, w, h });
  }
  setTransform(...values: number[]): void {
    this.transform = values;
  }
}

const SELECTION: SelectionView = { gameNumber: 1, difficulties: ['B', 'B'], padCount: 1, notice: null };

function renderGame(game: Game) {
  const ctx = new FakeContext();
  const renderer = new Renderer(ctx);
  renderer.render({ screen: 'game', game: game.snapshot(), overlay: null, selection: SELECTION });
  return { ctx, renderer };
}

describe('rendu', () => {
  it('trace un fond noir, sans lissage, en pixels larges 4:3', () => {
    const { ctx } = renderGame(calmGame(1));
    expect(ctx.fills[0]).toMatchObject({ color: PALETTE.background, x: 0, y: 0, w: 160, h: 192 });
    expect(ctx.imageSmoothingEnabled).toBe(false);
    expect(ctx.transform).toEqual([8, 0, 0, 5, 0, 0]);
  });

  it('dessine les 36 envahisseurs au départ', () => {
    expect(renderGame(calmGame(1)).renderer.stats.invaders).toBe(36);
  });

  it('ne dessine pas les envahisseurs invisibles hors révélation', () => {
    const game = calmGame(9);
    run(game, 2);
    expect(renderGame(game).renderer.stats.invaders).toBe(0);
  });

  it('affiche deux scores en compétition', () => {
    const { ctx } = renderGame(calmGame(33));
    const colors = new Set(ctx.fills.filter(f => f.y < 14).map(f => f.color));
    expect(colors).toContain(PALETTE.player1);
    expect(colors).toContain(PALETTE.player2);
  });

  it('affiche un seul score en solo', () => {
    const { ctx } = renderGame(calmGame(1));
    const colors = new Set(ctx.fills.filter(f => f.y < 14).map(f => f.color));
    expect(colors).not.toContain(PALETTE.player2);
  });

  it('résume les quatre options de la partie 16', () => {
    const text = selectionLines({ ...SELECTION, gameNumber: 16 }).map(l => l.text).join('\n');
    expect(text).toContain('PARTIE 16');
    expect(text.match(/OUI/g)).toHaveLength(4);
  });

  it('signale l’absence de seconde manette pour un mode à deux', () => {
    const text = selectionLines({ ...SELECTION, gameNumber: 33 }).map(l => l.text).join('\n');
    expect(text).toContain('MANETTE 2 ABSENTE');
  });

  it('tient toutes les lignes de texte dans la largeur de l’écran', () => {
    const all = [
      ...matrixLines(1),
      ...Array.from({ length: 112 }, (_, i) => selectionLines({ ...SELECTION, gameNumber: i + 1 })).flat(),
    ];
    for (const line of all) expect(textWidth(line.text)).toBeLessThanOrEqual(150);
  });

  it('retire les accents pour la police pixel', () => {
    expect(normalizeText('Égalité')).toBe('EGALITE');
  });

  it('rend l’écran de sélection et la matrice sans erreur', () => {
    const ctx = new FakeContext();
    const renderer = new Renderer(ctx);
    renderer.render({ screen: 'selection', preview: new Game(16).snapshot(), selection: SELECTION });
    expect(renderer.stats.invaders).toBe(36);
    renderer.render({ screen: 'matrix', selection: { ...SELECTION, gameNumber: 112 } });
    expect(ctx.fills.length).toBeGreaterThan(100);
  });
});
