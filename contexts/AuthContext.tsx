import {
  createContext,
  ReactNode,
  useContext,
  useCallback,
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

interface AuthContextValue extends AuthState {
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    initializing: true,
    error: null,
  });
  const refreshUser = useCallback(() => {
    setAuthState((state) => ({ ...state, user: auth.currentUser }));
  }, []);

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
    <AuthContext.Provider value={{ ...authState, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
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
