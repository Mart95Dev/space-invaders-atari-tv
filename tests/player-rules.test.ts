import { describe, expect, it } from 'vitest';
import { RULES } from '../src/config/tuning';
import { Game } from '../src/engine/game';
import { resolveCommands, rulesForFamily } from '../src/engine/player-rules';
import { createCommandShip } from '../src/entities/command-ship';
import { createBeam } from '../src/entities/projectiles';
import { solidCount } from '../src/entities/shields';
import { DT, bombCannon, calm, calmGame, frame, loseHit, run, shootInvader } from './helpers';

const CONTEXT = { turn: 0, shooter: 0, controller: 0 };

describe('familles à deux joueurs', () => {
  it.each([
    [17, 'B'], [33, 'C'], [49, 'D'], [65, 'E'], [81, 'F'], [97, 'G'],
  ])('construit la partie %i (famille %s)', (n, family) => {
    const game = new Game(n);
    expect(game.rules.family).toBe(family);
  });

  it('construit les 112 configurations', () => {
    for (let n = 1; n <= 112; n++) {
      const game = new Game(n, { seed: n });
      game.start();
      expect(() => run(game, 1)).not.toThrow();
    }
  });

  it('utilise un score commun pour E, F et G', () => {
    for (const n of [65, 81, 97]) expect(new Game(n).state.scores).toHaveLength(1);
    for (const n of [17, 33, 49]) expect(new Game(n).state.scores).toHaveLength(2);
  });

  it('vaut 100 points pour le vaisseau en C et D, 200 ailleurs', () => {
    expect(rulesForFamily('C').commandShipValue).toBe(100);
    expect(rulesForFamily('D').commandShipValue).toBe(100);
    for (const family of ['A', 'B', 'E', 'F', 'G'] as const) {
      expect(rulesForFamily(family).commandShipValue).toBe(200);
    }
  });
});

describe('famille B : alternance', () => {
  it('conserve deux vagues et restaure les boucliers à chaque tour', () => {
    const game = calmGame(17);
    expect(game.state.worlds).toHaveLength(2);
    const p2World = game.state.worlds[1];
    const shield = p2World?.shields[0];
    if (!shield) throw new Error('Bouclier absent');
    shield.px.fill(0);
    shootInvader(game);
    run(game, DT);
    expect(game.state.scores).toEqual([5, 0]);

    bombCannon(game);
    run(game, DT);
    run(game, 1.6);
    expect(game.snapshot()).toMatchObject({ status: 'turn-change', turn: 1, activeWorld: 1, hits: [2, 3] });
    expect(solidCount(game.world.shields[0]!)).toBeGreaterThan(0);
    // La vague du joueur 2 est intacte, celle du joueur 1 garde sa perte.
    expect(game.world.invaders.filter(i => i.alive)).toHaveLength(36);
    expect(game.state.worlds[0]?.invaders.filter(i => i.alive)).toHaveLength(35);

    run(game, 2);
    calm(game);
    expect(game.snapshot().status).toBe('playing');
    // Seul le joueur 2 contrôle le canon pendant son tour.
    const x = game.state.cannons[0]?.x ?? 0;
    run(game, 0.5, frame({ right: true }));
    expect(game.state.cannons[0]?.x).toBe(x);
    run(game, 0.5, frame({}, { right: true }));
    expect(game.state.cannons[0]?.x).toBeGreaterThan(x);
    shootInvader(game);
    run(game, DT);
    expect(game.state.scores).toEqual([5, 5]);
  });

  it('termine quand les deux joueurs ont épuisé leurs impacts et désigne le gagnant', () => {
    const game = calmGame(17);
    shootInvader(game);
    run(game, DT);
    for (let i = 0; i < 6; i++) {
      loseHit(game);
      run(game, 2);
      calm(game);
    }
    expect(game.snapshot()).toMatchObject({ status: 'game-over', hits: [0, 0], winner: 0 });
  });
});

