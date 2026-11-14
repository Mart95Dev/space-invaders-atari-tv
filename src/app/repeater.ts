/**
 * Défilement progressif d'une commande maintenue : un pas immédiat,
 * puis une répétition qui accélère. Le mode rapide reproduit Select + Reset de la console.
 */
export class Repeater {
  private direction: -1 | 0 | 1 = 0;
  private timer = 0;
  private count = 0;

  update(direction: -1 | 0 | 1, dt: number, fast = false): number {
    if (direction === 0) {
      this.direction = 0;
      return 0;
    }
    if (direction !== this.direction) {
      this.direction = direction;
      this.timer = 0;
      this.count = 1;
      return direction;
    }
    this.timer += dt;
    let steps = 0;
    while (this.timer >= this.delay(fast)) {
      this.timer -= this.delay(fast);
      this.count++;
      steps++;
    }
    return steps * direction;
  }

  private delay(fast: boolean): number {
    if (fast) return 0.03;
    if (this.count === 1) return 0.4;
    return Math.max(0.05, 0.15 * Math.pow(0.85, this.count - 2));
  }
}

/** Numéro de partie suivant, en boucle de 1 à 112. */
export function wrapGame(gameNumber: number, delta: number): number {
  return ((((gameNumber - 1 + delta) % 112) + 112) % 112) + 1;
}
