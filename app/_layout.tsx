import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";

SplashScreen.preventAutoHideAsync();

// Split out of RootLayout because useTheme() has to run *below* the provider
// — a component can't consume a context it renders itself. Everything that
// depends on the resolved theme (the status bar style, the startup gate)
// lives here.
function AppShell() {
  const { mode, ready: themeReady } = useTheme();

  // theme/fonts.ts references these family names everywhere (Folder,
  // FoldersList, NewFolder, TopBar, the splash) but until now nothing ever
  // actually loaded them — every one of those screens has been silently
  // falling back to the system font.
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Wait for the saved theme as well as the fonts. Reading it is one
  // AsyncStorage hit and finishes long before the fonts do, so this costs
  // nothing in practice — but hiding the splash first would let the first
  // screen paint dark and then snap to light.
  const startupReady = fontsLoaded && themeReady;

  useEffect(() => {
    // Keep the native splash up until the real fonts and the saved theme are
    // ready, so there's no flash of system-font text or of the wrong palette.
    if (startupReady) {
      SplashScreen.hideAsync();
    }
  }, [startupReady]);

  if (!startupReady) {
    return null;
  }

  return (
    // Required for react-native-gesture-handler to actually capture
    // gestures (pan/pinch/etc.) instead of letting them fall through to
    // native scroll — every gesture-driven interaction in the app needs
    // this at the root, not just one screen.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Required for useSafeAreaInsets() (used by TopBar to clear the
          status bar/notch) to resolve real device insets anywhere below this. */}
      <SafeAreaProvider>
        {/* Inverted against the background, not tied to the OS setting: the
            app picks its own theme, so a light-mode phone running the dark
            theme still needs light status-bar glyphs. */}
        <StatusBar style={mode === "light" ? "dark" : "light"} />
        {/* No explicit Stack.Screen for "(tabs)" — Expo Router auto-registers
            it as a route regardless (file-based routing doesn't require a
            declared Screen to exist), and the explicit entry only ever
            supplied a headerTitle that headerShown: false already made
            inert. Removing it tests whether it was also the source of the
            "(tabs)" nested-children warning — a widely-reported, apparently
            cosmetic Expo Router quirk (github.com/expo/router/issues/759)
            that doesn't affect routing/rendering either way. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
