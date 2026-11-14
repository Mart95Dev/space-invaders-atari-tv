import { BEAM, BOMBS, CANNON, COMMAND_SHIP, GROUND_Y, INVADERS, RULES, SHIELDS, STEP } from '../config/tuning';
import { getVariation } from '../config/variations';
import { createCannon, cannonWidth, moveCannon } from '../entities/cannons';
import { createCommandShip, moveCommandShip } from '../entities/command-ship';
import { aliveBounds, countAlive, createGrid, createInvaders, invaderRect, stepGrid, stepInterval } from '../entities/invaders';
import { createBeam, createBomb, moveProjectile } from '../entities/projectiles';
import { createShields, hitShield, shieldOffset } from '../entities/shields';
import { overlap } from './collisions';
import { resolveCommands, rulesForFamily, type PlayerRules } from './player-rules';
import { createRandom, randomBetween, type Random } from './random';
import { scoreForRow } from './scoring';
import type {
  Cannon,
  ControlFrame,
  Difficulty,
  GameEvent,
  GameState,
  GameStatus,
  Projectile,
  World,
} from './types';

export interface GameOptions {
  seed?: number;
  difficulties?: readonly [Difficulty, Difficulty];
}

/** Vue en lecture seule transmise au rendu. */
export interface GameSnapshot extends Readonly<GameState> {
  readonly rules: PlayerRules;
  readonly world: Readonly<World>;
  readonly projectiles: readonly Projectile[];
  readonly invadersVisible: boolean;
  readonly shieldOffset: number;
}

const ACTIVE_STATUSES: readonly GameStatus[] = ['playing', 'player-hit', 'wave-cleared', 'turn-change'];

/**
 * Simulation complète d'une partie, indépendante du rendu, de l'audio et des périphériques.
 * Le temps avance par pas fixes de 1/60 s, quelle que soit la fréquence d'affichage.
 */
export class Game {
  readonly state: GameState;
  readonly rules: PlayerRules;
  private readonly random: Random;

  constructor(gameNumber: number, options: GameOptions = {}) {
    const variation = getVariation(gameNumber);
    this.rules = rulesForFamily(variation.family);
    this.random = createRandom(options.seed ?? Date.now());
    const difficulties = options.difficulties ?? ['B', 'B'];

    this.state = {
      variation,
      difficulties: [difficulties[0], difficulties[1]],
      status: 'ready',
      pausedStatus: null,
      statusTimer: 0,
      worlds: [],
      activeWorld: 0,
      cannons: [],
      scores: Array.from({ length: this.rules.scoreCount }, () => 0),
      hits: Array.from({ length: this.rules.alternatingTurns ? 2 : 1 }, () => RULES.hits),
      turn: 0,
      shooter: 0,
      shooterTimer: 0,
      controller: 0,
      invaded: false,
      hitCannon: null,
      winner: null,
      time: 0,
      events: [],
    };
    for (let i = 0; i < this.rules.worlds; i++) this.state.worlds.push(this.createWorld(1));
    this.state.cannons = this.createCannons();
  }

  // ------------------------------------------------------------------ API publique

  get world(): World {
    const world = this.state.worlds[this.state.activeWorld];
    if (!world) throw new Error('Monde actif introuvable.');
    return world;
  }

  start(): void {
    if (this.state.status !== 'ready') return;
    for (const world of this.state.worlds) world.revealTimer = INVADERS.waveRevealTime;
    this.state.status = 'playing';
  }

  pause(): void {
    if (!ACTIVE_STATUSES.includes(this.state.status)) return;
    this.state.pausedStatus = this.state.status;
    this.state.status = 'paused';
  }

  resume(): void {
    if (this.state.status !== 'paused') return;
    this.state.status = this.state.pausedStatus ?? 'playing';
    this.state.pausedStatus = null;
  }

  update(dt: number, controls: ControlFrame): void {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError(`Pas de temps invalide : ${dt}`);
    let remaining = dt;
    while (remaining > 1e-9) {
      const step = Math.min(STEP, remaining);
      this.tick(step, controls);
      remaining -= step;
    }
  }

