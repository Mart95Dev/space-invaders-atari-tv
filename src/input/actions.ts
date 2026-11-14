import type { ControlFrame, PlayerControls } from '../engine/types';

/** Actions ponctuelles de l'interface (déclenchées sur front montant). */
export type Action =
  | 'start'
  | 'select'
  | 'pause'
  | 'back'
  | 'matrix'
  | 'next'
  | 'previous'
  | 'difficulty-left'
  | 'difficulty-right'
  | 'fullscreen'
  | 'confirm';

export interface InputSnapshot {
  controls: ControlFrame;
  /** Actions déclenchées depuis le dernier relevé. */
  pressed: ReadonlySet<Action>;
  /** Actions maintenues. */
  held: ReadonlySet<Action>;
  /** Nom des manettes affectées au joueur gauche et au joueur droit. */
  pads: readonly [string | null, string | null];
  /** Emplacements dont la manette vient d'être déconnectée. */
  lost: readonly number[];
  /** Vrai si une touche ou un bouton a été actionné depuis le dernier relevé. */
  anyInput: boolean;
}

export function mergeControls(a: PlayerControls, b: PlayerControls): PlayerControls {
  return { left: a.left || b.left, right: a.right || b.right, fire: a.fire || b.fire };
}
