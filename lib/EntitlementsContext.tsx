import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCustomerInfo, isAdFree as readAdFree, subscribeToCustomerInfo } from "./entitlements";

type EntitlementsContextValue = {
  /** Whether ads should be suppressed for this customer.
   *
   *  Deliberately tri-state: `null` means "not resolved yet", not "no". A
   *  plain boolean defaulting to false would render a banner for the frame
   *  or two before the first read lands — so a paying customer sees an ad
   *  flash on every cold start, which is exactly the thing they paid to
   *  stop. Call sites compare `=== false`, never `!isAdFree`.
   *
   *  There's no separate `ready` flag the way ThemeContext has one: `mode`
   *  there has a legitimate default to fall back on, whereas here "unknown"
   *  is a real state the UI has to render differently, so folding it into
   *  the value itself keeps one source of truth instead of two. */
  isAdFree: boolean | null;
  /** Force a re-read. Needed after a purchase completes on a screen that
   *  isn't listening, and for a "Restore purchases" button. */
  refresh: () => void;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [isAdFree, setIsAdFree] = useState<boolean | null>(null);

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
        // unresolved rather than asserting "not ad free", so an offline
        // launch shows no banner instead of the wrong one.
        if (info != null) setIsAdFree(readAdFree(info));
      })
      .catch((error) => {
        console.warn("Could not read entitlements; treating them as unresolved.", error);
      });

    // Fires on purchase, restore, expiry and transfer. Without it a customer
    // who buys "remove ads" keeps seeing them until the app is restarted.
    const unsubscribe = subscribeToCustomerInfo((info) => {
      if (!cancelled) setIsAdFree(readAdFree(info));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    fetchCustomerInfo()
      .then((info) => {
        if (info != null) setIsAdFree(readAdFree(info));
      })
      .catch((error) => {
        console.warn("Could not refresh entitlements.", error);
      });
  }, []);

  const value = useMemo<EntitlementsContextValue>(
    () => ({ isAdFree, refresh }),
    [isAdFree, refresh],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

/** Source of truth for whether to show ads. Throws when used outside the
 *  provider for the same reason useTheme() does — a screen rendered outside
 *  it is a wiring bug, and silently defaulting to "show ads" would surface
 *  much later as one screen inexplicably advertising to Pro customers. */
export function useEntitlements(): EntitlementsContextValue {
  const value = useContext(EntitlementsContext);
  if (value == null) {
    throw new Error("useEntitlements() must be used inside an <EntitlementsProvider>.");
  }
  return value;
}
