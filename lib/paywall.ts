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
 * Resolves to a PAYWALL_RESULT: PURCHASED, RESTORED, CANCELLED or ERROR.
 * NOT_PRESENTED never comes from here; RevenueCat only returns it from
 * presentPaywallIfNeeded, when the customer already has the entitlement.
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

/**
 * What a paywall result means for the feature that asked for it:
 * - "granted": the customer holds Plus — bought or restored just now, or
 *   already had it, in which case presentPaywallIfNeeded skipped the paywall.
 * - "declined": the paywall was shown and closed without buying.
 * - "unavailable": the paywall couldn't be shown or the purchase failed —
 *   offline, or no store configured for this build.
 */
export type PaywallOutcome = "granted" | "declined" | "unavailable";

export function paywallOutcome(result: PAYWALL_RESULT): PaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
    // NOT_PRESENTED means they already have the entitlement. Treating it as
    // "not granted" left Plus users with a tap that did nothing whenever the
    // app's own entitlement read hadn't landed yet (at launch, or offline).
    case PAYWALL_RESULT.NOT_PRESENTED:
      return "granted";
    case PAYWALL_RESULT.ERROR:
      return "unavailable";
    default:
      return "declined";
  }
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
