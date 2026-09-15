import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import type { ThemeColors } from "@/theme/colors";
import { bannerAdUnitId, initializeAds } from "@/lib/ads";
import { adBannerStripStyles as styles, AD_BAR_HEIGHT, AD_BORDER_WIDTH } from "@/theme/styles/app.styles";

//* Tallest the card's banner may be, in dp. Without a cap an inline adaptive banner can
//* be as tall as the screen (Google serves 300x250 rectangles into it), which
//* crowds out the folders it sits between. 100 still allows a 320x100 banner.
const AD_MAX_HEIGHT = 100;

type Props = {
  colors: ThemeColors;
  /** "card" sits in a scrolling list (FoldersList). "bar" is pinned to the
   *  bottom edge of a screen (the picture-note viewer): full width, and on
   *  screen from the start, so the screen above doesn't jump when the ad lands. */
  variant?: "card" | "bar";
  /** Bar only: the safe-area inset, padded *inside* the bar so the banner
   *  clears the home indicator while the bar still reaches the bottom of the glass. */
  bottomInset?: number;
  /** Bar only: keeps the bar but takes the banner down, for while another ad
   *  already fills the screen above it. */
  suppressed?: boolean;
};

// The "strip" ad placement — shared wherever the web reference reuses its
// AdBanner variant="strip" (FoldersList, the picture-note Viewer).
//
// The chrome below is ours; everything inside it is Google's creative and
// cannot be styled. So the container only supplies the border, radius and
// background that let an ad sit in the folders list, or along the bottom of
// the viewer, without looking pasted on top of it.
export default function AdBannerStrip({
  colors,
  variant = "card",
  bottomInset = 0,
  suppressed = false,
}: Props) {
  // Three states, and the failure one matters: an ad that no-fills or errors
  // must collapse completely rather than leave a bordered empty box. No-fill
  // is normal and frequent — inventory simply isn't always available — so
  // the layout has to treat "no ad" as an ordinary outcome, not an error.
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  //* the inner width. Adaptive banners default to the full device width,
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
  if (Platform.OS === "web") {
    return null;
  }

  const bar = variant === "bar";

  if (failed) {
    //* the card simply goes; the bar still has to keep the screen clear of
    //* the home indicator it was padding
    return bar ? <View style={{ height: bottomInset }} /> : null;
  }

  //* the card stays out of the list until the SDK is up; the bar is already
  //* holding its space, and just stays empty until then
  if (!ready && !bar) {
    return null;
  }

  return (
    <View
      style={
        bar
          ? [
              styles.bar,
              {
                backgroundColor: colors.surfaceHi,
                borderTopColor: colors.line,
                height: AD_BAR_HEIGHT + AD_BORDER_WIDTH + bottomInset,
                paddingBottom: bottomInset,
              },
            ]
          : [
              styles.ad,
              { backgroundColor: colors.surfaceHi, borderColor: colors.line },
              // Stay invisible until the first impression actually renders,
              // otherwise an empty framed box flashes in the list while the
              // request is in flight.
              !loaded && styles.pending,
            ]
      }
      onLayout={(e) =>
        setWidth(Math.floor(e.nativeEvent.layout.width - (bar ? 0 : AD_BORDER_WIDTH * 2)))
      }
    >
      {ready && width != null && !suppressed && (
        <BannerAd
          unitId={bannerAdUnitId()}
          // Inline adaptive for both variants. It is the size Google documents
          // for scrolling content like the folders list, and it is the only
          // size that takes a maxHeight — an anchored banner picks its own
          // height, up to 90, and would outgrow the bar.
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          width={width}
          maxHeight={bar ? AD_BAR_HEIGHT : AD_MAX_HEIGHT}
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
