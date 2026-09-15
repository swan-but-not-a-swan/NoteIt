import type { ThemeColors } from "@/theme/colors";

// react-native-google-mobile-ads has no web implementation and imports
// native-only React Native internals, which fails the whole web bundle — not
// just this component. AdBannerStrip.tsx already renders nothing on web; this
// keeps that behaviour without importing the SDK. Metro picks .web.tsx over
// .tsx on web, so native builds are unaffected.
export default function AdBannerStrip(_props: {
  colors: ThemeColors;
  variant?: "card" | "bar";
  bottomInset?: number;
  suppressed?: boolean;
}) {
  return null;
}
