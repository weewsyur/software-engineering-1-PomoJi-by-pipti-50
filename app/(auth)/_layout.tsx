import { Redirect, Stack, useSegments } from "expo-router";
import { AuthStatusScreen, useAuth } from "@/contexts/AuthContext";

export default function AuthLayout() {
  const { user, initializing, error } = useAuth();
  const segments = useSegments();

  if (initializing || error) {
    return <AuthStatusScreen error={error} />;
  }
  if (user && segments[1] === "welcome") {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
