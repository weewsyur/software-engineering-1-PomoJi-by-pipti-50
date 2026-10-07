import { Redirect } from "expo-router";
import { AuthStatusScreen, useAuth } from "@/contexts/AuthContext";

export default function HomeScreen() {
  const { user, initializing, error } = useAuth();

  if (initializing || error) {
    return <AuthStatusScreen error={error} />;
  }

  return (
    <Redirect
      href={user ? "/(tabs)/home" : "/(auth)/welcome"}
    />
  );
}
