import { useEffect, useRef } from "react";
import { AdEventType, InterstitialAd, type PaidEvent } from "react-native-google-mobile-ads";
import { initializeAds, interstitialAdUnitId } from "./ads";
import {
  AdFormat,
  newImpressionId,
  trackAdDisplayed,
  trackAdFailedToLoad,
  trackAdLoaded,
  trackAdOpened,
  trackAdRevenue,
  type TrackedAd,
} from "./adTracking";

/** At most one full-screen ad in this window, however many notes are saved in
 *  it. A burst of saves shouldn't become a burst of ads — AdMob treats
 *  interstitials after every action as a policy problem, and so do people. */
const MIN_GAP_MS = 60_000;
//* module-level: it outlives the add-note screen, which unmounts on every save
let lastShownAt = 0;

type Slot = { ad: InterstitialAd; loaded: boolean; tracked: TrackedAd | null };

/**
 * The full-screen ad after a picture-note is saved: an image (or rich-media)
 * ad after a photo, a video ad after a video.
 *
 * Loads as soon as the note's picture is known — the kind of ad follows the
 * kind of picture — so it's ready by the time Save is tapped. Returns
 * `showThen(next)`: shows the ad if one is ready and then runs `next` once it's
 * closed, or runs `next` straight away when there's none (not loaded yet, no
 * fill, a subscriber, shown too recently). Saving never waits on an ad.
 *
 * @param kind    the note's media, or null while there's none yet
 * @param enabled false for Plus subscribers — nothing is requested at all
 */
export function useSaveInterstitial(kind: "image" | "video" | null, enabled: boolean) {
  const slotRef = useRef<Slot | null>(null);

  useEffect(() => {
    if (!enabled || kind == null) return;
    let cancelled = false;
    const adUnitId = interstitialAdUnitId(kind);
    const ad = InterstitialAd.createForAdRequest(adUnitId);
    const slot: Slot = { ad, loaded: false, tracked: null };
    slotRef.current = slot;

    const unsubscribe = [
      ad.addAdEventListener(AdEventType.LOADED, () => {
        slot.loaded = true;
        slot.tracked = { adFormat: AdFormat.interstitial, adUnitId, placement: "note_saved", impressionId: newImpressionId() };
        trackAdLoaded(slot.tracked);
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        //* an error before it loaded is a failed load; one while showing is
        //* handled by showThen, which moves on regardless
        if (!slot.loaded && slot.tracked == null) {
          trackAdFailedToLoad({ adFormat: AdFormat.interstitial, adUnitId, placement: "note_saved" });
        }
      }),
      ad.addAdEventListener(AdEventType.OPENED, () => {
        if (slot.tracked != null) trackAdDisplayed(slot.tracked);
      }),
      ad.addAdEventListener(AdEventType.CLICKED, () => {
        if (slot.tracked != null) trackAdOpened(slot.tracked);
      }),
      ad.addAdEventListener(AdEventType.PAID, (payload) => {
        //* the library types this payload as nothing, but PAID carries the
        //* revenue — its own useFullScreenAd hook reads it the same way
        const paid = payload as unknown as PaidEvent;
        if (slot.tracked != null) trackAdRevenue(slot.tracked, paid.value, paid.currency, paid.precision);
      }),
    ];

    //* after consent and SDK start-up, like every other ad in the app
    initializeAds().then(() => {
      if (!cancelled) ad.load();
    });

    return () => {
      cancelled = true;
      unsubscribe.forEach((off) => off());
      if (slotRef.current === slot) slotRef.current = null;
    };
  }, [kind, enabled]);

  return function showThen(next: () => void) {
    const slot = slotRef.current;
    const now = Date.now();
    if (slot == null || !slot.loaded || now - lastShownAt < MIN_GAP_MS) {
      next();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      off.forEach((stop) => stop());
      next();
    };
    const off = [
      slot.ad.addAdEventListener(AdEventType.CLOSED, finish),
      //* a failure while presenting must not strand someone on this screen
      slot.ad.addAdEventListener(AdEventType.ERROR, finish),
    ];

    lastShownAt = now;
    slot.loaded = false; //* an interstitial shows once; a new one would need a new load
    slot.ad.show().catch(finish);
  };
}
