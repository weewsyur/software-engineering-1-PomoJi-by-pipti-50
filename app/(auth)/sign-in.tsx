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
import { Eye, EyeOff } from "lucide-react-native";
import { setFirebaseUser, setUserStore } from "@/store/userStore";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/utils/shadowStyle";
import { isValidEmailAddress } from "@/utils/authValidation";
import { signIn } from "@/services/auth";
import { toast } from "@/components/Toast";

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
  errorMessage?: string;
  delay?: number;
};

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
  errorMessage,
  delay = 0,
}: AuthInputProps) {
  const [secure, setSecure] = useState(secureEntry);
  const [focused, setFocused] = useState(false);
  const anim = useEntrance(delay, 16);

  return (
    <Animated.View style={[styles.inputGroup, anim]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          errorMessage && styles.inputRowError,
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          secureTextEntry={secure}
          autoCapitalize="none"
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureEntry ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${secure ? "Show" : "Hide"} ${label.toLowerCase()}`}
            hitSlop={8}
            onPress={() => setSecure((s) => !s)}
            style={styles.visibilityButton}
          >
            {secure ? (
              <Eye size={18} color={C.primary} />
            ) : (
              <EyeOff size={18} color={C.primary} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldErrorText}>
          {errorMessage}
        </Text>
      ) : null}
    </Animated.View>
  );
}

// ─── Reusable: PrimaryButton ──────────────────────────────────────────────────

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  delay?: number;
  disabled?: boolean;
};

function PrimaryButton({
  title,
  onPress,
  delay = 0,
  disabled = false,
}: PrimaryButtonProps) {
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
        style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
        onPress={onPress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        disabled={disabled}
        accessibilityState={{ disabled }}
        activeOpacity={0.82}
      >
        <Text style={styles.primaryButtonText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen: SignIn ───────────────────────────────────────────────────────────

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const heroAnim = useEntrance(100, 30);
  const cardAnim = useEntrance(250, 90);

  const handleSignIn = async () => {
    if (submitting.current) return;

    setValidationAttempted(true);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.message("Please enter your email and password.", "error");
      return;
    }
    if (!isValidEmailAddress(trimmedEmail)) {
      toast.message("Please enter a valid email address.", "error");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const credential = await signIn(trimmedEmail, password);
      setFirebaseUser(credential.user);
      try {
        await setUserStore({
          userId: credential.user.uid,
          username: credential.user.displayName || "User",
          email: credential.user.email ?? trimmedEmail,
        });
      } catch {
        toast.message("Unable to complete sign in. Please try again.", "error");
        return;
      }
      toast.message("Welcome back! Login successful.", "success");
      router.replace("/(tabs)/home");
    } catch (error) {
      toast.message(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
        "error",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Decorative blobs */}
      <FloatingBlob
        style={[styles.blob, styles.blobTopLeft]}
        amplitude={14}
        duration={4200}
      />
      <FloatingBlob
        style={[styles.blob, styles.blobBottomRight]}
        amplitude={10}
        duration={3600}
        delay={300}
      />
      <FloatingBlob
        style={[styles.blob, styles.blobMidLeft]}
        amplitude={16}
        duration={3200}
        delay={150}
      />

      {/* Top area */}
      <Animated.View style={[styles.topArea, heroAnim]}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.heroTitle}>Sign in</Text>
      </Animated.View>

      {/* Card */}
      <Animated.View style={[styles.card, cardAnim]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.cardTitle}>Sign In</Text>

          <AuthInput
            label="Email"
            delay={350}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            errorMessage={
              validationAttempted
                ? !email.trim()
                  ? "Email is required."
                  : !isValidEmailAddress(email.trim())
                    ? "Enter a valid email address."
                    : undefined
                : undefined
            }
          />

          <AuthInput
            label="Password"
            delay={450}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry
            errorMessage={
              validationAttempted && !password
                ? "Password is required."
                : undefined
            }
          />

          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <PrimaryButton
            delay={600}
            title={loading ? "SIGNING IN..." : "SIGN IN"}
            onPress={handleSignIn}
            disabled={loading}
          />

          <TouchableOpacity
            style={styles.switchWrapper}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={styles.switchText}>
              Don&apos;t have an account?{" "}
              <Text style={styles.switchLink}>Sign up</Text>
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
    flex: 2.4,
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
    minHeight: 38,
    borderBottomWidth: 1,
    borderBottomColor: C.inputBorder,
    paddingBottom: 7,
  },
  inputRowFocused: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  inputRowError: {
    borderBottomColor: "#B9382D",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: C.textDark,
    paddingVertical: 0,
  },
  visibilityButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  fieldErrorText: {
    fontSize: 11,
    color: "#B9382D",
    marginTop: 5,
  },

  // Forgot password
  forgotWrapper: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 11,
    fontWeight: "500",
    color: C.primary,
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
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
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