  snapshot(): GameSnapshot {
    const world = this.world;
    return {
      ...this.state,
      rules: this.rules,
      world,
      projectiles: world.projectiles,
      invadersVisible: this.invadersVisible(),
      shieldOffset: shieldOffset(world.shieldTime, this.state.variation.movingShields),
    };
  }

  /** Retourne et vide les événements produits depuis le dernier appel (sons, vibrations). */
  drainEvents(): GameEvent[] {
    const events = this.state.events;
    this.state.events = [];
    return events;
  }

  // ------------------------------------------------------------------ Création

  private createWorld(wave: number): World {
    return {
      wave,
      invaders: createInvaders(),
      grid: createGrid(wave),
      shields: createShields(),
      shieldsGone: false,
      shieldTime: 0,
      projectiles: [],
      commandShip: null,
      commandShipTimer: randomBetween(this.random, COMMAND_SHIP.minDelay, COMMAND_SHIP.maxDelay),
      bombTimer: randomBetween(this.random, BOMBS.minDelay, BOMBS.maxDelay),
      revealTimer: INVADERS.waveRevealTime,
      explosions: [],
    };
  }

  private createCannons(): Cannon[] {
    const [left, right] = this.state.difficulties;
    if (this.rules.cannons === 2) {
      return [
        createCannon(0, 0, CANNON.leftStartX, left),
        createCannon(1, 1, CANNON.rightStartX, right),
      ];
    }
    // Canon unique : en famille B la difficulté suit le joueur du tour,
    // dans les modes coopératifs seule la difficulté gauche compte.
    const player = this.rules.alternatingTurns ? this.state.turn : this.rules.alternatingControl ? this.state.controller : 0;
    const difficulty = this.rules.alternatingTurns ? (this.state.turn === 0 ? left : right) : left;
    return [createCannon(0, player, CANNON.soloStartX, difficulty)];
  }

  // ------------------------------------------------------------------ Boucle

  private tick(dt: number, controls: ControlFrame): void {
    const s = this.state;
    switch (s.status) {
      case 'ready':
      case 'paused':
      case 'game-over':
        return;
      case 'player-hit':
        s.statusTimer -= dt;
        this.updateExplosions(dt);
        if (s.statusTimer <= 0) this.afterHit();
        return;
      case 'wave-cleared':
        s.statusTimer -= dt;
        this.updateExplosions(dt);
        if (s.statusTimer <= 0) this.nextWave();
        return;
      case 'turn-change':
        s.statusTimer -= dt;
        if (s.statusTimer <= 0) s.status = 'playing';
        return;
      case 'playing':
        this.tickPlaying(dt, controls);
        return;
    }
  }

  private tickPlaying(dt: number, controls: ControlFrame): void {
    const s = this.state;
    const world = this.world;
    s.time += dt;
    world.shieldTime += dt;
    world.revealTimer = Math.max(0, world.revealTimer - dt);

    // Canons
    const commands = resolveCommands(this.rules, controls, s);
    commands.forEach((command, index) => {
      const cannon = s.cannons[index];
      if (!cannon) return;
      moveCannon(cannon, command.move, dt);
      if (command.fire) this.tryFire(index);
    });

    // Famille D : tir automatique si le tireur attend trop longtemps
    if (this.rules.alternatingFire) {
      s.shooterTimer += dt;
      if (s.shooterTimer >= RULES.autoFireDelay) this.tryFire(s.shooter);
    }

    // Formation d'envahisseurs (plusieurs pas possibles quand elle est très rapide)
    world.grid.stepTimer += dt;
    let interval = stepInterval(countAlive(world.invaders), world.wave);
    while (world.grid.stepTimer >= interval) {
      world.grid.stepTimer -= interval;
      this.stepInvaders();
      if (s.status !== 'playing') return;
      interval = stepInterval(countAlive(world.invaders), world.wave);
    }

    this.updateBombDrops(dt);
    this.updateProjectiles(dt);
    if (s.status !== 'playing') return;
    this.updateCommandShip(dt);
    this.updateExplosions(dt);

    if (countAlive(world.invaders) === 0) this.clearWave();
  }

