import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import type { ThemeColors } from "@/theme/colors";
import { bannerAdUnitId, initializeAds } from "@/lib/ads";
import { adBannerStripStyles as styles, AD_BORDER_WIDTH } from "@/theme/styles/app.styles";

//* Tallest the banner may be, in dp. Without a cap an inline adaptive banner can
//* be as tall as the screen (Google serves 300x250 rectangles into it), which
//* crowds out the folders it sits between. 100 still allows a 320x100 banner.
const AD_MAX_HEIGHT = 100;

// The "strip" ad placement — shared wherever the web reference reuses its
// AdBanner variant="strip" (FoldersList, the picture-note Viewer).
//
// The card chrome below is ours; everything inside it is Google's creative
// and cannot be styled. So the container only supplies the border, radius
// and background that let an ad sit in the folders list without looking
// pasted on top of it.
export default function AdBannerStrip({ colors }: { colors: ThemeColors }) {
  // Three states, and the failure one matters: an ad that no-fills or errors
  // must collapse completely rather than leave a bordered empty box. No-fill
  // is normal and frequent — inventory simply isn't always available — so
  // the layout has to treat "no ad" as an ordinary outcome, not an error.
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  //* the card's inner width. Adaptive banners default to the full device width,
  //* which the card's side padding would clip, so the request waits for this
  const [width, setWidth] = useState<number | null>(null);

  // Initialising here rather than at app startup is deliberate: this
  // component only renders when hasPlus === false, so a subscriber never
  // gets an ATT prompt or a GDPR consent form for ads they will never be
  // shown. initializeAds() guards itself, so several banners mounting at
  // once still only bring the SDK up a single time.
  //
  // The banner is held back until initialisation resolves — requesting
  // before the SDK is up means the first impression goes out without the
  // consent signals gathered in initializeAds().
  useEffect(() => {
    let cancelled = false;
    initializeAds()
      .catch((error) => {
        console.warn("Ad initialisation failed; the slot will stay empty.", error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // react-native-google-mobile-ads has no web implementation, and app.json
  // still builds web (web.output: "static"), so this would throw there.
  if (Platform.OS === "web" || failed || !ready) {
    return null;
  }

  return (
    <View
      style={[
        styles.ad,
        { backgroundColor: colors.surfaceHi, borderColor: colors.line },
        // Stay invisible until the first impression actually renders,
        // otherwise an empty framed box flashes in the list while the
        // request is in flight.
        !loaded && styles.pending,
      ]}
      onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width - AD_BORDER_WIDTH * 2))}
    >
      {width != null && (
        <BannerAd
          unitId={bannerAdUnitId()}
          // Inline adaptive is the size Google documents for scrolling
          // content, which is what the folders list is. The anchored sizes are
          // for pinning to the top or bottom of a screen.
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          width={width}
          maxHeight={AD_MAX_HEIGHT}
          onAdLoaded={() => setLoaded(true)}
          onAdFailedToLoad={(error) => {
            // Logged rather than surfaced: a no-fill is not something the
            // person writing a journal entry can act on.
            console.warn("Banner ad failed to load.", error);
            setFailed(true);
          }}
        />
      )}
    </View>
  );
}
