import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { revenueCatApiKey } from "./purchases";

// The entitlement identifier as configured in the RevenueCat dashboard.
// One entitlement gates everything paid: removing ads, and whatever else
// Pro comes to mean. The app never needs to care *how* it was earned — a
// monthly or yearly subscription, the lifetime unlock, a promotional grant
// from the dashboard, or a Test Store purchase all land here identically.
export const PRO_ENTITLEMENT = "noteit_pro";

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
 * Whether this customer currently has Pro.
 *
 * `entitlements.active` is a dictionary keyed by entitlement identifier
 * (think Dictionary<string, PurchasesEntitlementInfo>) holding only the
 * entitlements that are active *right now* — RevenueCat has already applied
 * expiry and billing grace periods, so there is no date arithmetic to do
 * here. An absent key means no access, which is why this is a null check on
 * the lookup rather than a truthiness test on some flag.
 */
export function isPro(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] != null;
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
 * Without this listener a customer who buys Pro keeps seeing ads until the
 * app is restarted, because nothing re-reads CustomerInfo.
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

/**
 * The current default offering — the set of packages (monthly, yearly,
 * lifetime) the dashboard has decided this customer should be shown.
 *
 * Returns null when nothing is configured yet or the fetch fails. Read the
 * *current* offering rather than hardcoding product identifiers: which
 * products are on sale, and at what price, is a dashboard decision, and
 * hardcoding it here means a store change needs an app release.
 */
export async function fetchCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configurePurchases()) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    console.warn("Could not load RevenueCat offerings.", error);
    return null;
  }
}

export type PurchaseOutcome =
  | { status: "purchased"; info: CustomerInfo; isPro: boolean }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

/**
 * Buy a package. Returns a discriminated result rather than throwing,
 * because the three outcomes need genuinely different UI: a success closes
 * the paywall, a cancellation should do nothing at all, and only a real
 * failure deserves an error message.
 *
 * Treating a cancellation as an error is the classic mistake here — the SDK
 * throws for it, and an unguarded catch shows "Purchase failed" to someone
 * who simply pressed Back.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<PurchaseOutcome> {
  if (!configurePurchases()) {
    return { status: "failed", message: "Purchases are not available right now." };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: "purchased", info: customerInfo, isPro: isPro(customerInfo) };
  } catch (error) {
    if (isUserCancelled(error)) {
      return { status: "cancelled" };
    }
    console.warn("Purchase failed.", error);
    return { status: "failed", message: describeError(error) };
  }
}

/**
 * Restore previous purchases. Required by both stores for any app selling
 * non-consumables or subscriptions — a customer reinstalling, or signing in
 * on a second device, needs a way back to what they already paid for, and
 * Apple rejects apps that omit it.
 */
export async function restorePurchases(): Promise<PurchaseOutcome> {
  if (!configurePurchases()) {
    return { status: "failed", message: "Purchases are not available right now." };
  }

  try {
    const info = await Purchases.restorePurchases();
    return { status: "purchased", info, isPro: isPro(info) };
  } catch (error) {
    if (isUserCancelled(error)) {
      return { status: "cancelled" };
    }
    console.warn("Restore failed.", error);
    return { status: "failed", message: describeError(error) };
  }
}

/** The SDK reports a cancelled purchase by throwing an error carrying
 *  `userCancelled: true`, rather than resolving. Narrowed defensively
 *  because the thrown value is typed as unknown. */
function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    (error as { userCancelled?: boolean }).userCancelled === true
  );
}

function describeError(error: unknown): string {
  if (typeof error === "object" && error != null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "Something went wrong. Please try again.";
}