  private tryFire(index: number): boolean {
    const s = this.state;
    const cannon = s.cannons[index];
    if (!cannon) return false;
    if (this.rules.alternatingFire && s.shooter !== index) return false;
    // Un seul tir par canon tant que le précédent est actif.
    if (this.world.projectiles.some(p => p.kind === 'beam' && p.owner === index)) return false;

    this.world.projectiles.push(createBeam(index, cannon.x + Math.floor(cannon.w / 2), cannon.y));
    s.events.push({ type: 'fire' });

    if (this.rules.alternatingFire) {
      s.shooter = index === 0 ? 1 : 0;
      s.shooterTimer = 0;
    }
    if (this.rules.alternatingControl) {
      s.controller = s.controller === 0 ? 1 : 0;
      cannon.player = s.controller;
    }
    return true;
  }

  private stepInvaders(): void {
    const world = this.world;
    const descended = stepGrid(world.grid, world.invaders);
    this.state.events.push({ type: 'march', step: world.grid.march });
    if (!descended) return;

    const bounds = aliveBounds(world.grid, world.invaders);
    if (!bounds) return;
    // Les boucliers disparaissent quand les envahisseurs arrivent à leur hauteur.
    if (bounds.bottom >= SHIELDS.y) world.shieldsGone = true;
    if (bounds.bottom >= CANNON.y) this.invasion();
  }

  private invasion(): void {
    const s = this.state;
    s.invaded = true;
    s.hits[this.rules.alternatingTurns ? s.turn : 0] = 0;
    for (const cannon of s.cannons) this.addExplosion('cannon', cannon.x, cannon.y, cannon.w, null);
    this.enterHitPause(s.cannons[0]?.player ?? 0);
  }

  private updateBombDrops(dt: number): void {
    const world = this.world;
    world.bombTimer -= dt;
    if (world.bombTimer > 0) return;
    const bombs = world.projectiles.filter(p => p.kind === 'bomb').length;
    if (bombs < BOMBS.maxActive) this.dropBomb();
    const waveFactor = Math.max(INVADERS.minWaveFactor, Math.pow(INVADERS.waveFactor, world.wave - 1));
    world.bombTimer = randomBetween(this.random, BOMBS.minDelay, BOMBS.maxDelay) * waveFactor;
  }

