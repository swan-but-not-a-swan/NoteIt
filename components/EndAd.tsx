import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
} from "react-native-google-mobile-ads";
import type { ThemeColors } from "@/theme/colors";
import { initializeAds, nativeAdUnitId } from "@/lib/ads";
import { endAdStyles as styles } from "@/theme/styles/note.styles";

// The ad at the end of the picture-note viewer: one more page after the last
// note, in the same box a photo takes. A native ad rather than a banner because
// only a native ad can be laid out to a box of our choosing — banner creatives
// come in fixed sizes and would sit in the middle of it.

/**
 * Loads the ad for the viewer's last page. Null while there isn't one to show:
 * Plus, not near the end yet, still loading, or no fill.
 *
 * @param enabled  false for Plus subscribers, and while entitlements are unknown
 * @param nearEnd  true within one swipe of the last note
 */
export function useEndAd(enabled: boolean, nearEnd: boolean): NativeAd | null {
  // Requested near the end rather than when the viewer opens: most visits never
  // reach the last note, and an ad loaded for nobody still counts against the
  // unit's show rate. Latched, so swiping back a page doesn't throw away an ad
  // that is already on its way.
  const [wanted, setWanted] = useState(false);
  if (enabled && nearEnd && !wanted) setWanted(true);

  const [ad, setAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    if (!enabled || !wanted) return;
    let cancelled = false;
    let loaded: NativeAd | null = null;

    //* same gate as AdBannerStrip: consent is gathered before the first request
    initializeAds()
      .then(() =>
        NativeAd.createForAdRequest(nativeAdUnitId(), {
          //* the photo box is taller than it is wide, so ask for creatives shaped like it
          aspectRatio: NativeMediaAspectRatio.PORTRAIT,
        }),
      )
      .then((result) => {
        if (cancelled) {
          result.destroy();
          return;
        }
        loaded = result;
        setAd(result);
      })
      .catch((error) => {
        //* no-fill is ordinary, and nothing the person can act on: the list
        //* simply ends at the last note, the way it does for Plus
        console.warn("Native ad failed to load; the viewer won't show an ad page.", error);
      });

    return () => {
      cancelled = true;
      //* a native ad holds native memory until it is destroyed
      if (loaded != null) loaded.destroy();
      setAd(null);
    };
  }, [enabled, wanted]);

  return ad;
}

type CardProps = {
  ad: NativeAd;
  colors: ThemeColors;
};

// Laid out inside the photo's box rather than over it. Nothing is drawn on top
// of the media — Google's native ad policy doesn't allow covering the ad's
// assets — so the badge, the headline and the button take rows of their own,
// and the media gets whatever height is left.
export default function EndAdCard({ ad, colors }: CardProps) {
  //* typed as string, but the SDKs hand back null when a creative has none
  const body = ad.body != null ? ad.body.trim() : "";
  const callToAction = ad.callToAction != null ? ad.callToAction.trim() : "";

  return (
    <NativeAdView nativeAd={ad} style={[styles.root, { backgroundColor: colors.surfaceHi }]}>
      <View style={styles.topRow}>
        {/* The attribution Google requires on every native ad. */}
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeLabel, { color: colors.onAccent }]}>Ad</Text>
        </View>
        {ad.advertiser != null && ad.advertiser.length > 0 && (
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text numberOfLines={1} style={[styles.advertiser, { color: colors.stone }]}>
              {ad.advertiser}
            </Text>
          </NativeAsset>
        )}
      </View>

      {/* contain, so the whole creative stays in view whatever shape it comes in */}
      <NativeMediaView resizeMode="contain" style={styles.media} />

      <View style={styles.titleRow}>
        {ad.icon != null && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: ad.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.titleText}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={2} style={[styles.headline, { color: colors.textPrimary }]}>
              {ad.headline}
            </Text>
          </NativeAsset>
          {body.length > 0 && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text numberOfLines={2} style={[styles.body, { color: colors.stone }]}>
                {body}
              </Text>
            </NativeAsset>
          )}
        </View>
      </View>

      {callToAction.length > 0 && (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={[styles.callToAction, { backgroundColor: colors.accent, color: colors.onAccent }]}>
            {callToAction}
          </Text>
        </NativeAsset>
      )}
    </NativeAdView>
  );
}
