// The web preview has no ads SDK (the banner and end-of-list ad have web
// stand-ins too), so saving just moves on.
export function useSaveInterstitial(_kind: "image" | "video" | null, _enabled: boolean) {
  return function showThen(next: () => void) {
    next();
  };
}