  /** Seul l'envahisseur le plus bas de chaque colonne peut lâcher une bombe. */
  private dropBomb(): void {
    const world = this.world;
    const bottoms = new Map<number, (typeof world.invaders)[number]>();
    for (const invader of world.invaders) {
      if (!invader.alive) continue;
      const current = bottoms.get(invader.col);
      if (!current || invader.row > current.row) bottoms.set(invader.col, invader);
    }
    const shooters = [...bottoms.values()];
    if (shooters.length === 0) return;

    let shooter = shooters[Math.floor(this.random() * shooters.length)];
    const target = this.state.cannons[Math.floor(this.random() * this.state.cannons.length)];
    if (target && this.random() < BOMBS.aimChance) {
      const targetX = target.x + target.w / 2;
      shooter = shooters.reduce((best, candidate) => {
        const a = invaderRect(world.grid, candidate);
        const b = invaderRect(world.grid, best);
        return Math.abs(a.x + a.w / 2 - targetX) < Math.abs(b.x + b.w / 2 - targetX) ? candidate : best;
      });
    }
    if (!shooter) return;
    const rect = invaderRect(world.grid, shooter);
    const { fastBombs, zigzagBombs } = this.state.variation;
    world.projectiles.push(createBomb(rect.x + rect.w / 2, rect.y + rect.h, fastBombs, zigzagBombs));
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.world.projectiles]) {
      moveProjectile(projectile, dt);
      if (projectile.kind === 'beam') this.resolveBeam(projectile);
      else this.resolveBomb(projectile);
      if (this.state.status !== 'playing') return;
    }
  }

  private removeProjectile(projectile: Projectile): void {
    const list = this.world.projectiles;
    const index = list.indexOf(projectile);
    if (index >= 0) list.splice(index, 1);
  }

  /** Score crédité par un tir : celui du joueur du tour (B), du canon (C, D) ou le score commun. */
  private scoreIndexFor(cannonIndex: number): number {
    if (this.rules.scoreCount === 1) return 0;
    if (this.rules.alternatingTurns) return this.state.turn;
    return this.state.cannons[cannonIndex]?.player ?? cannonIndex;
  }

  private addScore(index: number, points: number): void {
    this.state.scores[index] = (this.state.scores[index] ?? 0) + points;
  }

  private resolveBeam(beam: Projectile): void {
    const world = this.world;
    if (beam.y + beam.h < BEAM.topLimit) {
      this.removeProjectile(beam);
      return;
    }

    const ship = world.commandShip;
    if (ship && overlap(beam, ship)) {
      const points = this.rules.commandShipValue;
      this.addScore(this.scoreIndexFor(beam.owner), points);
      this.addExplosion('ship', ship.x, ship.y, ship.w, String(points));
      world.commandShip = null;
      this.state.events.push({ type: 'ship-hit', points });
      this.removeProjectile(beam);
      return;
    }

    for (const invader of world.invaders) {
      if (!invader.alive) continue;
      const rect = invaderRect(world.grid, invader);
      if (!overlap(beam, rect)) continue;
      invader.alive = false;
      this.addScore(this.scoreIndexFor(beam.owner), scoreForRow(invader.row));
      // Les envahisseurs invisibles réapparaissent brièvement à chaque impact.
      world.revealTimer = INVADERS.revealTime;
      this.addExplosion('invader', rect.x, rect.y, rect.w, null);
      this.state.events.push({ type: 'invader-hit' });
      this.removeProjectile(beam);
      return;
    }

    if (this.hitShields(beam, 'up')) this.removeProjectile(beam);
  }

  private resolveBomb(bomb: Projectile): void {
    if (bomb.y + bomb.h >= GROUND_Y) {
      this.removeProjectile(bomb);
      return;
    }
    if (this.hitShields(bomb, 'down')) {
      this.removeProjectile(bomb);
      return;
    }
    for (const cannon of this.state.cannons) {
      if (!overlap(bomb, cannon)) continue;
      this.removeProjectile(bomb);
      this.cannonHit(cannon);
      return;
    }
  }

  private hitShields(projectile: Projectile, direction: 'up' | 'down'): boolean {
    const world = this.world;
    if (world.shieldsGone) return false;
    const offset = shieldOffset(world.shieldTime, this.state.variation.movingShields);
    for (const shield of world.shields) {
      if (hitShield(shield, projectile, direction, offset)) {
        this.state.events.push({ type: 'shield-hit' });
        return true;
      }
    }
    return false;
  }

  private cannonHit(cannon: Cannon): void {
    const s = this.state;
    this.addExplosion('cannon', cannon.x, cannon.y, cannon.w, null);
    s.hitCannon = cannon.index;
    // Familles C et D : l'adversaire du joueur touché marque 200 points.
    if (this.rules.hitBonus > 0) this.addScore(cannon.player === 0 ? 1 : 0, this.rules.hitBonus);
    const hitsIndex = this.rules.alternatingTurns ? s.turn : 0;
    s.hits[hitsIndex] = Math.max(0, (s.hits[hitsIndex] ?? 0) - 1);
    this.enterHitPause(cannon.player);
  }

  private enterHitPause(player: number): void {
    const s = this.state;
    const world = this.world;
    s.events.push({ type: 'cannon-hit', player });
    s.status = 'player-hit';
    s.statusTimer = RULES.hitPause;
    world.projectiles.length = 0;
    if (world.commandShip) {
      world.commandShip = null;
      s.events.push({ type: 'ship-gone' });
    }
  }

  private afterHit(): void {
    const s = this.state;
    s.hitCannon = null;
    this.world.explosions.length = 0;

    if (this.isGameOver()) {
      this.endGame();
      return;
    }

    if (this.rules.alternatingTurns) {
      const other = s.turn === 0 ? 1 : 0;
      if ((s.hits[other] ?? 0) > 0) {
        s.turn = other;
        s.activeWorld = other;
        s.invaded = false;
        // Les boucliers sont entièrement restaurés à chaque tour.
        const world = this.world;
        world.shields = createShields();
        world.projectiles.length = 0;
        world.revealTimer = INVADERS.waveRevealTime;
        s.cannons = this.createCannons();
        s.status = 'turn-change';
        s.statusTimer = RULES.turnChangePause;
        s.events.push({ type: 'turn-change', player: other });
        return;
      }
      // L'adversaire n'a plus de vies : la partie continue avec le même joueur.
      if (s.invaded) {
        this.endGame();
        return;
      }
    }

    s.cannons = this.createCannons();
    s.status = 'playing';
  }

  private isGameOver(): boolean {
    const s = this.state;
    if (this.rules.alternatingTurns) return s.hits.every(hits => hits <= 0);
    return (s.hits[0] ?? 0) <= 0;
  }

  private endGame(): void {
    const s = this.state;
    s.status = 'game-over';
    s.pausedStatus = null;
    if (this.rules.scoreCount === 2) {
      const [left = 0, right = 0] = s.scores;
      s.winner = left === right ? 'tie' : left > right ? 0 : 1;
    }
    s.events.push({ type: 'game-over' });
  }

  private clearWave(): void {
    const s = this.state;
    const world = this.world;
    s.status = 'wave-cleared';
    s.statusTimer = RULES.waveClearedPause;
    world.projectiles.length = 0;
    if (world.commandShip) {
      world.commandShip = null;
      s.events.push({ type: 'ship-gone' });
    }
    s.events.push({ type: 'wave-cleared' });
  }

  /** Nouvelle vague plus basse, boucliers restaurés. */
  private nextWave(): void {
    const s = this.state;
    const previous = this.world;
    const world = this.createWorld(previous.wave + 1);
    s.worlds[s.activeWorld] = world;
    s.status = 'playing';
  }

  private updateCommandShip(dt: number): void {
    const world = this.world;
    if (!world.commandShip) {
      world.commandShipTimer -= dt;
      if (world.commandShipTimer <= 0) {
        world.commandShip = createCommandShip(this.random() < 0.5 ? 1 : -1);
        world.commandShipTimer = randomBetween(this.random, COMMAND_SHIP.minDelay, COMMAND_SHIP.maxDelay);
        this.state.events.push({ type: 'ship-appear' });
      }
      return;
    }
    if (!moveCommandShip(world.commandShip, dt)) {
      world.commandShip = null;
      this.state.events.push({ type: 'ship-gone' });
    }
  }

  private addExplosion(kind: 'invader' | 'ship' | 'cannon', x: number, y: number, w: number, label: string | null): void {
    const duration = kind === 'ship' ? 1 : kind === 'cannon' ? RULES.hitPause : 0.25;
    this.world.explosions.push({ kind, x, y, w, timer: duration, label });
  }

  private updateExplosions(dt: number): void {
    const world = this.world;
    for (const explosion of world.explosions) explosion.timer -= dt;
    world.explosions = world.explosions.filter(explosion => explosion.timer > 0);
  }

  private invadersVisible(): boolean {
    const s = this.state;
    if (!s.variation.invisibleInvaders) return true;
    if (s.status === 'ready' || s.status === 'wave-cleared' || s.status === 'game-over') return true;
    return this.world.revealTimer > 0;
  }
}

/** Largeur du canon pour une difficulté (exposée pour le rendu et les tests). */
export { cannonWidth };
