# Space Invaders Atari 2600 TV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une reconstitution locale de Space Invaders Atari 2600 avec 112 variantes, un ou deux joueurs, manettes et affichage TV.

**Architecture:** Une simulation TypeScript pure à cadence fixe est séparée du rendu Canvas, de l’audio et des entrées. Le numéro de partie est résolu en configuration immutable ; les sept familles pilotent les règles de contrôle, de tour et de score.

**Tech Stack:** TypeScript strict, Vite, Canvas 2D, Web Audio API, Gamepad API, Vitest, Playwright.

## Global Constraints

- Le projet vit uniquement dans `space-invaders-atari-tv` et ne modifie pas `space-invaders-html5`.
- Les numéros de parties vont de 1 à 112 et suivent la matrice Atari validée.
- Le terrain logique est de 160 × 192 unités, présenté en 4:3 avec pixels nets.
- Une vague contient 36 envahisseurs en 6 × 6 ; les rangées valent 5 à 30 points.
- Aucun framework UI, moteur de jeu, ROM, backend ou service en ligne.
- La simulation est indépendante de la fréquence d’affichage.
- Les commandes TV sont numériques ; le clavier reste disponible.
- Chaque tâche suit un cycle test rouge, implémentation minimale, test vert et commit.

---

### Task 1: Initialiser le projet et la matrice des variantes

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/config/variations.ts`
- Test: `tests/variations.test.ts`

**Interfaces:**
- Produces: `type Family = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'`, `interface Variation`, `getVariation(gameNumber: number): Variation`.
- `Variation` expose `gameNumber`, `family`, `playerCount`, `movingShields`, `zigzagBombs`, `fastBombs`, `invisibleInvaders`.

- [ ] **Step 1: Créer la configuration et le test rouge**

`package.json` définit `dev: vite`, `build: tsc --noEmit && vite build`, `test: vitest run`, `test:watch: vitest`, `test:browser: playwright test`. Les dépendances sont limitées à Vite et TypeScript ; les dépendances de développement incluent Vitest et Playwright.

```ts
// tests/variations.test.ts
import { describe, expect, it } from 'vitest';
import { getVariation } from '../src/config/variations';

describe('matrice Atari', () => {
  it('couvre exactement 112 parties et sept familles', () => {
    const all = Array.from({ length: 112 }, (_, i) => getVariation(i + 1));
    expect(new Set(all.map(v => v.family)).size).toBe(7);
    expect(all[0]).toMatchObject({ family: 'A', playerCount: 1, movingShields: false });
    expect(all[111]).toMatchObject({ gameNumber: 112, family: 'G', invisibleInvaders: true });
  });

  it.each([
    [1, false, false, false, false],
    [2, true, false, false, false],
    [3, false, true, false, false],
    [5, false, false, true, false],
    [9, false, false, false, true],
    [16, true, true, true, true],
  ])('résout la partie %i', (n, moving, zigzag, fast, invisible) => {
    expect(getVariation(n)).toMatchObject({
      movingShields: moving, zigzagBombs: zigzag,
      fastBombs: fast, invisibleInvaders: invisible,
    });
  });

  it.each([0, 113, -1, 1.5])('refuse %i', n => expect(() => getVariation(n)).toThrow(RangeError));
});
```

- [ ] **Step 2: Vérifier l’échec**

Run: `npm install && npm test`
Expected: échec d’import de `src/config/variations.ts`.

- [ ] **Step 3: Implémenter la matrice**

```ts
export type Family = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export interface Variation {
  gameNumber: number;
  family: Family;
  playerCount: 1 | 2;
  movingShields: boolean;
  zigzagBombs: boolean;
  fastBombs: boolean;
  invisibleInvaders: boolean;
}
const families: readonly Family[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export function getVariation(gameNumber: number): Variation {
  if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 112) {
    throw new RangeError('Le numéro de partie doit être un entier entre 1 et 112.');
  }
  const index = gameNumber - 1;
  const variant = index % 16;
  const family = families[Math.floor(index / 16)];
  return Object.freeze({
    gameNumber, family, playerCount: family === 'A' ? 1 : 2,
    movingShields: Boolean(variant & 1), zigzagBombs: Boolean(variant & 2),
    fastBombs: Boolean(variant & 4), invisibleInvaders: Boolean(variant & 8),
  });
}
```

