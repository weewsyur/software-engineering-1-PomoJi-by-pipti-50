import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

// ─── Reusable: AuthInput ──────────────────────────────────────────────────────

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureEntry?: boolean;
  keyboardType?: "default" | "email-address";
};

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
}: AuthInputProps) {
  const [secure, setSecure] = useState(secureEntry);

  return (
    <View style={styles.inputGroup}>
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
    </View>
  );
}

// ─── Reusable: PrimaryButton ──────────────────────────────────────────────────

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
};

function PrimaryButton({ title, onPress }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={styles.primaryButton}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen: SignUp ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = () => {
    setError("");
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
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
    // TODO: replace with your actual registration call
    console.log("Sign up →", { email, password });
    router.replace("/(tabs)/home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />
      <View style={[styles.blob, styles.blobMidLeft]} />

      {/* Top area */}
      <View style={styles.topArea}>
        <Text style={styles.eyebrow}>Get started</Text>
        <Text style={styles.heroTitle}>Create account</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.cardTitle}>Register</Text>
          <Text style={styles.cardSub}>Fill in the details below</Text>

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry
          />

          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton title="SIGN UP" onPress={handleSignUp} />

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
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  primary: "#C94C3C",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
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
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
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
