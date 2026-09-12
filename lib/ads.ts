import { Platform } from "react-native";
import mobileAds, { AdsConsent, MaxAdContentRating, TestIds } from "react-native-google-mobile-ads";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

// Real ad unit IDs, once there is an AdMob account to create them in. Unit
// IDs are per-placement and per-platform — a banner unit is not an
// interstitial unit, and an Android unit will simply no-fill on iOS.
const ANDROID_BANNER = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;
const IOS_BANNER = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;

// Devices allowed to receive *test* creatives from *real* ad units, as a
// comma-separated list of the identifiers AdMob prints to the device log on
// first run ("Use RequestConfiguration.Builder.setTestDeviceIds(...)").
//
// This is the only safe way to verify a real unit before release. A release
// build requesting a live unit on your own phone generates impressions
// Google counts as invalid traffic, and AdMob suspends accounts for it —
// which is not a risk worth taking to confirm a banner renders.
const TEST_DEVICE_IDS = (process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

/**
 * The banner unit to request.
 *
 * Always Google's test unit in development, and never a real one. This is
 * not tidiness — impressions and clicks you generate on your own live ads
 * are invalid traffic, and AdMob suspends accounts for it. Making the dev
 * path structurally unable to request a real unit means it cannot happen by
 * accident when someone runs a debug build against production config.
 *
 * Falls back to the test unit in production too when nothing is configured,
 * so the layout still renders rather than collapsing to an empty gap.
 */
export function bannerAdUnitId(): string {
  if (__DEV__) {
    return TestIds.BANNER;
  }

  const configured = Platform.select({ android: ANDROID_BANNER, ios: IOS_BANNER });
  if (configured != null && configured.trim().length > 0) {
    return configured;
  }
  return TestIds.BANNER;
}

/** True while the app can only serve Google's sample creatives — no AdMob
 *  account behind it, so impressions earn nothing. Worth surfacing in a dev
 *  build so a test ad is never mistaken for live inventory. */
export function isUsingTestAds(): boolean {
  return bannerAdUnitId() === TestIds.BANNER;
}

// Holds the in-flight run rather than a boolean. A plain `initialized = true`
// set before the awaits lets a second caller return immediately while the SDK
// is still coming up — and that caller then requests an ad early, which is
// exactly the problem the callers' `ready` gate exists to prevent. Awaiting
// the same promise makes every caller wait for the real thing.
let initialization: Promise<void> | null = null;

/**
 * Bring up the ads SDK. Safe to call more than once.
 *
 * Order matters and is not interchangeable:
 *
 *  1. iOS App Tracking Transparency, because the IDFA is unavailable until
 *     it resolves and Apple rejects apps that touch it without asking.
 *  2. Google's UMP consent flow, which shows a GDPR form to users in
 *     regions that require one and records the choice.
 *  3. Only then initialize(), so the first ad request already carries the
 *     right consent signals. Initialising first means the opening
 *     impressions go out under the wrong basis.
 *
 * Every step is individually non-fatal: a consent failure should cost you
 * personalised ads, not the app.
 */
export function initializeAds(): Promise<void> {
  if (initialization != null) {
    return initialization;
  }

  initialization = (async () => {
    if (Platform.OS === "ios") {
      try {
        await requestTrackingPermissionsAsync();
      } catch (error) {
        console.warn("Tracking permission request failed; continuing without IDFA.", error);
      }
    }

    try {
      // gatherConsent() is the one-call form: it refreshes consent info and
      // shows the form only where one is actually required, so users outside
      // those regions see nothing.
      await AdsConsent.gatherConsent();
    } catch (error) {
      console.warn("Consent gathering failed; ads will fall back to non-personalised.", error);
    }

    try {
      await mobileAds().setRequestConfiguration({
        // A journalling app is not child-directed, but ads sitting beside
        // someone's private photos should still be tame. G is the strictest
        // rating and costs little fill at this scale.
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: TEST_DEVICE_IDS,
      });
      await mobileAds().initialize();
    } catch (error) {
      console.warn("Google Mobile Ads failed to initialise; ad slots will stay empty.", error);
    }
  })();

  return initialization;
}