- [ ] **Step 4: Vérifier et committer**

Run: `npm test && npm run build`
Expected: tests verts et compilation sans erreur.

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src tests
git commit -m "feat: ajoute la matrice des 112 variantes"
```

### Task 2: Construire les entités, scores et collisions

**Files:**
- Create: `src/config/tuning.ts`, `src/engine/types.ts`, `src/engine/scoring.ts`, `src/engine/collisions.ts`
- Create: `src/entities/invaders.ts`, `src/entities/shields.ts`, `src/entities/projectiles.ts`
- Test: `tests/scoring.test.ts`, `tests/collisions.test.ts`, `tests/entities.test.ts`

**Interfaces:**
- Produces: `Rect`, `Invader`, `Cannon`, `Projectile`, `Shield`, `createInvaders()`, `createShields()`, `scoreForRow(row)`, `displayScore(score)`, `overlap(a, b)`, `hitShield(shield, shot)`.
- `createInvaders(): Invader[]` crée les rangées dans l’ordre haut vers bas ; `row = 0` vaut 30 points et `row = 5` vaut 5 points.

- [ ] **Step 1: Écrire les tests rouges**

```ts
expect(Array.from({ length: 6 }, (_, r) => scoreForRow(r))).toEqual([30, 25, 20, 15, 10, 5]);
expect(Array.from({ length: 6 }, (_, r) => scoreForRow(r)).reduce((a, b) => a + b * 6, 0)).toBe(630);
expect(displayScore(10000)).toBe(9999);
expect(createInvaders()).toHaveLength(36);
expect(createShields()).toHaveLength(3);
expect(overlap({ x: 0, y: 0, w: 4, h: 4 }, { x: 3, y: 3, w: 2, h: 2 })).toBe(true);
```

Ajouter un test où un tir montant retire des pixels au bas d’un bouclier et un tir descendant en retire au sommet.

- [ ] **Step 2: Vérifier l’échec**

Run: `npm test`
Expected: imports et fonctions du moteur absents.

- [ ] **Step 3: Implémenter les unités pures**

`scoring.ts` utilise `const ROW_POINTS = [30, 25, 20, 15, 10, 5] as const`, borne `displayScore` à `9999` et lève `RangeError` pour une rangée hors de 0–5. `collisions.ts` utilise des inégalités strictes. `shields.ts` stocke `Uint8Array`, recherche le premier pixel solide dans la direction du projectile et efface un petit masque d’impact déterministe. `projectiles.ts` fournit les rectangles et déplacements sans accéder au DOM.

- [ ] **Step 4: Vérifier et committer**

Run: `npm test && npm run build`
Expected: tous les tests passent.

```bash
git add src tests
git commit -m "feat: ajoute les entités et collisions du jeu"
```

### Task 3: Réaliser la boucle solo et les options de difficulté

**Files:**
- Create: `src/engine/game.ts`, `src/engine/state.ts`, `src/entities/cannons.ts`, `src/entities/command-ship.ts`
- Modify: `src/config/tuning.ts`
- Test: `tests/game-solo.test.ts`

**Interfaces:**
- Consumes: interfaces des tâches 1 et 2.
- Produces: `class Game`, `new Game(gameNumber: number, seed?: number)`, `game.start()`, `game.update(dt: number, controls: ControlFrame)`, `game.pause()`, `game.resume()`, `game.snapshot(): Readonly<GameState>`.
- `ControlFrame` contient deux `PlayerControls { left: boolean; right: boolean; fire: boolean }`.

- [ ] **Step 1: Écrire les tests rouges**

Vérifier : initialisation à trois vies et 36 envahisseurs ; un seul tir actif par canon ; déplacement borné ; score après impact ; accélération quand le nombre diminue ; disparition des boucliers à l’approche ; invisibilité temporairement levée après un impact ; bombes rapides et zigzaguantes combinables ; nouvelle vague plus basse ; fin après trois impacts ou invasion ; canon A deux fois plus large que B.

```ts
const game = new Game(1, 42);
game.start();
game.update(1 / 60, { players: [{ left: false, right: false, fire: true }, EMPTY_CONTROLS] });
expect(game.snapshot().projectiles.filter(p => p.owner === 0)).toHaveLength(1);
game.update(1 / 60, { players: [{ left: false, right: false, fire: true }, EMPTY_CONTROLS] });
expect(game.snapshot().projectiles.filter(p => p.owner === 0)).toHaveLength(1);
```

- [ ] **Step 2: Vérifier l’échec puis implémenter**

Run: `npm test -- tests/game-solo.test.ts`
Expected: `Game` absent.

La machine d’état couvre `selection`, `playing`, `paused`, `player-hit`, `wave-cleared`, `game-over`. `update` refuse les `dt` non finis ou négatifs. Un générateur pseudo-aléatoire seedé pilote les tirs ennemis et le vaisseau bonus. Les événements audio sont enregistrés dans `GameState.events`, puis consommés par l’interface.

- [ ] **Step 3: Vérifier et committer**

Run: `npm test && npm run build`
Expected: socle solo entièrement vert.

```bash
git add src tests
git commit -m "feat: implémente la boucle solo Atari"
```

### Task 4: Implémenter les six familles à deux joueurs

**Files:**
- Modify: `src/engine/game.ts`, `src/engine/state.ts`, `src/engine/scoring.ts`
- Create: `src/engine/player-rules.ts`
- Test: `tests/player-rules.test.ts`

**Interfaces:**
- Produces: `rulesForFamily(family: Family): PlayerRules`, avec `cannons: 1 | 2`, `sharedScore: boolean`, `alternatingTurns: boolean`, `alternatingFire: boolean`.
- Le même `Game` et les mêmes `ControlFrame` sont utilisés sans API parallèle.

- [ ] **Step 1: Écrire les tests rouges par famille**

```ts
it.each([
  [17, 'B'], [33, 'C'], [49, 'D'], [65, 'E'], [81, 'F'], [97, 'G'],
])('accepte la famille de la partie %i', n => expect(() => new Game(n)).not.toThrow());
```

Tester séparément : B conserve deux mondes et restaure les boucliers à chaque tour ; C attribue 200 points à l’adversaire d’un joueur touché et termine après trois impacts cumulés ; D impose un seul tireur et tire automatiquement après le délai ; E limite chaque joueur à une direction ; F change de contrôleur après un tir ; G donne le déplacement au joueur 1 et le tir au joueur 2. Vérifier les scores communs de E/F/G et les valeurs du vaisseau bonus.

- [ ] **Step 2: Vérifier l’échec puis implémenter**

Run: `npm test -- tests/player-rules.test.ts`
Expected: règles de familles absentes.

`player-rules.ts` centralise les décisions de contrôle. `Game` conserve deux mondes uniquement pour B, deux canons pour C/D et un canon pour E/F/G. Aucun rendu ou périphérique ne participe à ces décisions.

- [ ] **Step 3: Vérifier et committer**

Run: `npm test && npm run build`
Expected: les 112 configurations se construisent et tous les tests de règles passent.

```bash
git add src tests
git commit -m "feat: ajoute les modes deux joueurs officiels"
```

### Task 5: Créer le rendu Atari, les écrans et le son

**Files:**
- Create: `src/rendering/palette.ts`, `src/rendering/sprites.ts`, `src/rendering/renderer.ts`, `src/rendering/screens.ts`
- Create: `src/audio/audio.ts`, `src/styles.css`, `src/main.ts`
- Modify: `index.html`
- Test: `tests/renderer.test.ts`

**Interfaces:**
- Consumes: `Game.snapshot()` et `GameState.events`.
- Produces: `Renderer.render(state: Readonly<GameState>, selection: SelectionState)`, `AudioBus.unlock()`, `AudioBus.consume(events)`, `AudioBus.suspend()`, `AudioBus.resume()`.

- [ ] **Step 1: Écrire les tests rouges de rendu**

Utiliser un contexte Canvas simulé. Vérifier que le fond noir est tracé, que 36 sprites sont dessinés au départ, que les envahisseurs invisibles ne sont pas dessinés hors révélation, que les deux scores apparaissent en compétition et que `imageSmoothingEnabled` reste faux.

- [ ] **Step 2: Implémenter les pixels et écrans**

Run avant implémentation: `npm test -- tests/renderer.test.ts`
Expected: module de rendu absent.

Les motifs décrivent les six envahisseurs, le canon normal/large, les trois boucliers et le vaisseau bonus. La palette utilise bandes vertes, jaunes, orange et blanches sur noir. Les écrans de sélection affichent numéro, famille, joueurs, options et difficultés ; la matrice présente les plages A–G et les bits des 16 combinaisons.

- [ ] **Step 3: Ajouter l’audio et vérifier**

`AudioBus` utilise des oscillateurs et un tampon de bruit local. Il ne crée le contexte qu’après `unlock()`, ignore les événements en pause et arrête les sons continus à la suspension.

Run: `npm test && npm run build`
Expected: tests et compilation réussis.

```bash
git add index.html src tests
git commit -m "feat: ajoute le rendu et les sons Atari TV"
```

### Task 6: Intégrer clavier, deux manettes et cycle TV

**Files:**
- Create: `src/input/actions.ts`, `src/input/gamepads.ts`, `src/input/keyboard.ts`
- Modify: `src/main.ts`, `src/styles.css`
- Test: `tests/gamepads.test.ts`

**Interfaces:**
- Produces: `InputManager.poll(): InputSnapshot`, `InputSnapshot.controls: ControlFrame`, `InputSnapshot.pressed: Set<Action>`, `InputSnapshot.connected: string[]`.
- Actions : `select-next`, `select-previous`, `start`, `pause`, `matrix`, `difficulty-left`, `difficulty-right`, `back`.

- [ ] **Step 1: Écrire les tests rouges des entrées**

Simuler `navigator.getGamepads`. Vérifier zone morte, croix, fronts montants, affectation stable des deux manettes, neutralisation gauche/droite, maintien de Select et déconnexion. Tester le mapping clavier : flèches/Q/D, Espace, Entrée, P/Échap, Tab/Select et F pour le plein écran.

- [ ] **Step 2: Implémenter les entrées et le plein écran**

Run avant implémentation: `npm test -- tests/gamepads.test.ts`
Expected: adaptateur de manettes absent.

`main.ts` possède une boucle à pas fixe `1 / 60`, au maximum cinq rattrapages par image, et remet l’accumulateur à zéro après pause. Un bouton HTML initial autorise audio et plein écran ; il disparaît ensuite. Le redimensionnement conserve le 4:3 et ne touche pas au modèle. Perte de focus et déconnexion mettent en pause.

- [ ] **Step 3: Vérifier et committer**

Run: `npm test && npm run build`
Expected: entrées, moteur et compilation réussis.

```bash
git add src tests
git commit -m "feat: ajoute les manettes et l’affichage plein écran"
```

### Task 7: Valider dans le navigateur et documenter

**Files:**
- Create: `playwright.config.ts`, `tests/browser.spec.ts`, `README.md`
- Modify: fichiers sources uniquement si un test démontre un défaut.

**Interfaces:**
- Consumes: application complète via `npm run dev -- --host 0.0.0.0 --port 7100`.

- [ ] **Step 1: Écrire le parcours navigateur**

Playwright charge la page, autorise le démarrage, lance la partie 1 au clavier, contrôle pause/reprise, ouvre la matrice, choisit la partie 16 et vérifie le résumé des quatre options. Un second test injecte deux manettes simulées avant le chargement, lance la partie 33 et vérifie deux scores. Un troisième test passe de 1280 × 720 à 3840 × 2160 et vérifie que le cadre conserve le ratio 4:3 sans défilement.

- [ ] **Step 2: Exécuter la validation complète**

Run: `npm test && npm run build && npm run test:browser`
Expected: tests unitaires, compilation et parcours navigateur verts ; aucune erreur de console.

- [ ] **Step 3: Documenter le lancement et les commandes**

`README.md` indique `npm install`, `npm run dev`, l’adresse locale, la procédure HDMI/plein écran, les commandes des deux joueurs, la matrice des variantes et la différence entre cette reconstitution et une émulation de ROM.

- [ ] **Step 4: Vérifier visuellement puis committer**

Capturer la sélection et une partie à 1280 × 720 et 1920 × 1080. Vérifier lisibilité, pixels nets, absence de déformation et visibilité des informations. Arrêter le serveur temporaire après validation.

```bash
git add README.md playwright.config.ts tests src
git commit -m "test: valide le jeu sur navigateur et TV"
git status --short
```

Expected: espace de travail propre. Les tests avec de vraies manettes et une TV physique restent une validation utilisateur si le matériel n’est pas accessible pendant l’implémentation.
