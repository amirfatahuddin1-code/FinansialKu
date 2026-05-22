export function hsvToHex(h: number, s: number, v: number): string {
  const hh = (h % 360) / 60;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const vv = Math.max(0, Math.min(100, v)) / 100;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = vv; g = t; b = p; break;
    case 1: r = q; g = vv; b = p; break;
    case 2: r = p; g = vv; b = t; break;
    case 3: r = p; g = q; b = vv; break;
    case 4: r = t; g = p; b = vv; break;
    case 5: r = vv; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / delta + 2) * 60;
    else h = ((r - g) / delta + 4) * 60;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function getHueColor(hue: number): string {
  return hsvToHex(hue, 100, 100);
}

export const SPECTRUM_COLORS = [
  { offset: '0%', color: '#FF0000' },
  { offset: '17%', color: '#FFFF00' },
  { offset: '33%', color: '#00FF00' },
  { offset: '50%', color: '#00FFFF' },
  { offset: '67%', color: '#0000FF' },
  { offset: '83%', color: '#FF00FF' },
  { offset: '100%', color: '#FF0000' },
];

export interface GradientDirection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  label: string;
  icon: string;
}

export const GRADIENT_DIRECTIONS: GradientDirection[] = [
  { start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, label: 'Kiri ke Kanan', icon: '→' },
  { start: { x: 1, y: 0 }, end: { x: 0, y: 0 }, label: 'Kanan ke Kiri', icon: '←' },
  { start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, label: 'Atas ke Bawah', icon: '↓' },
  { start: { x: 0, y: 1 }, end: { x: 0, y: 0 }, label: 'Bawah ke Atas', icon: '↑' },
  { start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, label: 'Diagonal \u21981', icon: '↘' },
  { start: { x: 1, y: 1 }, end: { x: 0, y: 0 }, label: 'Diagonal \u21982', icon: '↖' },
  { start: { x: 1, y: 0 }, end: { x: 0, y: 1 }, label: 'Diagonal \u21983', icon: '↙' },
  { start: { x: 0, y: 1 }, end: { x: 1, y: 0 }, label: 'Diagonal \u21984', icon: '↗' },
];
