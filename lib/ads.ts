import { Platform } from "react-native";
import mobileAds, { AdsConsent, TestIds } from "react-native-google-mobile-ads";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

// Real ad unit IDs, once there is an AdMob account to create them in. Unit
// IDs are per-placement and per-platform — a banner unit is not an
// interstitial unit, and an Android unit will simply no-fill on iOS.
const ANDROID_BANNER = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;
const IOS_BANNER = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS;

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

let initialized = false;

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
export async function initializeAds(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

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
    await mobileAds().initialize();
  } catch (error) {
    console.warn("Google Mobile Ads failed to initialise; ad slots will stay empty.", error);
  }
}
