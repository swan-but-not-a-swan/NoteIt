// RN has no equivalent of CSS's color-mix(), which the web reference uses
// for the tinted folder rows. An rgba overlay of the accent color reads the
// same way visually and is cheap to compute from a plain hex string.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
