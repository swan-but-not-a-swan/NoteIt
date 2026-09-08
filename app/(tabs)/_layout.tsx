import { Stack } from "expo-router";

// This is what makes "(tabs)" a real nested route Expo Router can match —
// without a _layout.tsx here, the group folder is just a path prefix, not a
// cohesive route, and app/_layout.tsx's <Stack.Screen name="(tabs)" />
// silently matches nothing.
//
// Plain Stack for now since there's only one screen (home/Folders) and no
// custom bottom-nav UI built yet. When Gallery exists and the custom
// Folders|FAB|Gallery nav is built, this can become a real `Tabs` navigator
// (with the default tab bar hidden, since that nav isn't router-driven).
export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="folder/[id]" />
      {/* Modal presentation keeps the slide-up the viewer had as a <Modal>,
          while still being a real route — so the back gesture works and
          AddNote can present over it. */}
      <Stack.Screen name="note/[id]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
