export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceHi: string;
  paper: string;
  paperShadow: string;
  ink: string;
  tealOnPaper: string;
  textPrimary: string;
  accent: string;
  accentSolid: string;
  onAccent: string;
  teal: string;
  stone: string;
  stoneDim: string;
  line: string;
  error: string;
};

// "Ember Charcoal & Archive Teal" — warmed-off-black dark theme, softened for
// extended low-glare viewing. Ported verbatim from the web reference
// (smkpremiere-app_1.jsx) so both platforms stay WCAG AA contrast-checked
// from the same source of truth.
export const DARK_THEME: ThemeColors = {
  bg: "#211D19",
  surface: "#2C2721",
  surfaceHi: "#39322A",
  paper: "#F3EAD9",
  paperShadow: "#E4D6BD",
  ink: "#382C21",
  tealOnPaper: "#3C5F59",
  textPrimary: "#F3EAD9",
  accent: "#B87F42",
  accentSolid: "#B87F42",
  onAccent: "#241D16",
  teal: "#7FB0A8",
  stone: "#AFA394",
  stoneDim: "#998E7B",
  line: "rgba(255,255,255,0.07)",
  error: "#C97A6B",
};

// "Daylight Contact Sheet" — light theme, same token roles.
export const LIGHT_THEME: ThemeColors = {
  bg: "#F5EFE3",
  surface: "#FFFFFF",
  surfaceHi: "#F0E6D2",
  paper: "#F3EAD9",
  paperShadow: "#E4D6BD",
  ink: "#382C21",
  tealOnPaper: "#3C5F59",
  textPrimary: "#2B2318",
  accent: "#8A5F34",
  accentSolid: "#B87F42",
  onAccent: "#241D16",
  teal: "#3C5F59",
  stone: "#635A4D",
  stoneDim: "#756B5A",
  line: "rgba(43,35,24,0.10)",
  error: "#A8402E",
};

export function themeFor(mode: ThemeMode): ThemeColors {
  return mode === "light" ? LIGHT_THEME : DARK_THEME;
}

export const FOLDER_ACCENTS = ["#B87F42", "#5C8A83", "#B8865F", "#8B7EB0", "#B0716C"];

// Full swatch set offered in the folder color picker — same softened
// saturation as the core palette.
export const FOLDER_SWATCHES = [
  "#B87F42", // faded amber (default accent)
  "#5C8A83", // archive teal
  "#B8865F", // clay
  "#8B7EB0", // soft plum
  "#B0716C", // muted brick
  "#5F7F8C", // slate blue
  "#8C7A56", // olive
  "#9C6A88", // muted berry
];
