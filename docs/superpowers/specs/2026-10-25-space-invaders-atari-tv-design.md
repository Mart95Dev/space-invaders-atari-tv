# Space Invaders Atari 2600 TV — Conception

Date : 2026-10-25
Statut : conception validée oralement, en attente de relecture du document

## 1. Objectif

Créer, dans un dossier indépendant nommé `space-invaders-atari-tv`, une reconstitution jouable de **Space Invaders pour Atari 2600 (1980)**, destinée à un Mac ou PC relié à une TV en HDMI. Le jeu doit être utilisable avec une ou deux manettes, en plein écran, sans dépendre d’un service en ligne.

Le projet existant `space-invaders-html5` reste inchangé. Il sert de référence technique pour les entrées et le rendu Canvas, mais sa logique inspirée de l’arcade n’est pas reprise telle quelle.

La fidélité recherchée est comportementale et audiovisuelle : reprendre les règles, les variantes, l’esprit graphique et sonore de la cartouche Atari, sans embarquer de ROM ni réaliser une émulation cycle par cycle du processeur.

## 2. Périmètre

### Inclus

- Les 112 variantes officielles et leur numérotation d’origine.
- Les modes à un et deux joueurs, en local, sur le même écran.
- Les difficultés Atari A et B, indépendantes pour les deux joueurs.
- Le clavier comme solution de secours.
- Le plein écran et une mise à l’échelle adaptée aux TV 1080p et 4K.
- Les sons synthétisés localement.
- Une matrice de sélection consultable pour identifier les règles d’une variante.
- Les tests automatisés des règles et un parcours de validation navigateur.

### Exclus

- Jeu en réseau, classements en ligne et comptes utilisateurs.
- Power-ups, armes modernes, succès, niveaux inédits ou effets visuels modernes.
- Émulation d’une ROM ou distribution de contenus protégés extraits d’une cartouche.
- Application Android TV, application Electron et publication en ligne.
- Filtre CRT activé par défaut ; il n’entre pas dans la première version.

## 3. Référence et règles du jeu

La référence principale est le manuel Atari 2600 de 1980, notamment sa « Game Matrix », ses règles de jeu et son tableau de score :

- https://atariage.com/manual_html_page.php?SoftwareLabelID=460

### Socle commun

- Une vague contient 36 envahisseurs répartis en 6 rangées de 6.
- Les rangées valent, de bas en haut, 5, 10, 15, 20, 25 et 30 points.
- Une vague complète vaut donc 630 points, hors vaisseau de commandement.
- La vitesse des envahisseurs augmente à mesure que leur nombre diminue.
- Les vagues suivantes commencent plus bas, jusqu’à une limite minimale.
- Trois boucliers destructibles se trouvent entre les envahisseurs et les canons.
- Les tirs du joueur et les bombes ennemies endommagent les boucliers.
- Les boucliers disparaissent lorsque les envahieurs descendent à leur niveau.
- Le vaisseau de commandement traverse périodiquement le haut de l’écran.
- Il vaut 200 points, sauf dans les familles C et D où il vaut 100 points.
- Le score affiché est limité à quatre chiffres, avec un maximum affiché de 9999.
- Le joueur ne peut tirer à nouveau que lorsque son tir précédent a touché une cible ou quitté l’écran.
- La partie normale se termine après trois impacts ou lorsque les envahisseurs atteignent la Terre.

### Matrice des 16 combinaisons

Pour un numéro de partie `n` compris entre 1 et 112 :

```text
famille = plancher((n - 1) / 16)       // 0 à 6, correspondant à A à G
variante = (n - 1) modulo 16           // 0 à 15

boucliers mobiles   = (variante & 1) != 0
bombes en zigzag    = (variante & 2) != 0
bombes rapides      = (variante & 4) != 0
envahisseurs invisibles = (variante & 8) != 0
```

Ces quatre options sont indépendantes et toutes leurs combinaisons sont disponibles dans chaque famille.

### Sept familles de jeu

| Famille | Numéros | Règles |
|---|---:|---|
| A | 1–16 | Un joueur contre l’ordinateur. |
| B | 17–32 | Deux adversaires jouent en alternance, chacun avec sa propre vague. Les boucliers sont restaurés à chaque tour. Trois impacts par joueur ; meilleur score gagnant. |
| C | 33–48 | Deux adversaires jouent simultanément. Le vaisseau bonus vaut 100 points. Un joueur touché donne 200 points à son adversaire. La partie s’arrête après trois impacts au total ou une invasion. |
| D | 49–64 | Comme C, mais les joueurs tirent à tour de rôle. Une attente trop longue déclenche le tir automatique et passe la main. |
| E | 65–80 | Coopération avec un canon commun : le joueur gauche déplace vers la gauche, le joueur droit vers la droite ; les deux peuvent tirer. Score commun. |
| F | 81–96 | Coopération avec alternance du contrôle complet après chaque tir. Score commun. |
| G | 97–112 | Coopération : le joueur gauche déplace le canon, le joueur droit tire. Score commun. |

