import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
} from "react-native-purchases";
import { revenueCatApiKey } from "./purchases";

// The entitlement identifier as configured in the RevenueCat dashboard.
// Anything that removes ads — a one-off "remove ads" purchase, a full Pro
// subscription, or a timed grant from a rewarded ad — maps to this same
// identifier there, so the app never needs to care *how* access was earned.
export const AD_FREE_ENTITLEMENT = "ad_free";

// Purchases.configure() is not idempotent — calling it twice re-initialises
// the SDK and is a documented source of odd behaviour. React StrictMode and
// Fast Refresh both re-run effects, so the guard is not optional.
let configured = false;

/**
 * Initialise the RevenueCat SDK for the current platform.
 *
 * Returns false when no API key is set for this platform (see
 * `revenueCatApiKey`) — the caller should treat that as "entitlements are
 * unavailable" and carry on, not as a fatal error. Safe to call more than
 * once; subsequent calls are no-ops.
 */
export function configurePurchases(): boolean {
  if (configured) {
    return true;
  }

  const apiKey = revenueCatApiKey();
  if (apiKey == null) {
    return false;
  }

  Purchases.configure({ apiKey });
  configured = true;
  return true;
}

/**
 * Whether this customer currently has ad-free access.
 *
 * `entitlements.active` is a dictionary keyed by entitlement identifier
 * (think Dictionary<string, PurchasesEntitlementInfo>) holding only the
 * entitlements that are active *right now* — RevenueCat has already applied
 * expiry, so there is no date arithmetic to do here. An absent key means no
 * access, which is why this is a null check on the lookup rather than a
 * truthiness test on some flag.
 */
export function isAdFree(info: CustomerInfo): boolean {
  return info.entitlements.active[AD_FREE_ENTITLEMENT] != null;
}

/**
 * Read the current customer once. Returns null if the SDK isn't configured
 * or the read fails (offline on a cold install, most likely).
 *
 * RevenueCat caches CustomerInfo on device, so after the first successful
 * fetch this resolves immediately and works offline — which is what makes it
 * cheap enough to call during startup.
 */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configurePurchases()) {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch {
    // A failed read is not the same as "no entitlements" — the caller should
    // keep its previous/unknown state rather than downgrading a paying user
    // to ad-supported because their train went into a tunnel.
    return null;
  }
}

/**
 * Subscribe to entitlement changes — fires on purchase, restore, expiry and
 * transfer. Returns an unsubscribe function.
 *
 * The wrapper exists because the SDK's own API is asymmetric:
 * addCustomerInfoUpdateListener() returns void, not a subscription, so you
 * have to hold the listener reference yourself and hand it back to
 * removeCustomerInfoUpdateListener(). Closing over it here means callers can
 * just `return unsubscribe` from a useEffect like any other subscription.
 *
 * Without this listener a customer who buys "remove ads" keeps seeing ads
 * until the app is restarted, because nothing re-reads CustomerInfo.
 */
export function subscribeToCustomerInfo(
  onChange: (info: CustomerInfo) => void,
): () => void {
  if (!configurePurchases()) {
    return () => {};
  }

  const listener: CustomerInfoUpdateListener = (info) => onChange(info);
  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
