import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import * as SystemUI from "expo-system-ui";
import { themeFor, type ThemeColors, type ThemeMode } from "./colors";
import { getThemeModeFromStorageAsync, saveThemeModeToStorageAsync } from "@/persistence/FileStorage";

/** The app's default when nothing has ever been chosen. The palette was
 *  designed dark-first (see colors.ts), so an unconfigured install should
 *  look the way the app was drawn. */
const DEFAULT_MODE: ThemeMode = "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  /** The resolved palette for `mode`. Always one of the two module-level
   *  singletons in colors.ts, so `colors === LIGHT_THEME` identity checks
   *  (AddNote's and SearchNotesModal's DateTimePicker themeVariant) hold. */
  colors: ThemeColors;
  /** False until the persisted mode has been read back. The root layout
   *  holds the splash screen up on this, so no screen ever paints in the
   *  wrong theme and then snaps to the right one. */
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [ready, setReady] = useState(false);

  // Read once at startup. Every later write goes through setMode, so this
  // never needs to re-run — storage is the seed, React state is the source
  // of truth from here on.
  useEffect(() => {
    let cancelled = false;
    getThemeModeFromStorageAsync()
      .then((stored) => {
        if (cancelled) return;
        if (stored != null) setModeState(stored);
      })
      .catch((error) => {
        console.warn("Could not read the saved theme; falling back to the default.", error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The window behind the React root — visible for a frame during rotation,
  // over-scroll, and while a modal route animates in. Left unset it stays
  // the platform default (white on iOS), which flashes against the dark
  // theme's #211D19.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(themeFor(mode).bg);
  }, [mode]);

  // Native UI the app doesn't draw itself — Alert dialogs (home's delete
  // confirmation), the keyboard, native pickers — reads the *OS* colour
  // scheme, not ours. Without this, an OS-dark phone set to the app's light
  // theme gets a black Alert over a cream screen. Works because app.json
  // sets userInterfaceStyle: "automatic"; pinning it to a fixed value there
  // would make this call a no-op.
  //
  // Guarded because react-native-web has no setColorScheme — on web the
  // <StatusBar>/SystemUI pair above is already the whole story.
  useEffect(() => {
    if (typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme(mode);
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    // Flip the UI first and persist in the background: the toggle should feel
    // instant, and a failed write only costs the choice at next launch, which
    // is not worth blocking the repaint on.
    setModeState(next);
    saveThemeModeToStorageAsync(next).catch((error) => {
      console.warn("Could not save the theme choice.", error);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: themeFor(mode), ready, setMode }),
    [mode, ready, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Every screen's source of colors. Throws rather than silently handing back
 *  a default palette when the provider is missing — a screen rendered outside
 *  it is a wiring bug, and a silent fallback would only surface later as one
 *  screen mysteriously stuck in dark mode. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value == null) {
    throw new Error("useTheme() must be used inside a <ThemeProvider>.");
  }
  return value;
}
