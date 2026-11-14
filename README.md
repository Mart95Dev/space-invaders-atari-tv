# Space Invaders — Atari 2600 TV

Reconstitution jouable de **Space Invaders pour Atari 2600 (1980)**, pensée pour un Mac ou un PC relié à une TV en HDMI, avec une ou deux manettes.

Les 112 parties officielles du manuel sont disponibles, avec leur numérotation d'origine.

## Lancer le jeu

```bash
npm install
npm run dev
```

Ouvrir ensuite <http://localhost:7100>.

Version de production :

```bash
npm run build
npm run preview
```

## Sur la TV

1. Relier l'ordinateur à la TV en HDMI et ouvrir le jeu dans Chrome, Edge ou Safari.
2. Appuyer sur une touche ou cliquer : le jeu passe en plein écran et le son s'active (le navigateur exige ce premier geste).
3. Ensuite, tout se fait à la manette.

L'image garde le format 4:3 de l'époque, centrée avec des bandes noires. En 1080p et en 4K, elle est agrandie d'un facteur entier pour garder des pixels nets.

Si le jeu démarre par une manette, le plein écran n'est pas autorisé automatiquement : appuyer sur **F** ou double-cliquer.

## Commandes

| Action | Manette | Joueur 1 au clavier | Joueur 2 au clavier |
|---|---|---|---|
| Déplacer le canon | Stick gauche ou croix | ← → ou Q / D | J / L |
| Tirer | A (croix sur PlayStation) | Espace | K |
| Lancer, pause, reprise | Start | Entrée (P pour la pause) | |
| Changer de partie | Croix ← →, LB / RB, Select | ← →, Tab | |
| Défilement rapide | Select + Start maintenus | Tab + Entrée maintenus | |
| Matrice des parties | Y | M | |
| Canon large (difficulté A/B) | X (chaque joueur le sien) | 1 (joueur 1), 2 (joueur 2) | |
| Retour au choix de partie | Select, puis Start pour confirmer | Tab, puis Entrée | |
| Plein écran | | F ou double-clic | |

La première manette active est le joueur gauche, la deuxième le joueur droit. Une manette déconnectée met la partie en pause jusqu'à sa reconnexion.

## Les 112 parties

Numéro de partie = 16 × famille + variante.

| Famille | Parties | Règles |
|---|---:|---|
| A | 1–16 | Un joueur. |
| B | 17–32 | Deux joueurs chacun son tour, chacun sa vague. Boucliers restaurés à chaque tour. |
| C | 33–48 | Deux joueurs en même temps. Un joueur touché donne 200 points à l'autre. Vaisseau à 100 points. Fin après 3 impacts au total. |
| D | 49–64 | Comme C, mais les joueurs tirent à tour de rôle. Le tir part tout seul après 3 secondes d'attente. |
| E | 65–80 | Équipe, canon commun : joueur gauche vers la gauche, joueur droit vers la droite, les deux tirent. |
| F | 81–96 | Équipe, le contrôle complet change de joueur après chaque tir. |
| G | 97–112 | Équipe : le joueur gauche déplace, le joueur droit tire. |

Dans chaque famille, les 16 variantes combinent quatre options :

| Variante | Boucliers mobiles | Bombes en zigzag | Bombes rapides | Envahisseurs invisibles |
|---|---|---|---|---|
| 1 | | | | |
| 2 | ✓ | | | |
| 3 | | ✓ | | |
| 5 | | | ✓ | |
| 9 | | | | ✓ |
| 16 | ✓ | ✓ | ✓ | ✓ |

Les variantes intermédiaires suivent les mêmes bits (par exemple la 4 = boucliers mobiles + zigzag).

Règles communes : 36 envahisseurs en 6 rangées de 6, valant de 5 points (en bas) à 30 points (en haut), soit 630 points par vague. Vaisseau de commandement à 200 points. Trois impacts par partie. Score affiché plafonné à 9999.

## Reconstitution, pas émulation

Le jeu reproduit les règles, les variantes et l'esprit graphique et sonore de la cartouche. Il **n'émule pas** la console et n'utilise aucune ROM : sprites, sons et réglages (vitesses, délais) sont recréés à partir du manuel original et de références visuelles. Les réglages sont regroupés dans `src/config/tuning.ts`.

Référence : [manuel Atari 2600 sur AtariAge](https://atariage.com/manual_html_page.php?SoftwareLabelID=460).

## Développement

```bash
npm test              # tests unitaires (Vitest)
npm run test:browser  # parcours navigateur (Playwright, avec Google Chrome installé)
npm run build         # vérification des types et construction
```

| Dossier | Rôle |
|---|---|
| `src/config` | Matrice des 112 parties et réglages |
| `src/engine` | Simulation pure à pas fixe : règles, scores, collisions, familles de joueurs |
| `src/entities` | Envahisseurs, canons, tirs, boucliers, vaisseau |
| `src/rendering` | Rendu Canvas en pixels larges, police pixel, écrans |
| `src/input` | Clavier et manettes (Gamepad API) |
| `src/audio` | Sons synthétisés (Web Audio API) |
| `src/app` | Cycle de l'application : sélection, jeu, pause, menu |
