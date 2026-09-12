import { Platform } from "react-native";
import mobileAds, { AdsConsent, MaxAdContentRating, TestIds } from "react-native-google-mobile-ads";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

// Google's test unit IDs always fill, with an obvious "Test Ad" label. Real
// unit IDs must NEVER be used during development: clicking your own live ads
// is invalid traffic, and AdMob suspends accounts for it. Tying the choice to
// __DEV__ rather than a hand-flipped constant means it cannot be forgotten.
const REAL_BANNER_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;

export const BANNER_AD_UNIT_ID: string = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : resolveRealUnitId(REAL_BANNER_UNIT_ID);

function resolveRealUnitId(unitId: string | undefined): string {
  if (unitId != null && unitId.trim().length > 0) {
    return unitId;
  }
  // Falling back to a test ID in production earns nothing, but it is far
  // less bad than shipping a malformed unit ID that logs errors on every
  // screen — and the "Test Ad" label makes the misconfiguration obvious.
  console.warn(
    "EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID is not set; falling back to a test ad unit. This build will not earn revenue.",
  );
  return TestIds.ADAPTIVE_BANNER;
}

// initialize() is safe to call twice, but the consent flow is not — showing
// the UMP form again on every remount would be hostile. Hold the promise so
// concurrent callers await the same run rather than racing.
let initialization: Promise<void> | null = null;

/**
 * Gather consent and start the Mobile Ads SDK.
 *
 * Order matters and is not interchangeable:
 *
 *   1. UMP consent — the GDPR/EEA form. Google requires this to resolve
 *      before ads are requested, or EEA traffic serves nothing.
 *   2. App Tracking Transparency — iOS only. Must come *after* the UMP form;
 *      Google's own guidance is that the consent form explains why tracking
 *      is being asked for, and an ATT prompt with no preamble gets denied far
 *      more often.
 *   3. initialize() — only once the first two have settled.
 *
 * Every step is individually try/caught: a consent failure should still leave
 * the SDK initialised serving non-personalised ads, rather than leaving the
 * app with no ads at all.
 */
export function initializeAds(): Promise<void> {
  if (initialization != null) {
    return initialization;
  }

  initialization = (async () => {
    try {
      // gatherConsent() folds requestInfoUpdate() and "show the form if it is
      // required" into one call, and is a no-op outside regulated regions.
      await AdsConsent.gatherConsent();
    } catch (error) {
      console.warn("Ad consent flow failed; continuing with non-personalised ads.", error);
    }

    if (Platform.OS === "ios") {
      try {
        await requestTrackingPermissionsAsync();
      } catch (error) {
        console.warn("ATT prompt failed; continuing without the IDFA.", error);
      }
    }

    try {
      await mobileAds().setRequestConfiguration({
        // A journalling app is not child-directed, but ads sitting beside
        // someone's private photos should still be tame. G is the strictest
        // rating and costs little fill at this scale.
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await mobileAds().initialize();
    } catch (error) {
      console.warn("Could not initialise the Mobile Ads SDK.", error);
    }
  })();

  return initialization;
}

/** True when the app is serving Google's test ads rather than real ones. */
export function isUsingTestAds(): boolean {
  return BANNER_AD_UNIT_ID === TestIds.ADAPTIVE_BANNER;
}
