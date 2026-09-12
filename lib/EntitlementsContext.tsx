import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchCustomerInfo,
  isPro as readIsPro,
  restorePurchases,
  subscribeToCustomerInfo,
  type PurchaseOutcome,
} from "./entitlements";
import { paywallGrantedAccess, presentCustomerCenter, presentPaywallIfNeeded } from "./paywall";
import { isTestStore } from "./purchases";

type EntitlementsContextValue = {
  /** Whether this customer has Pro — and so whether ads are suppressed.
   *
   *  Deliberately tri-state: `null` means "not resolved yet", not "no". A
   *  plain boolean defaulting to false would render a banner for the frame
   *  or two before the first read lands — so a paying customer sees an ad
   *  flash on every cold start, which is exactly the thing they paid to
   *  stop. Call sites compare `=== false`, never `!isPro`.
   *
   *  There's no separate `ready` flag the way ThemeContext has one: `mode`
   *  there has a legitimate default to fall back on, whereas here "unknown"
   *  is a real state the UI has to render differently, so folding it into
   *  the value itself keeps one source of truth instead of two. */
  isPro: boolean | null;
  /** True when running against RevenueCat's Test Store, where purchases are
   *  free and fake. Surface it somewhere visible in dev builds so a test
   *  purchase is never mistaken for a real one. */
  isTestStore: boolean;
  /** Show the paywall unless they already have Pro. Resolves true if they
   *  came out of it with access. */
  openPaywall: () => Promise<boolean>;
  /** Self-service subscription management — cancel, change plan, refund. */
  openCustomerCenter: () => Promise<void>;
  /** Restore previous purchases. Required by both stores. */
  restore: () => Promise<PurchaseOutcome>;
  /** Force a re-read. Rarely needed — the listener covers most cases. */
  refresh: () => void;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState<boolean | null>(null);

  // One effect owns both halves of the story, because neither works alone:
  // the initial fetch gives a value but goes stale the moment anything is
  // purchased, and the listener reports changes but never fires with the
  // current state. Splitting them across two effects would also mean two
  // configure() paths racing on startup.
  useEffect(() => {
    let cancelled = false;

    fetchCustomerInfo()
      .then((info) => {
        if (cancelled) return;
        // A null here is a *failed read* (no API key, or offline), not a
        // customer without entitlements. Leaving the state alone keeps it
        // unresolved rather than asserting "not Pro", so an offline launch
        // shows no banner instead of the wrong one.
        if (info != null) setIsPro(readIsPro(info));
      })
      .catch((error) => {
        console.warn("Could not read entitlements; treating them as unresolved.", error);
      });

    // Fires on purchase, restore, expiry and transfer. Without it a customer
    // who buys Pro keeps seeing ads until the app is restarted.
    const unsubscribe = subscribeToCustomerInfo((info) => {
      if (!cancelled) setIsPro(readIsPro(info));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    fetchCustomerInfo()
      .then((info) => {
        if (info != null) setIsPro(readIsPro(info));
      })
      .catch((error) => {
        console.warn("Could not refresh entitlements.", error);
      });
  }, []);

  const openPaywall = useCallback(async () => {
    const result = await presentPaywallIfNeeded();
    const granted = paywallGrantedAccess(result);
    // The customer-info listener normally fires on purchase and updates
    // state on its own. Refreshing anyway costs one cached read and closes
    // the gap if the paywall resolved without emitting an update.
    if (granted) refresh();
    return granted;
  }, [refresh]);

  const openCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
    // Anything can have happened in there — a cancellation, a plan change, a
    // refund — and not all of them emit a customer-info update, so re-read
    // once it closes.
    refresh();
  }, [refresh]);

  const restore = useCallback(async () => {
    const outcome = await restorePurchases();
    if (outcome.status === "purchased") setIsPro(outcome.isPro);
    return outcome;
  }, []);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      isPro,
      isTestStore: isTestStore(),
      openPaywall,
      openCustomerCenter,
      restore,
      refresh,
    }),
    [isPro, openPaywall, openCustomerCenter, restore, refresh],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

/** Source of truth for Pro access. Throws when used outside the provider for
 *  the same reason useTheme() does — a screen rendered outside it is a wiring
 *  bug, and silently defaulting to "not Pro" would surface much later as one
 *  screen inexplicably advertising to paying customers. */
export function useEntitlements(): EntitlementsContextValue {
  const value = useContext(EntitlementsContext);
  if (value == null) {
    throw new Error("useEntitlements() must be used inside an <EntitlementsProvider>.");
  }
  return value;
}