describe('famille C : compétition simultanée', () => {
  it('donne 200 points à l’adversaire du joueur touché', () => {
    const game = calmGame(33);
    expect(game.state.cannons).toHaveLength(2);
    bombCannon(game, 1);
    run(game, DT);
    expect(game.state.scores).toEqual([RULES.competitionHitBonus, 0]);
  });

  it('crédite chaque joueur de ses propres tirs', () => {
    const game = calmGame(33);
    shootInvader(game, 1, 5, 2);
    run(game, DT);
    expect(game.state.scores).toEqual([0, 5]);
  });

  it('s’arrête après trois impacts au total', () => {
    const game = calmGame(33);
    loseHit(game, 0);
    loseHit(game, 1);
    expect(game.snapshot().status).toBe('playing');
    bombCannon(game, 0);
    run(game, DT);
    run(game, 2);
    expect(game.snapshot()).toMatchObject({ status: 'game-over', hits: [0], winner: 1 });
  });

  it('vaut 100 points pour le vaisseau', () => {
    const game = calmGame(33);
    const ship = createCommandShip(1);
    ship.x = 60;
    game.world.commandShip = ship;
    game.world.projectiles.push(createBeam(1, 65, ship.y + ship.h + 5));
    run(game, DT);
    expect(game.state.scores).toEqual([0, 100]);
  });
});

describe('famille D : tirs alternés', () => {
  it('n’autorise que le tireur courant puis passe la main', () => {
    const game = calmGame(49);
    game.update(DT, frame({}, { fire: true }));
    expect(game.snapshot().projectiles).toHaveLength(0);
    game.update(DT, frame({ fire: true }));
    expect(game.snapshot().projectiles.filter(p => p.owner === 0)).toHaveLength(1);
    expect(game.state.shooter).toBe(1);
    game.update(DT, frame({}, { fire: true }));
    expect(game.snapshot().projectiles.filter(p => p.owner === 1)).toHaveLength(1);
    expect(game.state.shooter).toBe(0);
  });

  it('tire automatiquement après le délai et passe la main', () => {
    const game = calmGame(49);
    game.drainEvents();
    run(game, RULES.autoFireDelay - 0.1);
    expect(game.drainEvents().some(e => e.type === 'fire')).toBe(false);
    run(game, 0.2);
    expect(game.drainEvents().some(e => e.type === 'fire')).toBe(true);
    expect(game.state.shooter).toBe(1);
  });
});

describe('familles coopératives', () => {
  it('E : le joueur gauche va à gauche, le joueur droit à droite, les deux tirent', () => {
    const rules = rulesForFamily('E');
    expect(resolveCommands(rules, frame({ right: true }, { left: true }), CONTEXT)).toEqual([{ move: 0, fire: false }]);
    expect(resolveCommands(rules, frame({ left: true }), CONTEXT)).toEqual([{ move: -1, fire: false }]);
    expect(resolveCommands(rules, frame({}, { right: true, fire: true }), CONTEXT)).toEqual([{ move: 1, fire: true }]);
    expect(resolveCommands(rules, frame({ fire: true }), CONTEXT)[0]?.fire).toBe(true);
  });

  it('F : le contrôle passe à l’autre joueur après chaque tir', () => {
    const game = calmGame(81);
    game.update(DT, frame({}, { fire: true }));
    expect(game.snapshot().projectiles).toHaveLength(0);
    game.update(DT, frame({ fire: true }));
    expect(game.state.controller).toBe(1);
    expect(game.state.cannons[0]?.player).toBe(1);
    const x = game.state.cannons[0]?.x ?? 0;
    run(game, 0.5, frame({ right: true }));
    expect(game.state.cannons[0]?.x).toBe(x);
    run(game, 0.5, frame({}, { right: true }));
    expect(game.state.cannons[0]?.x).toBeGreaterThan(x);
  });

  it('G : le joueur gauche déplace, le joueur droit tire', () => {
    const rules = rulesForFamily('G');
    expect(resolveCommands(rules, frame({ fire: true, right: true }), CONTEXT)).toEqual([{ move: 1, fire: false }]);
    expect(resolveCommands(rules, frame({}, { fire: true, left: true }), CONTEXT)).toEqual([{ move: 0, fire: true }]);
  });

  it('E, F, G : un seul canon dont la largeur suit la difficulté gauche', () => {
    for (const n of [65, 81, 97]) {
      const game = new Game(n, { difficulties: ['A', 'B'] });
      expect(game.state.cannons).toHaveLength(1);
      expect(game.state.cannons[0]?.w).toBe(16);
      expect(new Game(n, { difficulties: ['B', 'A'] }).state.cannons[0]?.w).toBe(8);
    }
  });

  it('C : chaque canon suit sa propre difficulté', () => {
    const game = new Game(33, { difficulties: ['B', 'A'] });
    expect(game.state.cannons.map(c => c.w)).toEqual([8, 16]);
  });
});
