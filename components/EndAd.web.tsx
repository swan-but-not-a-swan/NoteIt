import type { NativeAd } from "react-native-google-mobile-ads";
import type { ThemeColors } from "@/theme/colors";

// Same reason as AdBannerStrip.web.tsx: the ads SDK has no web implementation,
// and importing it fails the whole web bundle. The type import above is erased
// at build time, so it costs nothing. With no ad, the viewer's list just ends
// at the last note.
export function useEndAd(_enabled: boolean, _nearEnd: boolean): NativeAd | null {
  return null;
}

export default function EndAdCard(_props: { ad: NativeAd; colors: ThemeColors }) {
  return null;
}
