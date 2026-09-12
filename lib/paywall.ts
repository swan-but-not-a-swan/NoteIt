import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { PRO_ENTITLEMENT, configurePurchases } from "./entitlements";

export { PAYWALL_RESULT };

/**
 * Show the paywall configured in the RevenueCat dashboard.
 *
 * The layout, copy, pricing and product ordering all live in the dashboard,
 * not here — which is the point. Changing the offer, running a price test,
 * or swapping the hero image becomes a dashboard edit rather than an app
 * release and a week of store review.
 *
 * Resolves to a PAYWALL_RESULT. NOT_PRESENTED is the one worth handling
 * explicitly: it means no paywall is configured for the current offering,
 * so the customer saw nothing at all. Silently treating that as "declined"
 * hides a misconfiguration that would otherwise be obvious.
 */
export async function presentPaywall(): Promise<PAYWALL_RESULT> {
  if (!configurePurchases()) {
    return PAYWALL_RESULT.ERROR;
  }

  try {
    return await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  } catch (error) {
    console.warn("Could not present the paywall.", error);
    return PAYWALL_RESULT.ERROR;
  }
}

/**
 * Show the paywall only if the customer doesn't already have Pro.
 *
 * Prefer this at feature gates — it collapses "check the entitlement, then
 * maybe show the paywall" into one call that cannot race, and returns
 * NOT_PRESENTED when they already had access.
 */
export async function presentPaywallIfNeeded(): Promise<PAYWALL_RESULT> {
  if (!configurePurchases()) {
    return PAYWALL_RESULT.ERROR;
  }

  try {
    return await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      displayCloseButton: true,
    });
  } catch (error) {
    console.warn("Could not present the paywall.", error);
    return PAYWALL_RESULT.ERROR;
  }
}

/** True when the paywall ended with the customer holding Pro — either they
 *  bought it just now or restored an earlier purchase. */
export function paywallGrantedAccess(result: PAYWALL_RESULT): boolean {
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

/**
 * Show RevenueCat's Customer Center — the self-service screen for managing
 * a subscription: cancel, change plan, restore, request a refund, contact
 * support.
 *
 * Worth wiring into Settings rather than building these flows by hand.
 * Cancellation and refund paths differ per store and change over time, and
 * both Apple and Google expect an app selling subscriptions to offer a route
 * to manage them. This is also where a "restore purchases" affordance can
 * live instead of a bare button.
 */
export async function presentCustomerCenter(): Promise<void> {
  if (!configurePurchases()) {
    return;
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    console.warn("Could not present the Customer Center.", error);
  }
}
