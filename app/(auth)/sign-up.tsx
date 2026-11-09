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
import { Check, Circle, Eye, EyeOff } from "lucide-react-native";
import { auth } from "@/services/firebase";
import { getSignUpErrorMessage } from "@/services/auth";
import { createUserDocument } from "@/services/firestore";
import { setFirebaseUser, setUserStore } from "@/store/userStore";
import { Colors } from "@/constants/colors";
import { shadowStyle } from "@/utils/shadowStyle";
import {
  getPasswordRequirements,
  isPasswordValid,
  isValidEmailAddress,
} from "@/utils/authValidation";
import {
  formatUserName,
  getPublicUsername,
  UserNameFields,
} from "@/utils/userName";

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
  autoCapitalize?: "none" | "words";
  errorMessage?: string;
  invalid?: boolean;
  delay?: number;
};

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  errorMessage,
  invalid = false,
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
          (errorMessage || invalid) && styles.inputRowError,
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
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

function PasswordRequirements({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);

  return (
    <View style={styles.passwordRequirements}>
      {requirements.map((requirement) => (
        <View key={requirement.id} style={styles.passwordRequirementRow}>
          {requirement.met ? (
            <Check size={14} color={C.success} strokeWidth={3} />
          ) : (
            <Circle size={14} color={C.requirementMuted} />
          )}
          <Text
            style={[
              styles.passwordRequirementText,
              requirement.met && styles.passwordRequirementTextMet,
            ]}
          >
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
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

// ─── Screen: SignUp ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const heroAnim = useEntrance(100, 30);
  const cardAnim = useEntrance(250, 90);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const handleSignUp = async () => {
    if (submitting.current) return;
    setValidationAttempted(true);
    setError("");

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isValidEmailAddress(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid(password)) {
      setError("Please meet all password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const nameFields: UserNameFields = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || null,
        suffix: suffix.trim() || null,
      };
      const displayName = getPublicUsername(
        formatUserName(nameFields),
        email.trim(),
      );
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      await updateProfile(credential.user, {
        displayName,
      });

      await createUserDocument(credential.user, nameFields);
      setFirebaseUser(credential.user);
      await setUserStore({
        userId: credential.user.uid,
        username: displayName,
        email: credential.user.email ?? email.trim(),
      });
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(getSignUpErrorMessage(e));
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

          <AuthInput
            label="First Name"
            delay={350}
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              setError("");
            }}
            placeholder="Enter your first name"
            autoCapitalize="words"
            errorMessage={
              validationAttempted && !firstName.trim()
                ? "First name is required."
                : undefined
            }
          />

          <AuthInput
            label="Last Name"
            delay={390}
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setError("");
            }}
            placeholder="Enter your last name"
            autoCapitalize="words"
            errorMessage={
              validationAttempted && !lastName.trim()
                ? "Last name is required."
                : undefined
            }
          />

          <AuthInput
            label="Middle Name (Optional)"
            delay={410}
            value={middleName}
            onChangeText={(value) => {
              setMiddleName(value);
              setError("");
            }}
            placeholder="Enter your middle name"
            autoCapitalize="words"
          />

          <AuthInput
            label="Suffix (Optional)"
            delay={420}
            value={suffix}
            onChangeText={(value) => {
              setSuffix(value);
              setError("");
            }}
            placeholder="e.g. Jr., III"
            autoCapitalize="words"
          />

          <AuthInput
            label="Email"
            delay={430}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError("");
            }}
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
            delay={510}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError("");
            }}
            placeholder="Enter your password"
            secureEntry
            errorMessage={
              validationAttempted && !isPasswordValid(password)
                ? "Password does not meet the requirements."
                : undefined
            }
          />
          <PasswordRequirements password={password} />

          <AuthInput
            label="Confirm Password"
            delay={590}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setError("");
            }}
            placeholder="Confirm your password"
            secureEntry
            errorMessage={
              validationAttempted && !confirmPassword
                ? "Confirm password is required."
                : undefined
            }
            invalid={
              validationAttempted &&
              confirmPassword.length > 0 &&
              confirmPassword !== password
            }
          />
          {confirmPassword.length > 0 && (
            <View style={styles.passwordMatchStatus}>
              {passwordsMatch ? (
                <Check size={14} color={C.success} strokeWidth={3} />
              ) : (
                <Circle size={14} color={C.error} />
              )}
              <Text
                style={[
                  styles.passwordMatchText,
                  passwordsMatch
                    ? styles.passwordMatchTextMet
                    : styles.passwordMatchTextMismatch,
                ]}
              >
                {passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."}
              </Text>
            </View>
          )}

          {error &&
          ![
            "Please fill in all fields.",
            "Please enter a valid email address.",
            "Please meet all password requirements.",
            "Passwords do not match.",
          ].includes(error) ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <PrimaryButton
            delay={700}
            title={loading ? "CREATING..." : "SIGN UP"}
            onPress={handleSignUp}
            disabled={loading}
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
  success: "#25804F",
  requirementMuted: "#A39A96",
  error: "#B9382D",
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
    borderBottomColor: C.error,
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
    color: C.error,
    marginTop: 5,
  },

  // Error
  errorText: {
    fontSize: 11,
    color: C.error,
    textAlign: "center",
    marginBottom: 12,
  },
  passwordRequirements: {
    marginTop: -12,
    marginBottom: 14,
  },
  passwordRequirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  passwordRequirementText: {
    marginLeft: 7,
    fontSize: 11,
    color: C.requirementMuted,
  },
  passwordRequirementTextMet: {
    color: C.success,
  },
  passwordMatchStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -12,
    marginBottom: 14,
  },
  passwordMatchText: {
    marginLeft: 7,
    fontSize: 11,
  },
  passwordMatchTextMet: {
    color: C.success,
  },
  passwordMatchTextMismatch: {
    color: C.error,
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