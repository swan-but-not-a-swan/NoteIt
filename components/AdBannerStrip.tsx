import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import type { ThemeColors } from "@/theme/colors";
import { BANNER_AD_UNIT_ID } from "@/lib/ads";

type LoadState = "loading" | "loaded" | "failed";

// The "strip" ad placement — shared wherever the web reference reuses its
// AdBanner variant="strip" (FoldersList, the picture-note Viewer).
//
// Whether this renders at all is decided upstream by the entitlement gate
// (see EntitlementsContext) — this component assumes it should show an ad and
// concerns itself only with how that goes.
export default function AdBannerStrip({ colors }: { colors: ThemeColors }) {
  const [state, setState] = useState<LoadState>("loading");

  // No-fill is routine, not exceptional — inventory varies by region, and
  // Myanmar is a thin market. Collapsing to nothing is the right answer:
  // a permanently empty bordered box in the middle of someone's folder list
  // looks like a bug, whereas an absent ad looks like no ad.
  if (state === "failed") {
    return null;
  }

  return (
    <View
      style={[
        styles.frame,
        // The chrome only appears once an ad is actually in the frame.
        // Drawing the border first would flash an empty box on every mount,
        // since BannerAd occupies no height until it fills.
        state === "loaded" && {
          backgroundColor: colors.surfaceHi,
          borderColor: colors.line,
          borderWidth: 1,
          padding: 6,
        },
      ]}
    >
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        // Anchored adaptive sizes itself to the device width and returns a
        // height Google has picked for that screen, rather than a fixed 320x50
        // that looks stranded on a tablet.
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setState("loaded")}
        onAdFailedToLoad={(error) => {
          // Warn rather than error: this fires for ordinary no-fill as well as
          // for genuine misconfiguration, and shouting about it would train
          // everyone to ignore the log.
          console.warn("Banner ad did not load.", error?.message ?? error);
          setState("failed");
        }}
        // Impression-level revenue. This is the seam where RevenueCat's
        // adTracker.trackAdRevenue() goes, so ad earnings land on the same
        // charts as purchases — it needs an impressionId generated per load,
        // so it is deliberately left for that phase rather than half-done.
        onPaid={(event) => {
          if (__DEV__) {
            console.log(`Ad revenue: ${event.value} ${event.currency} (precision ${event.precision})`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
