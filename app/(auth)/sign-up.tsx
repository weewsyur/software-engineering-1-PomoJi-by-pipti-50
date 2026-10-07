import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { setFirebaseUser, setUserStore } from "@/store/userStore";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/utils/shadowStyle";

// ─── Animation helpers ────────────────────────────────────────────────────────

function useEntrance(delay = 0, distance = 24) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return {
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}

function FloatingBlob({
  style,
  amplitude = 12,
  duration = 3500,
  delay = 0,
}: {
  style: any;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [-amplitude, amplitude],
              }),
            },
            {
              translateX: v.interpolate({
                inputRange: [0, 1],
                outputRange: [amplitude / 2, -amplitude / 2],
              }),
            },
          ],
        },
      ]}
    />
  );
}

// ─── Reusable: AuthInput ──────────────────────────────────────────────────────

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureEntry?: boolean;
  keyboardType?: "default" | "email-address";
  delay?: number;
};

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
  delay = 0,
}: AuthInputProps) {
  const [secure, setSecure] = useState(secureEntry);
  const anim = useEntrance(delay, 16);

  return (
    <Animated.View style={[styles.inputGroup, anim]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          secureTextEntry={secure}
          autoCapitalize="none"
          keyboardType={keyboardType}
        />
        {secureEntry ? (
          <TouchableOpacity onPress={() => setSecure((s) => !s)}>
            <Text style={styles.toggleText}>{secure ? "Show" : "Hide"}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.checkIcon}>✓</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Reusable: PrimaryButton ──────────────────────────────────────────────────

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  delay?: number;
};

function PrimaryButton({ title, onPress, delay = 0 }: PrimaryButtonProps) {
  const entrance = useEntrance(delay, 24);
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      speed: 40,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={{
        opacity: entrance.opacity,
        transform: [...entrance.transform, { scale }],
      }}
    >
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onPress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        activeOpacity={0.82}
      >
        <Text style={styles.primaryButtonText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen: SignUp ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const heroAnim = useEntrance(100, 30);
  const cardAnim = useEntrance(250, 90);

  const handleSignUp = async () => {
    setError("");

    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const trimmedUsername = username.trim();

      await updateProfile(credential.user, {
        displayName: trimmedUsername,
      });

      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        username: trimmedUsername,
        email: credential.user.email ?? email.trim(),
        photoUrl: null,
        createdAt: serverTimestamp(),
      });
      setFirebaseUser(credential.user);
      await setUserStore({
        userId: credential.user.uid,
        username: trimmedUsername,
        email: credential.user.email ?? email.trim(),
      });
      router.replace("/(tabs)/home");
    } catch (e) {
      const error = e as { code?: string; message?: string };
      console.log("Sign up error:", error);

      // Map Firebase error codes to user-friendly messages
      if (error.code === "auth/email-already-in-use") {
        setError("Email is already registered. Please sign in.");
      } else if (error.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(error.message || "Unable to sign up. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Decorative blobs */}
      <FloatingBlob style={[styles.blob, styles.blobTopLeft]} amplitude={14} duration={4200} />
      <FloatingBlob style={[styles.blob, styles.blobBottomRight]} amplitude={10} duration={3600} delay={300} />
      <FloatingBlob style={[styles.blob, styles.blobMidLeft]} amplitude={16} duration={3200} delay={150} />

      {/* Top area */}
      <Animated.View style={[styles.topArea, heroAnim]}>
        <Text style={styles.eyebrow}>Get started</Text>
        <Text style={styles.heroTitle}>Create account</Text>
      </Animated.View>

      {/* Card */}
      <Animated.View style={[styles.card, cardAnim]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.cardTitle}>Register</Text>
          <Text style={styles.cardSub}>Fill in the details below</Text>

          {/* ── NEW: Username field ── */}
          <AuthInput
            label="Username"
            delay={350}
            value={username}
            onChangeText={setUsername}
            placeholder="Choose a username"
          />

          <AuthInput
            label="Email"
            delay={430}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
          />

          <AuthInput
            label="Password"
            delay={510}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry
          />

          <AuthInput
            label="Confirm Password"
            delay={590}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            delay={700}
            title={loading ? "CREATING..." : "SIGN UP"}
            onPress={handleSignUp}
          />

          <TouchableOpacity
            style={styles.switchWrapper}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  primary: Colors.primary,
  beige: "#F5F1E8",
  white: "#FFFFFF",
  textDark: "#1A0808",
  textMuted: "#9A7070",
  inputBorder: "#EAD8D8",
  placeholder: "#C4A8A8",
  roseLight: "#FDA4AF",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.beige,
    overflow: "hidden",
  },

  // Decorative blobs
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  blobTopLeft: {
    width: 500,
    height: 500,
    top: 1,
    left: 120,
    opacity: 1.0,
  },
  blobBottomRight: {
    width: 144,
    height: 144,
    bottom: -40,
    right: -40,
    opacity: 0.08,
  },
  blobMidLeft: {
    width: 350,
    height: 350,
    top: -195,
    right: 95,
    opacity: 0.6,
  },

  // Top area
  topArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: C.textDark,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: C.roseLight,
    marginTop: 2,
  },

  // Card
  card: {
    flex: 2.8,
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    ...shadowStyle("#000", 0, -3, 16, 0.06, 8),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textDark,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: C.roseLight,
    marginBottom: 24,
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: C.inputBorder,
    paddingBottom: 7,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: C.textDark,
    paddingVertical: 0,
  },
  toggleText: {
    fontSize: 12,
    color: C.roseLight,
    marginLeft: 8,
  },
  checkIcon: {
    fontSize: 14,
    color: C.roseLight,
    marginLeft: 8,
  },

  // Error
  errorText: {
    fontSize: 11,
    color: C.primary,
    textAlign: "center",
    marginBottom: 12,
  },

  // Primary button
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    ...shadowStyle(C.primary, 0, 6, 12, 0.28, 6),
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Switch link
  switchWrapper: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    fontSize: 12,
    color: C.textMuted,
  },
  switchLink: {
    color: C.primary,
    fontWeight: "600",
  },
});