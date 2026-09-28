import * as Crypto from "expo-crypto";
import Purchases, { AdFormat, AdMediatorName, AdRevenuePrecision } from "react-native-purchases";
import { RevenuePrecisions } from "react-native-google-mobile-ads";
import { configurePurchases } from "./entitlements";

// RevenueCat Ads: the ads AdMob serves, reported through the RevenueCat SDK so
// their revenue shows up in RevenueCat's charts next to Plus. RevenueCat
// doesn't serve anything itself — AdMob still loads and shows every ad, and
// this only tells RevenueCat what happened to it. It is also how NoteIt
// qualifies for RevenueCat's Shipaton without a paywall.
//
// Every call is fire-and-forget and can never cost an ad: the SDK throws until
// RevenueCat is configured, the feature is in beta, and a tracking failure is
// nothing the person looking at the ad can act on. So a missing key or a
// rejected call is a console warning, never an error.
//
// RevenueCat groups an ad's events by `impressionId`, so a slot keeps one id
// from the moment its ad loads until the next ad replaces it.

/** Where the ad sits, reported as RevenueCat's `placement`. */
export type AdPlacement = "folders_list" | "viewer_bar" | "viewer_end";

/** One loaded ad: what RevenueCat needs to attribute its events. */
export type TrackedAd = {
  adFormat: AdFormat;
  adUnitId: string;
  placement: AdPlacement;
  impressionId: string;
};

export { AdFormat };

/** A fresh id for a banner's newly loaded ad. Native ads carry AdMob's own
 *  `responseId` and use that instead; banners don't expose one in React Native. */
export function newImpressionId(): string {
  return Crypto.randomUUID();
}

//* AdMob's precision levels, in RevenueCat's words for the same thing
const PRECISION: Record<number, AdRevenuePrecision> = {
  [RevenuePrecisions.UNKNOWN]: AdRevenuePrecision.unknown,
  [RevenuePrecisions.ESTIMATED]: AdRevenuePrecision.estimated,
  [RevenuePrecisions.PUBLISHER_PROVIDED]: AdRevenuePrecision.publisherDefined,
  [RevenuePrecisions.PRECISE]: AdRevenuePrecision.exact,
};

//* configures RevenueCat on first use — also while Plus is off sale, since
//* reporting ads needs the SDK even when nothing is for sale. False when this
//* build has no RevenueCat key, which leaves the ads showing, just unreported
function tracker() {
  return configurePurchases() ? Purchases.adTracker : null;
}

function report(event: string, call: Promise<void>) {
  call.catch((error) => {
    console.warn(`RevenueCat couldn't record the ad's ${event}.`, error);
  });
}

function common(ad: TrackedAd) {
  return {
    mediatorName: AdMediatorName.adMob,
    adFormat: ad.adFormat,
    adUnitId: ad.adUnitId,
    impressionId: ad.impressionId,
    placement: ad.placement,
  };
}

/** An ad has loaded and is about to be shown. */
export function trackAdLoaded(ad: TrackedAd): void {
  const t = tracker();
  if (t != null) report("load", t.trackAdLoaded(common(ad)));
}

/** AdMob recorded an impression — the ad was actually seen. */
export function trackAdDisplayed(ad: TrackedAd): void {
  const t = tracker();
  if (t != null) report("impression", t.trackAdDisplayed(common(ad)));
}

/** The person tapped the ad. */
export function trackAdOpened(ad: TrackedAd): void {
  const t = tracker();
  if (t != null) report("tap", t.trackAdOpened(common(ad)));
}

/**
 * What the ad earned, from AdMob's paid event.
 *
 * AdMob's React Native events give `value` in whole currency units (it
 * divides the SDK's micros by a million on the way out); RevenueCat wants
 * micros back, so this multiplies again.
 */
export function trackAdRevenue(ad: TrackedAd, value: number, currency: string, precision: number): void {
  const t = tracker();
  if (t == null) return;
  report(
    "revenue",
    t.trackAdRevenue({
      ...common(ad),
      revenueMicros: Math.round(value * 1_000_000),
      currency,
      precision: PRECISION[precision] ?? AdRevenuePrecision.unknown,
    }),
  );
}

/** The request came back empty or failed. No-fill is ordinary, and still worth
 *  counting — RevenueCat's fill rate is built from these. */
export function trackAdFailedToLoad(ad: Omit<TrackedAd, "impressionId">): void {
  const t = tracker();
  if (t == null) return;
  report(
    "failed load",
    t.trackAdFailedToLoad({
      mediatorName: AdMediatorName.adMob,
      adFormat: ad.adFormat,
      adUnitId: ad.adUnitId,
      placement: ad.placement,
    }),
  );
}
