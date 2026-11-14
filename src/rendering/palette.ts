/**
 * Palette restreinte inspirée de la sortie NTSC de l'Atari 2600 :
 * couleurs unies, sans dégradé ni transparence.
 */
export const PALETTE = {
  background: '#000000',
  invaders: '#c8c46c',
  shields: '#c2681c',
  ground: '#6c7a28',
  player1: '#5cba5c',
  player2: '#e0a23c',
  player1Dim: '#2c5c2c',
  player2Dim: '#704f1c',
  commandShip: '#c84ca4',
  projectile: '#ececec',
  text: '#ececec',
  dim: '#8c8c8c',
  highlight: '#e0a23c',
  panel: '#000000',
  panelBorder: '#6c7a28',
} as const;

export function playerColor(player: number, dimmed = false): string {
  if (player === 1) return dimmed ? PALETTE.player2Dim : PALETTE.player2;
  return dimmed ? PALETTE.player1Dim : PALETTE.player1;
}
