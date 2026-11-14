import { describe, expect, it } from 'vitest';
import { BOMBS, CANNON, FIELD, SHIELDS } from '../src/config/tuning';
import { Game } from '../src/engine/game';
import { createCommandShip } from '../src/entities/command-ship';
import { createBeam } from '../src/entities/projectiles';
import { waveStartY } from '../src/entities/invaders';
import { DT, bombCannon, calmGame, frame, loseHit, run, shootInvader } from './helpers';

describe('partie solo (famille A)', () => {
  it('démarre avec trois impacts et 36 envahisseurs', () => {
    const game = new Game(1, { seed: 1 });
    expect(game.snapshot().status).toBe('ready');
    game.start();
    const snap = game.snapshot();
    expect(snap.status).toBe('playing');
    expect(snap.hits).toEqual([3]);
    expect(snap.world.invaders.filter(i => i.alive)).toHaveLength(36);
    expect(snap.scores).toEqual([0]);
  });

  it('n’autorise qu’un seul tir actif par canon', () => {
    const game = calmGame(1);
    game.update(DT, frame({ fire: true }));
    expect(game.snapshot().projectiles.filter(p => p.owner === 0)).toHaveLength(1);
    game.update(DT, frame({ fire: true }));
    expect(game.snapshot().projectiles.filter(p => p.owner === 0)).toHaveLength(1);
  });

  it('borne le déplacement du canon', () => {
    const game = calmGame(1);
    run(game, 5, frame({ left: true }));
    expect(game.state.cannons[0]?.x).toBe(FIELD.minX);
    run(game, 5, frame({ right: true }));
    const cannon = game.state.cannons[0];
    expect(cannon && cannon.x + cannon.w).toBe(FIELD.maxX);
  });

  it('neutralise gauche + droite simultanés', () => {
    const game = calmGame(1);
    const x = game.state.cannons[0]?.x;
    run(game, 1, frame({ left: true, right: true }));
    expect(game.state.cannons[0]?.x).toBe(x);
  });

  it('marque les points de la rangée touchée', () => {
    const game = calmGame(1);
    shootInvader(game, 0, 5, 0);
    run(game, DT);
    expect(game.snapshot().scores).toEqual([5]);
    shootInvader(game, 0, 0, 3);
    run(game, DT);
    expect(game.snapshot().scores).toEqual([35]);
  });

  it('accélère la formation quand les envahisseurs disparaissent', () => {
    const marches = (game: Game) => game.drainEvents().filter(e => e.type === 'march').length;
    const full = calmGame(1);
    full.drainEvents();
    run(full, 1);
    const few = calmGame(1);
    few.world.invaders.forEach((invader, i) => { invader.alive = i === 35; });
    few.drainEvents();
    run(few, 1);
    expect(marches(few)).toBeGreaterThan(marches(full) * 5);
  });

  it('fait disparaître les boucliers quand les envahisseurs les atteignent', () => {
    const game = calmGame(1);
    const grid = game.world.grid;
    grid.x = FIELD.maxX - 88;
    grid.y = SHIELDS.y - 67 - 2;
    grid.stepTimer = 10;
    run(game, DT);
    expect(game.world.shieldsGone).toBe(true);
    expect(game.snapshot().status).toBe('playing');
  });

  it('termine la partie quand les envahisseurs atteignent la Terre', () => {
    const game = calmGame(1);
    const grid = game.world.grid;
    grid.x = FIELD.maxX - 88;
    grid.y = CANNON.y - 67 - 2;
    grid.stepTimer = 10;
    run(game, DT);
    expect(game.snapshot().status).toBe('player-hit');
    run(game, 2);
    expect(game.snapshot()).toMatchObject({ status: 'game-over', invaded: true, hits: [0] });
  });

  it('cache les envahisseurs invisibles et les révèle après un impact', () => {
    const game = calmGame(9);
    expect(game.snapshot().invadersVisible).toBe(true);
    run(game, 2);
    expect(game.snapshot().invadersVisible).toBe(false);
    shootInvader(game);
    run(game, DT);
    expect(game.snapshot().scores).toEqual([5]);
    expect(game.snapshot().invadersVisible).toBe(true);
    run(game, 1);
    expect(game.snapshot().invadersVisible).toBe(false);
  });

  it('combine bombes rapides et en zigzag (partie 7)', () => {
    const game = calmGame(7);
    game.world.bombTimer = 0;
    run(game, DT);
    const bomb = game.snapshot().projectiles.find(p => p.kind === 'bomb');
    expect(bomb?.vy).toBe(BOMBS.fastSpeed);
    expect(bomb?.zigzag).not.toBeNull();
  });

  it('lance une nouvelle vague plus basse quand tout est détruit', () => {
    const game = calmGame(1);
    game.world.invaders.forEach((invader, i) => { invader.alive = i === 35; });
    shootInvader(game, 0, 5, 5);
    run(game, DT);
    expect(game.snapshot().status).toBe('wave-cleared');
    run(game, 2);
    const snap = game.snapshot();
    expect(snap.status).toBe('playing');
    expect(snap.world.wave).toBe(2);
    expect(snap.world.grid.y).toBe(waveStartY(2));
    expect(snap.world.invaders.filter(i => i.alive)).toHaveLength(36);
  });

  it('termine la partie après trois impacts', () => {
    const game = calmGame(1);
    loseHit(game);
    loseHit(game);
    expect(game.snapshot()).toMatchObject({ status: 'playing', hits: [1] });
    bombCannon(game);
    run(game, DT);
    expect(game.snapshot().status).toBe('player-hit');
    run(game, 2);
    expect(game.snapshot()).toMatchObject({ status: 'game-over', hits: [0], invaded: false });
  });

  it('donne un canon deux fois plus large en difficulté A', () => {
    const normal = new Game(1, { difficulties: ['B', 'B'] });
    const large = new Game(1, { difficulties: ['A', 'B'] });
    expect(large.state.cannons[0]?.w).toBe((normal.state.cannons[0]?.w ?? 0) * 2);
  });

  it('vaut 200 points pour le vaisseau de commandement', () => {
    const game = calmGame(1);
    const ship = createCommandShip(1);
    ship.x = 60;
    game.world.commandShip = ship;
    game.world.projectiles.push(createBeam(0, 65, ship.y + ship.h + 5));
    run(game, DT);
    expect(game.snapshot().scores).toEqual([200]);
  });

  it('fige la simulation pendant la pause', () => {
    const game = calmGame(1);
    game.pause();
    const x = game.state.cannons[0]?.x;
    run(game, 1, frame({ right: true }));
    expect(game.state.cannons[0]?.x).toBe(x);
    game.resume();
    expect(game.snapshot().status).toBe('playing');
  });

  it('refuse un pas de temps invalide', () => {
    const game = calmGame(1);
    expect(() => run(game, -1)).toThrow(RangeError);
    expect(() => run(game, Number.NaN)).toThrow(RangeError);
  });

  it('produit les événements sonores', () => {
    const game = calmGame(1);
    game.drainEvents();
    game.update(DT, frame({ fire: true }));
    expect(game.drainEvents().map(e => e.type)).toContain('fire');
    expect(game.drainEvents()).toEqual([]);
  });
});
