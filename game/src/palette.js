// Sci-fi tactical FPS — palette: dark base, neon accent, two team colors.
// Slightly brighter than pure sci-fi dark to keep screenshots legible.
export const PALETTE = {
  canvas: '#161a24',
  surface: '#1e2530',
  hairline: '#2f3845',
  ink: '#e7eef7',
  muted: '#7e8a9c',
  accent: '#22d3ee',      // cyan accent for UI / lasers
  accent2: '#a855f7',     // purple for energy / shields
  teamBlue: '#3b82f6',
  teamRed: '#ef4444',
  metal: '#3a4555',
  metalLight: '#4d5a6c',
  floor: '#1a2030',
  sky: '#0a121e',
  hazard: '#fbbf24',
  fog: '#0a121e',
  white: '#ffffff',
  black: '#000000',
};

// Convert hex to number for THREE.Color
export function hex(n) {
  return parseInt(n.replace('#', '0x'), 16);
}
