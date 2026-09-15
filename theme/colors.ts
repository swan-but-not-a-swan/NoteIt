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
//
// The neutrals are iOS's own light-mode system colours rather than a lightened
// version of the dark theme: a near-white grouped background with white cards
// on top of it, cool greys, and a hairline you can actually see. That is what
// makes it read as bright — the previous warm cream (#F5EFE3) was a *tinted*
// light theme, which looks dim next to anything genuinely white.
//
// The amber and teal stay, but both go deeper than their dark-theme values.
// That is not a drift from the brand, it is the same adaptation iOS makes
// (systemBlue is #007AFF on light and #0A84FF on dark): a colour that carries
// a dark background is too pale to carry text on a white one. The dark
// theme's #B87F42 scores 3.06:1 as text here — it cannot be used as-is.
//
// Every value below is contrast-checked against the pairs the app actually
// renders, including the tinted chips built with hexToRgba(), where the label
// sits on a 12–18% wash of the *same* accent. That last rule is the strictest
// one and is what pins the accent this deep.
export const LIGHT_THEME: ThemeColors = {
  bg: "#F2F2F7", // iOS systemGroupedBackground
  surface: "#FFFFFF", // iOS secondarySystemGroupedBackground — cards, rows, fields
  surfaceHi: "#E5E5EA", // iOS systemGray5 — ad slot, disabled fills
  paper: "#FFFFFF",
  paperShadow: "#E5E5EA",
  ink: "#1C1C1E",
  tealOnPaper: "#2C605A",
  textPrimary: "#1C1C1E", // iOS label
  //* one amber for both text and fills. Splitting them (a pale fill with dark
  //* text, a dark accent for labels) is what the old pair did, and it left the
  //* accent-tinted chips below AA because the label and its own wash were too
  //* close in luminance.
  accent: "#8B4E0B",
  accentSolid: "#8B4E0B",
  onAccent: "#FFFFFF", // white on the fill, the way an iOS filled button reads
  teal: "#2C605A",
  stone: "#55555A", // secondary label
  stoneDim: "#6E6E73", // tertiary label — the lightest grey still clearing 4.5:1
  line: "#D1D1D6", // iOS systemGray4 / separator
  error: "#D70015", // iOS systemRed, accessible variant
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