### Difficultés

- Position B : canon de largeur normale.
- Position A : canon deux fois plus large, donc plus exposé aux bombes.
- En solo, seule la difficulté du joueur gauche est utilisée.
- Dans les modes à deux canons, chaque joueur possède son propre réglage.
- Dans les modes à canon commun, seule la difficulté gauche est utilisée pour déterminer sa largeur ; le réglage droit reste sans effet jusqu’au choix d’un mode à deux canons.

### Invisibilité

Les envahisseurs deviennent invisibles après le début du jeu. Lorsqu’un envahisseur est touché, les survivants réapparaissent brièvement avant de disparaître de nouveau. Les collisions restent actives pendant l’invisibilité.

## 4. Expérience TV et commandes

### Démarrage et sélection

L’écran initial reprend la logique de la console : numéro de partie en haut à gauche et nombre de joueurs en haut à droite. La sélection affiche également un résumé lisible des quatre options et de la famille active, sans modifier l’écran de jeu lui-même.

- Gauche/droite ou Select : changer le numéro de variante.
- Maintenir la commande : défilement progressif.
- Select + Start : défilement rapide, comme le raccourci décrit dans le manuel.
- Start : lancer ou réinitialiser la partie.
- Une commande dédiée affiche la matrice complète et les commandes.
- Les difficultés A/B sont réglables avant la partie.

### Pendant le jeu

- Stick gauche ou croix : déplacement horizontal.
- Bouton A / croix des manettes Xbox, ou bouton principal équivalent : tir.
- Start : pause ou reprise.
- Select maintenu : retour à la sélection après confirmation à l’écran.
- Le clavier permet les mêmes actions essentielles.

La pause est une commodité moderne qui fige entièrement la simulation et les sons, sans changer les règles de scoring ou de déplacement.

### Attribution des manettes

- Première manette active : joueur gauche / joueur 1.
- Deuxième manette active : joueur droit / joueur 2.
- Une seule manette reste suffisante pour tous les modes solo.
- Les modes deux joueurs indiquent clairement si la seconde manette manque.
- Une déconnexion met le jeu en pause et affiche une consigne de reconnexion.
- Les entrées analogiques sont converties en direction discrète avec zone morte, afin de conserver le comportement du joystick Atari.

### Plein écran

Le jeu occupe toute la hauteur disponible, conserve son ratio et centre l’image avec des bandes noires si nécessaire. Aucune aide texte ou commande HTML ne vient réduire le terrain pendant une partie.

Le lancement du plein écran utilise la Fullscreen API. Si le navigateur exige un clic ou une touche pour l’autoriser, un écran d’accueil très simple demande cette action une seule fois ; toutes les actions suivantes sont réalisables à la manette.

## 5. Architecture technique

### Stack

- TypeScript strict.
- Vite pour le développement et la construction.
- Canvas 2D pour le terrain et les sprites.
- Web Audio API pour les sons.
- Gamepad API pour une ou deux manettes.
- Vitest pour les tests unitaires.
- Playwright pour les tests du parcours navigateur.

Aucun framework d’interface et aucun moteur de jeu externe ne sont nécessaires.

### Organisation prévue

```text
space-invaders-atari-tv/
  index.html
  package.json
  src/
    main.ts
    config/
      variations.ts
      tuning.ts
    engine/
      game.ts
      state.ts
      collisions.ts
      scoring.ts
    entities/
      invaders.ts
      cannons.ts
      projectiles.ts
      shields.ts
      command-ship.ts
    input/
      gamepads.ts
      keyboard.ts
      actions.ts
    rendering/
      renderer.ts
      sprites.ts
      palette.ts
      screens.ts
    audio/
      audio.ts
    styles.css
  tests/
    variations.test.ts
    scoring.test.ts
    rules.test.ts
    collisions.test.ts
    browser.spec.ts
  docs/
```

Cette organisation pourra être légèrement simplifiée si un regroupement produit des unités plus cohérentes, mais les responsabilités restent séparées.

### Boucle et modèle

La simulation utilise une cadence fixe, indépendante de la fréquence d’affichage. Le rendu interpole uniquement ce qui ne change pas la logique ; les collisions et les scores sont calculés exclusivement dans la simulation.

Les états principaux sont :

```text
boot -> selection -> playing <-> paused
                    playing -> player-hit -> playing
                    playing -> wave-cleared -> playing
                    playing -> game-over -> selection ou nouvelle partie
```

