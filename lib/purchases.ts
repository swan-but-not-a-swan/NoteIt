import { Platform } from "react-native";

// RevenueCat issues a *separate* public SDK key per store — the Android key
// talks to Play Billing, the iOS key to StoreKit. They are not
// interchangeable, and configuring with the wrong one fails at runtime
// rather than at build time, so the selection happens here in one place
// instead of being inlined at the configure() call site.
//
// EXPO_PUBLIC_ vars are inlined into the JS bundle at build time, which is
// correct for these: RevenueCat's SDK keys are public by design (they only
// identify the app, they don't authorise anything). The *secret* API key —
// the one that can read and mutate customer data — is server-side only and
// must never appear in this file.
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY;

/**
 * The RevenueCat SDK key for the platform currently running, or null when
 * none is configured (web, or a missing/blank env var).
 *
 * Returns null rather than throwing so the caller decides what an absent key
 * means. Treating it as fatal would make the app unlaunchable on a dev
 * machine that simply hasn't set the vars yet.
 */
export function revenueCatApiKey(): string | null {
  const key = Platform.select({
    android: ANDROID_KEY,
    ios: IOS_KEY,
    // Expo Router still bundles for web (app.json sets web.output: "static"),
    // and react-native-purchases has no web implementation here — so web
    // deliberately resolves to no key and the caller skips configure().
    default: undefined,
  });

  if (key == null) {
    return null;
  }

  // An env var that exists but is empty ("EXPO_PUBLIC_RC_IOS_KEY=") is the
  // common half-configured state — treat it as absent, not as a valid key.
  return key.trim().length > 0 ? key : null;
}

/**
 * True when this platform has a usable RevenueCat key. Gate configure() and
 * any entitlement reads on this, so an unconfigured build degrades to
 * "no entitlements" instead of crashing on startup.
 */
export function hasRevenueCatKey(): boolean {
  return revenueCatApiKey() != null;
}
