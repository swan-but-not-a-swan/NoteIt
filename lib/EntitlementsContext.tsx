import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CustomerInfo } from "react-native-purchases";
import {
  PRO_ENTITLEMENT,
  fetchCustomerInfo,
  restorePurchases,
  subscribeToCustomerInfo,
  type PurchaseOutcome,
} from "./entitlements";
import { paywallOutcome, presentCustomerCenter, presentPaywallIfNeeded, type PaywallOutcome } from "./paywall";
import { isTestStore } from "./purchases";

/** The subscription behind an active Plus entitlement. */
export type PlusDetails = {
  /** In the free trial rather than a paid month. The store runs the trial
   *  and treats it as a subscription period like any other, so this is read
   *  from RevenueCat rather than tracked by the app. */
  inTrial: boolean;
  /** When the current period ends: the trial end date, or the next renewal.
   *  null for grants that never expire, such as a lifetime promotional one. */
  expiresAt: Date | null;
  /** false once the customer has cancelled. Plus stays on until `expiresAt`
   *  and then stops, which is the store's rule, not ours. */
  willRenew: boolean;
};

type PlusSnapshot = { hasPlus: boolean; details: PlusDetails | null };

function readPlus(info: CustomerInfo): PlusSnapshot {
  // entitlements.active only holds entitlements that are active right now,
  // with trial expiry, billing retry and grace periods already applied by
  // RevenueCat, so there is no date arithmetic to do here.
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT];
  if (entitlement == null) {
    return { hasPlus: false, details: null };
  }
  return {
    hasPlus: true,
    details: {
      inTrial: entitlement.periodType === "TRIAL",
      expiresAt: entitlement.expirationDate != null ? new Date(entitlement.expirationDate) : null,
      willRenew: entitlement.willRenew,
    },
  };
}

type EntitlementsContextValue = {
  /** Whether Plus is on: during the free trial, or while subscribed.
   *
   *  Tri-state, and the two kinds of call site read it differently on
   *  purpose. Ads compare `=== false`, so an unresolved read never flashes an
   *  ad at a paying customer on cold start. Paid features compare `=== true`,
   *  so an unresolved read never unlocks something for a free user. `null`
   *  is the honest answer until the first read lands, and each side picks the
   *  safe way to act on it. */
  hasPlus: boolean | null;
  /** Trial and renewal details while Plus is on; null otherwise. */
  plus: PlusDetails | null;
  /** True when running against RevenueCat's Test Store, where purchases are
   *  free and simulated. */
  isTestStore: boolean;
  /** Show the paywall unless they already have Plus. Resolves "granted" if
   *  they have access afterwards (including when they already had it),
   *  "declined" if they closed it, and "unavailable" if it couldn't be shown. */
  openPaywall: () => Promise<PaywallOutcome>;
  /** Self-service subscription management: cancel, change plan, refund. */
  openCustomerCenter: () => Promise<void>;
  /** Restore previous purchases. Required by both stores. */
  restore: () => Promise<PurchaseOutcome>;
  /** Force a re-read. Rarely needed, since the listener covers most cases. */
  refresh: () => void;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  // null until the first read lands. See `hasPlus` above for why that matters.
  const [snapshot, setSnapshot] = useState<PlusSnapshot | null>(null);

  // One effect owns both halves of the story, because neither works alone:
  // the initial fetch gives a value but goes stale the moment anything is
  // bought, and the listener reports changes but never fires with the current
  // state. Splitting them across two effects would also mean two configure()
  // paths racing on startup.
  useEffect(() => {
    let cancelled = false;

    fetchCustomerInfo()
      .then((info) => {
        if (cancelled) return;
        // A null here is a *failed read* (no API key, or offline), not a
        // customer without Plus. Leaving the state alone keeps it unresolved
        // rather than asserting "no Plus", so an offline launch shows no
        // banner instead of the wrong one.
        if (info != null) setSnapshot(readPlus(info));
      })
      .catch((error) => {
        console.warn("Could not read entitlements; treating them as unresolved.", error);
      });

    // Fires on purchase, restore, renewal, expiry and cancellation. It is also
    // what ends Plus when a trial runs out without converting: RevenueCat
    // refreshes CustomerInfo when the app returns to the foreground, and this
    // listener carries the change through.
    const unsubscribe = subscribeToCustomerInfo((info) => {
      if (!cancelled) setSnapshot(readPlus(info));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // The ads SDK is brought up by AdBannerStrip rather than here. That keeps
  // the ATT prompt and GDPR consent form tied to the component that actually
  // shows an ad, so a subscriber, whose banners never mount, is never asked
  // to consent to something they will not see.

  const refresh = useCallback(() => {
    fetchCustomerInfo()
      .then((info) => {
        if (info != null) setSnapshot(readPlus(info));
      })
      .catch((error) => {
        console.warn("Could not refresh entitlements.", error);
      });
  }, []);

  const openPaywall = useCallback(async () => {
    const outcome = paywallOutcome(await presentPaywallIfNeeded());
    // The listener normally fires on purchase and updates state on its own.
    // Refreshing anyway costs one cached read and closes the gap if the
    // paywall resolved without emitting an update — including when it was
    // skipped because they already had Plus but `hasPlus` hadn't caught up.
    if (outcome === "granted") refresh();
    return outcome;
  }, [refresh]);

  const openCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
    // Anything can have happened in there (a cancellation, a refund), and not
    // all of it emits a customer-info update, so re-read once it closes.
    refresh();
  }, [refresh]);

  const restore = useCallback(async () => {
    const outcome = await restorePurchases();
    if (outcome.status === "purchased") setSnapshot(readPlus(outcome.info));
    return outcome;
  }, []);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      hasPlus: snapshot == null ? null : snapshot.hasPlus,
      plus: snapshot?.details ?? null,
      isTestStore: isTestStore(),
      openPaywall,
      openCustomerCenter,
      restore,
      refresh,
    }),
    [snapshot, openPaywall, openCustomerCenter, restore, refresh],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

/** Source of truth for Plus. Throws when used outside the provider for the
 *  same reason useTheme() does: a screen rendered outside it is a wiring bug,
 *  and silently defaulting would surface much later as one screen advertising
 *  to subscribers. */
export function useEntitlements(): EntitlementsContextValue {
  const value = useContext(EntitlementsContext);
  if (value == null) {
    throw new Error("useEntitlements() must be used inside an <EntitlementsProvider>.");
  }
  return value;
}
