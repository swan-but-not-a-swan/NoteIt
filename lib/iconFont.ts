import type { FontSource } from "expo-font";

// Fonts the icon set needs registered at runtime. Empty on native, and that is
// the point of switching to `@react-native-vector-icons/feather/static`: the
// .ttf is compiled into the app (gradle on Android, UIAppFonts on iOS via the
// package's config plugin), so there is nothing to load and nothing to pull
// into the JS bundle.
//
// See iconFont.web.ts for the web build, which has no native side to bake it
// into and so still loads it the ordinary way.
export const ICON_FONTS: Record<string, FontSource> = {};
