import { useRouter } from "expo-router";
import InAppSplash from "@/components/in-app-splash";

export default function Index() {
  const router = useRouter();

  return (
    <InAppSplash
      onFinish={() => router.replace("/(tabs)/home")}
    />
  );
}