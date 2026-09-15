import type { FontSource } from "expo-font";

// Web has no native font table to bake Feather into, and the static icon set
// deliberately ships no `fontSource` for the runtime loader to fall back on —
// so without this every icon renders as tofu. Metro resolves this file only
// for the web bundle, so the .ttf stays out of the native ones.
export const ICON_FONTS: Record<string, FontSource> = {
  Feather: require("@react-native-vector-icons/feather/fonts/Feather.ttf"),
};
