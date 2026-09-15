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

// The Test Store key (test_… prefix) routes every purchase to RevenueCat's
// own Test Store instead of Play Billing or StoreKit, so purchase flows can
// be exercised end to end with no Play Console or App Store Connect account
// behind them. It is project-wide rather than per-platform, which is why it
// short-circuits the Platform.select below rather than sitting inside it.
const TEST_KEY = process.env.EXPO_PUBLIC_RC_TEST_KEY;

/** True when the app is running against the Test Store rather than a real
 *  store. Surface this in the UI during development so a fake purchase is
 *  never mistaken for a real one. */
export function isTestStore(): boolean {
  return usableKey(TEST_KEY) != null;
}

function usableKey(key: string | undefined): string | null {
  // An env var that exists but is empty ("EXPO_PUBLIC_RC_IOS_KEY=") is the
  // common half-configured state — treat it as absent, not as a valid key.
  if (key == null) return null;
  return key.trim().length > 0 ? key : null;
}

/**
 * The RevenueCat SDK key for the platform currently running, or null when
 * none is configured (web, or a missing/blank env var).
 *
 * Returns null rather than throwing so the caller decides what an absent key
 * means. Treating it as fatal would make the app unlaunchable on a dev
 * machine that simply hasn't set the vars yet.
 */
export function revenueCatApiKey(): string | null {
  // Test Store wins when present. __DEV__ guards it so a test key left in
  // the environment cannot follow the app into a release build — Test Store
  // purchases are free and unverified, so shipping one would hand out Pro to
  // everybody.
  const testKey = usableKey(TEST_KEY);
  if (testKey != null) {
    if (__DEV__) return testKey;
    console.warn(
      "A RevenueCat Test Store key is set in a production build and is being ignored. Remove EXPO_PUBLIC_RC_TEST_KEY from the release environment.",
    );
  }

  const key = Platform.select({
    android: ANDROID_KEY,
    ios: IOS_KEY,
    // Expo Router still bundles for web (app.json sets web.output: "static"),
    // and react-native-purchases has no web implementation here — so web
    // deliberately resolves to no key and the caller skips configure().
    default: undefined,
  });

  return usableKey(key);
}

/**
 * True when this platform has a usable RevenueCat key. Gate configure() and
 * any entitlement reads on this, so an unconfigured build degrades to
 * "no entitlements" instead of crashing on startup.
 */
export function hasRevenueCatKey(): boolean {
  return revenueCatApiKey() != null;
}
