import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash once Expo Router is ready.
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options = {{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerTitle: "Note It" }} />
    </Stack>
  );
}