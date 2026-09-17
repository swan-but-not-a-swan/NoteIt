//* static styles for app-wide pieces: splash, top bar, tab bar, overflow menu, ad strip
//* each component imports its export as `styles`; theme colours stay inline there

import { StyleSheet } from "react-native";
import { DARK_THEME, hexToRgba } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { common } from "@/theme/styles/common.styles";

//* components/in-app-splash.tsx
export const SPLASH_COLORS = DARK_THEME;

export const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    pointerEvents: "none",
    position: "absolute",
    width: 320,
    height: 320,
  },

  lockup: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },

  mark: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: SPLASH_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    // A soft colored glow. boxShadow replaces the old shadowColor/Opacity/
    // Radius/Offset set (and Android's elevation) with one cross-platform
    // prop that does carry colour on Android, unlike elevation — the .glow
    // blob behind this still does the heavy lifting for the wide halo.
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 24, color: hexToRgba(SPLASH_COLORS.accent, 0.6) },
    ],
  },

  label: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11.5,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: SPLASH_COLORS.stoneDim,
  },

  rule: {
    width: 140,
    height: 1,
    backgroundColor: SPLASH_COLORS.accent,
    opacity: 0.8,
  },

  wordmark: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    color: SPLASH_COLORS.textPrimary,
    // Native shadow rendering (especially Android) doesn't blur nearly as
    // smoothly as a browser's CSS text-shadow — the same values that read
    // as a soft glow on web looked like a solid highlighted block on a real
    // device. Toned down: much lower opacity, smaller radius.
    textShadowColor: "rgba(184,127,66,0.35)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
});

//* components/TopBar.tsx
export const topBarStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    // paddingTop is set inline from useSafeAreaInsets() above.
    paddingBottom: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  iconButton: common.iconButton38,
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 30,
    fontWeight: "600",
    flexShrink: 1,
  },
});

//* components/BottomTabBar.tsx
export const bottomTabBarStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
  },
  tabLabel: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11,
  },
  addSlot: {
    width: 76,
    alignItems: "center",
  },
  addButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -34,
    // The shadow itself is applied inline above, since it needs the accent
    // colour from the theme.
  },
  hint: {
    pointerEvents: "none",
    position: "absolute",
    top: -60,
    left: -60,
    right: -60,
    alignItems: "center",
  },
  hintPill: common.chip,
  hintLabel: common.semiBold11_5,
});

//* components/OverflowMenu.tsx
export const overflowMenuStyles = StyleSheet.create({
  trigger: common.iconButton38,
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    position: "absolute",
    minWidth: 184,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  label: common.semiBold13_5,
});

//* components/AdBannerStrip.tsx
export const AD_BORDER_WIDTH = 1;
/** Height the bottom bar reserves for its banner, above the safe-area inset.
 *  Banner requests are capped to it, so a creative can never outgrow the bar
 *  and push the screen above it around. */
export const AD_BAR_HEIGHT = 60;

export const adBannerStripStyles = StyleSheet.create({
  ad: {
    borderRadius: 14,
    borderWidth: AD_BORDER_WIDTH,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pending: {
    height: 0,
    borderWidth: 0,
    opacity: 0,
  },
  //* pinned to a screen's bottom edge: full width, no radius, a hairline on top
  bar: {
    borderTopWidth: AD_BORDER_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
});
