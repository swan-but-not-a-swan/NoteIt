import { Stack } from "expo-router";
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // theme/fonts.ts references these family names everywhere (Folder,
  // FoldersList, NewFolder, TopBar, PoweredByFooter, the splash) but until
  // now nothing ever actually loaded them — every one of those screens has
  // been silently falling back to the system font.
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Keep the native splash up until the real fonts are ready, so there's
    // no flash of system-font text before they swap in.
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
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