La famille B ajoute un état de changement de joueur et conserve deux mondes distincts. Les familles C et D utilisent un monde commun avec deux canons et deux scores. Les familles E, F et G utilisent un canon et un score communs.

Les options d’une variante sont résolues une fois au lancement dans un objet de configuration immutable. Les entités ne lisent pas directement le numéro de partie.

### Rendu

- Terrain logique basse résolution de 160 × 192 unités, présenté dans un cadre 4:3.
- Mise à l’échelle entière lorsque la taille de l’écran le permet.
- `imageSmoothingEnabled = false` et aucune interpolation floue des sprites.
- Palette restreinte inspirée de la version NTSC Atari 2600.
- Sprites construits localement à partir de motifs de pixels, en s’appuyant sur les formes du manuel et sur des références visuelles.
- Aucun lissage, bloom, particules modernes ou animation superflue.

Le réglage exact des vitesses, délais et positions sera centralisé dans `tuning.ts`, comparé à des références de la version Atari et non recopié de la version arcade du projet initial.

### Audio

Les tirs, impacts, destructions, déplacements et vaisseau bonus utilisent de courts sons synthétisés. L’audio démarre après l’interaction exigée par le navigateur. La pause suspend les sons continus ; la reprise ne duplique pas les nœuds audio.

## 6. Gestion des erreurs et cas limites

- Perte du focus ou onglet masqué : pause automatique.
- Manette déconnectée : pause, conservation de l’état et reprise explicite.
- Plus de deux manettes : seules les deux premières actives sont affectées.
- Manette non standard : croix et bouton principal sont pris en charge lorsque le navigateur expose leur correspondance.
- Audio indisponible ou refusé : le jeu reste jouable, sans erreur bloquante.
- Stockage indisponible : aucune dépendance du gameplay au stockage local.
- Plein écran refusé : le jeu reste utilisable dans la fenêtre avec un message non bloquant.
- Changement de taille ou passage 1080p/4K : recalcul du cadre sans réinitialiser la partie.
- Très grand ralentissement : limitation du rattrapage de la boucle pour éviter une cascade de déplacements et de collisions.
- Appuis simultanés contradictoires : neutralisation gauche + droite, sauf règle spécifique d’un mode coopératif.
- Maintenir Start ou Select ne déclenche pas plusieurs transitions involontaires : les actions ponctuelles utilisent un front montant.

## 7. Tests et critères d’acceptation

### Tests unitaires

- Les numéros 1 et 112 sont valides ; les autres sorties de plage sont rejetées.
- Les 112 numéros produisent exactement 7 familles × 16 combinaisons.
- Les options suivent les quatre bits de la matrice officielle, notamment les parties 1, 2, 3, 5, 9 et 16.
- Les scores des six rangées et le total de 630 points sont exacts.
- Le vaisseau bonus vaut 200 points, puis 100 points dans C et D.
- Le score affiché ne dépasse pas 9999.
- Un canon ne peut pas créer un second tir tant que le premier est actif.
- Les boucliers perdent des pixels dans le bon sens selon la provenance du tir.
- L’invisibilité ne supprime ni les collisions ni le déplacement.
- Les bombes rapides et en zigzag peuvent être combinées.
- Les règles de tour, de score et de contrôle sont vérifiées pour chaque famille A à G.
- Le tir automatique de la famille D passe correctement la main.
- Le jeu se termine après le nombre d’impacts prévu par chaque famille.

### Tests navigateur

- Lancement de la partie 1 au clavier et avec une manette simulée.
- Sélection de plusieurs variantes représentatives et lancement de chaque famille.
- Pause, reprise, retour au menu et remise à zéro.
- Deux manettes simulées affectées aux bons joueurs.
- Déconnexion d’une manette sans perte de la partie.
- Redimensionnement 16:9 sans déformation ni chevauchement de l’interface.
- Aucune erreur de console pendant un parcours complet.

### Validation manuelle sur TV

- Image lisible et non floue en 1080p et 4K.
- Latence de déplacement et de tir perçue comme immédiate.
- Manettes Xbox et/ou PlayStation testées si disponibles.
- Toutes les actions nécessaires après l’autorisation initiale du plein écran sont accessibles sans souris.
- Comparaison visuelle et sonore de la partie 1 avec une référence Atari 2600.
- Vérification manuelle d’au moins une partie de chaque famille et d’une combinaison réunissant les quatre options.

## 8. Livraison

Le projet livré contient les sources, les tests et une courte documentation de lancement :

```bash
npm install
npm run dev
```

La construction de production utilise `npm run build`. Le projet reste entièrement local et séparé du dossier `space-invaders-html5`.
