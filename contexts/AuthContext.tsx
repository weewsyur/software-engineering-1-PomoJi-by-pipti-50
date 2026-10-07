import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { auth } from "@/services/firebase";

interface AuthState {
  user: User | null;
  initializing: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    initializing: true,
    error: null,
  });

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => setAuthState({ user, initializing: false, error: null }),
      (error) => {
        console.error("Firebase auth state initialization failed:", error);
        setAuthState({ user: null, initializing: false, error });
      },
    );
  }, []);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const authState = useContext(AuthContext);
  if (!authState) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return authState;
}

export function AuthStatusScreen({ error }: { error?: Error | null }) {
  return (
    <View style={styles.container}>
      {!error && <ActivityIndicator size="large" />}
      <Text style={styles.message}>
        {error
          ? "Unable to check your sign-in status. Please restart the app and try again."
          : "Restoring your session..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#FFFEF1",
  },
  message: {
    color: "#2C2C2C",
    textAlign: "center",
  },
});
