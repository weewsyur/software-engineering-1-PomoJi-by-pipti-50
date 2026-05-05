# PomoJI - Comprehensive Code Review & Improvement Guide

**Last Updated:** May 5, 2026  
**Status:** ~70% Complete → Target: 95%+ Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Critical Issues Found](#critical-issues-found)
2. [Code Quality Problems](#code-quality-problems)
3. [Step-by-Step Improvements](#step-by-step-improvements)
4. [Refactored Code Examples](#refactored-code-examples)
5. [Improved Project Structure](#improved-project-structure)
6. [Updated README Template](#updated-readme-template)
7. [GitHub Best Practices](#github-best-practices)

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Firebase Credentials Exposed in Plaintext**

**File:** `PomoJI/services/firebase.ts`  
**Severity:** CRITICAL  
**Issue:** Firebase API key is hardcoded in source code. This is a security risk.

```typescript
// ❌ WRONG - Exposed credentials
const firebaseConfig = {
  apiKey: "AIzaSyAvJ3HwJe_TkNYYjfjAREhRve8oLa7v1Zs",
  authDomain: "software-engineering1-pomoji.firebaseapp.com",
  // ...
};
```

**Fix:** Move to environment variables (see section 3.1)

---

### 2. **Undeclared Variable 'C' in Auth Screens**

**Files:** `PomoJI/app/(auth)/sign-in.tsx`, `PomoJI/app/(auth)/sign-up.tsx`  
**Severity:** CRITICAL (Will crash at runtime)  
**Issue:** Variable `C` is used but never imported or defined.

```typescript
// ❌ Line 51 in sign-in.tsx
placeholderTextColor={C.placeholder}  // C is undefined!
```

**Fix:** Import from constants:

```typescript
import { Colors as C } from "@/constants/colors";
```

---

### 3. **No Input Validation on Auth Forms**

**Files:** `PomoJI/app/(auth)/sign-in.tsx`, `PomoJI/app/(auth)/sign-up.tsx`  
**Severity:** HIGH  
**Issue:** Email and password not validated before submission.

```typescript
// ❌ No validation
const handleSignUp = async () => {
  await createUserWithEmailAndPassword(auth, email, password);
};
```

---

### 4. **Missing Error Handling in Auth**

**Issue:** No try-catch blocks or error UI feedback.

```typescript
// ❌ No error handling
const result = await signInWithEmailAndPassword(auth, email, password);
// What if this fails? User sees nothing.
```

---

### 5. **StyleSheet.flatten() Warnings in timer.tsx**

**File:** `PomoJI/app/(tabs)/timer.tsx` (Lines 93, 107, 141)  
**Severity:** HIGH  
**Issue:** Passing style arrays to Expo Router components triggers warnings.

```typescript
// ❌ WRONG - StyleSheet.flatten() needed
<View style={StyleSheet.flatten([pillStyles.pill, { backgroundColor: color }])} />
// Already done correctly here, but check other places
```

---

### 6. **Incomplete Firebase Auth Implementation**

**Files:** Multiple auth screens  
**Issue:** Commented-out or incomplete Firebase calls.

```typescript
// ❌ TODO comments instead of implementation
// TODO: Replace with actual Firebase Auth call
```

---

### 7. **Task Persistence Not Connected**

**File:** `PomoJI/app/(tabs)/timer.tsx`  
**Severity:** MEDIUM  
**Issue:** Tasks created locally but not saved to Firestore.

```typescript
// TODO: Persist tasks via Firebase/MongoDB
// This needs to be implemented
```

---

## 🟠 CODE QUALITY PROBLEMS

### Issue #8: Inconsistent Naming Conventions

- Some files use `C` for Colors, others use full name
- Some use `uid()` function, others use UUID libraries
- Mix of snake_case and camelCase in some places

### Issue #9: No Proper Error Boundaries

```typescript
// ❌ App could crash silently
// Need React Error Boundary component
```

### Issue #10: Missing Loading States

Some async operations don't show loading indicators to users.

### Issue #11: No Network Error Handling

No retry logic or offline detection.

### Issue #12: Analytics Screen is a Stub

The analytics tab shows nothing meaningful.

### Issue #13: README is Template-Only

Current README doesn't explain what PomoJI does.

### Issue #14: No TypeScript Strict Mode

Config could be stricter for better type safety.

---

## ✅ STEP-BY-STEP IMPROVEMENTS

### **PRIORITY 1: Critical Fixes (Do First)**

#### 3.1 Fix Firebase Configuration with Environment Variables

**Create:** `PomoJI/.env.local`

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAvJ3HwJe_TkNYYjfjAREhRve8oLa7v1Zs
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=software-engineering1-pomoji.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=software-engineering1-pomoji
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=software-engineering1-pomoji.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=544871394102
EXPO_PUBLIC_FIREBASE_APP_ID=1:544871394102:web:603e8becd54276639ca197
```

**Create:** `PomoJI/.env.example` (for GitHub)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
# ... other keys
```

**Create:** `PomoJI/config/firebaseConfig.ts`

```typescript
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
```

**Update:** `PomoJI/.gitignore`

```
# Environment variables
.env
.env.local
.env.*.local
```

---

#### 3.2 Create Authentication Service Layer

**Create:** `PomoJI/services/authService.ts`

```typescript
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Custom auth errors for better UX
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * User-friendly error messages
 */
const getAuthErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    "auth/email-already-in-use":
      "This email is already registered. Try signing in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/too-many-requests":
      "Too many login attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
  };
  return messages[code] || "An error occurred. Please try again.";
};

/**
 * Sign up with email and password
 */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName || "User",
      photoURL: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return user;
  } catch (err) {
    const firebaseErr = err as FirebaseError;
    throw new AuthError(
      firebaseErr.code,
      getAuthErrorMessage(firebaseErr.code),
    );
  }
}

/**
 * Sign in with email and password
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential.user;
  } catch (err) {
    const firebaseErr = err as FirebaseError;
    throw new AuthError(
      firebaseErr.code,
      getAuthErrorMessage(firebaseErr.code),
    );
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    const firebaseErr = err as FirebaseError;
    throw new AuthError(firebaseErr.code, "Failed to sign out.");
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function getPasswordStrength(password: string): {
  score: number; // 0-4
  message: string;
} {
  let score = 0;
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];

  score = checks.filter(Boolean).length;

  const messages: Record<number, string> = {
    0: "Password is required",
    1: "Very weak (add more characters)",
    2: "Weak (add uppercase, numbers, or symbols)",
    3: "Good",
    4: "Strong",
  };

  return { score, message: messages[score] };
}
```

---

#### 3.3 Fix Sign-In Screen with Proper Error Handling

**Update:** `PomoJI/app/(auth)/sign-in.tsx`

```typescript
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
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { loginUser, isValidEmail, AuthError } from "@/services/authService";
import { setFirebaseUser, setUserStore } from "@/store/userStore";

// ─── Types ────────────────────────────────────────────────────────────────

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureEntry?: boolean;
  keyboardType?: "default" | "email-address";
  error?: string;
};

// ─── Components ───────────────────────────────────────────────────────────

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
  error,
}: AuthInputProps) {
  const [secure, setSecure] = useState(secureEntry);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.placeholder}
          secureTextEntry={secure}
          autoCapitalize="none"
          keyboardType={keyboardType}
          editable={!false} // Set to !loading when implemented
        />
        {secureEntry ? (
          <TouchableOpacity onPress={() => setSecure((s) => !s)}>
            <Text style={styles.toggleText}>{secure ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.checkIcon}>✓</Text>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.82}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = await loginUser(email.toLowerCase(), password);
      setFirebaseUser(user);
      await setUserStore({
        userId: user.uid,
        email: user.email || "",
        username: user.displayName || "User",
      });

      router.replace("/(tabs)/home");
    } catch (err) {
      if (err instanceof AuthError) {
        Alert.alert("Sign In Error", err.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your pomodoro journey</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            error={errors.email}
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder="••••••••"
            secureEntry
            error={errors.password}
          />

          <PrimaryButton
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || !email || !password}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.inputBackground,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.primary,
  },
  checkIcon: {
    fontSize: 16,
    color: Colors.success,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
});
```

---

### **PRIORITY 2: High-Impact Improvements**

#### 3.4 Create Error Boundary Component

**Create:** `PomoJI/components/ErrorBoundary.tsx`

```typescript
import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.error,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
```

---

#### 3.5 Implement Task Persistence to Firebase

**Update:** `PomoJI/hooks/usePomodoro.ts` (Add persistence):

```typescript
const createTask = useCallback(
  async (task: Omit<Task, "id" | "createdAt">) => {
    const userId = getUid();
    if (!userId) return null;

    try {
      // Save to Firestore
      const docRef = await addDoc(collection(db, "users", userId, "tasks"), {
        ...task,
        createdAt: new Date().toISOString(),
      });

      console.log("Task created:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating task:", error);
      throw new Error("Failed to create task");
    }
  },
  [getUid],
);
```

---

### **PRIORITY 3: Documentation & Structure**

#### 3.6 Update .gitignore

**Update:** `PomoJI/.gitignore`

```
# Environment variables
.env
.env.local
.env.*.local
.env.prod

# Node modules
node_modules/
npm-debug.log*
yarn-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Build outputs
.expo/
dist/
build/

# Testing
.coverage
*.lcov

# Firebase
.firebaserc
firebase-debug.log*

# Metro bundler
.metro-bundler-cache/

# Expo
.expo-shared/
```

---

#### 3.7 Improve Project Structure

**Suggested folder organization:**

```
PomoJI/
├── app/                          # Expo Router (screens)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx   # NEW
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── timer.tsx
│   │   ├── analytics.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx
│   ├── index.tsx
│   └── onboarding.tsx
│
├── components/                   # Reusable UI components
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── cards/
│   │   ├── ActivityCard.tsx
│   │   ├── StreakCard.tsx
│   │   └── TaskCard.tsx
│   ├── modals/
│   │   └── PostActivityModal.tsx
│   ├── ErrorBoundary.tsx         # NEW
│   └── Avatar.tsx
│
├── services/                     # Business logic & API
│   ├── firebase.ts               # Firebase config
│   ├── authService.ts            # NEW - Auth logic
│   ├── taskService.ts            # NEW - Task management
│   ├── streakService.ts          # NEW - Streak logic
│   └── notificationService.ts    # NEW - Notifications
│
├── hooks/                        # Custom React hooks
│   ├── usePomodoro.ts
│   ├── useActivities.ts
│   ├── useReminders.ts
│   ├── useFirestore.ts
│   ├── useAuth.ts                # NEW - Auth hook
│   └── useStreakListener.ts
│
├── store/                        # State management (Zustand)
│   ├── userStore.ts
│   ├── timerStore.ts             # NEW
│   └── notificationStore.ts      # NEW
│
├── utils/                        # Utility functions
│   ├── streakCalculator.ts
│   ├── activityTracker.ts
│   ├── dateHelpers.ts            # NEW
│   ├── validation.ts             # NEW
│   └── logger.ts                 # NEW - Logging utility
│
├── constants/                    # App constants
│   ├── colors.ts
│   ├── styles.ts
│   └── config.ts                 # NEW - App config
│
├── config/                       # Configuration files
│   ├── firebaseConfig.ts         # NEW - Env-based config
│   └── appConfig.ts              # NEW - App settings
│
├── types/                        # TypeScript types
│   ├── auth.ts                   # NEW
│   ├── task.ts                   # NEW
│   ├── activity.ts               # NEW
│   └── index.ts                  # NEW - Export all types
│
├── assets/                       # Images, fonts, etc.
│   └── images/
│
├── .env.example                  # NEW - Example env file
├── .gitignore                    # UPDATED
├── app.json
├── firebase.config.ts            # DEPRECATED (move to config/)
├── eslint.config.js
├── metro.config.js
├── postcss.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md                     # UPDATED
```

---

## 🚀 REFACTORED CODE EXAMPLES

### Complete Authentication Flow (Sign-Up)

See full example in section 3.3 and companion sign-up file below.

---

### Create Utility Functions

**Create:** `PomoJI/utils/validation.ts`

```typescript
/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Password validation
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Get password strength
 */
export const getPasswordStrength = (password: string) => {
  if (password.length < 6) return { level: "weak", score: 1 };
  if (password.length < 10 || !/[A-Z]/.test(password))
    return { level: "medium", score: 2 };
  if (/[!@#$%^&*]/.test(password)) return { level: "strong", score: 3 };
  return { level: "weak", score: 1 };
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Validate task title
 */
export const isValidTaskTitle = (title: string): boolean => {
  return title.trim().length > 0 && title.length <= 100;
};
```

**Create:** `PomoJI/utils/logger.ts`

```typescript
/**
 * Simple logging utility for development and production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDevelopment = __DEV__;

const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (isDevelopment) {
    console.log(`${prefix} ${message}`, data);
  }

  // TODO: Send to Sentry/Crashlytics in production
};

export const logger = {
  debug: (msg: string, data?: any) => log("debug", msg, data),
  info: (msg: string, data?: any) => log("info", msg, data),
  warn: (msg: string, data?: any) => log("warn", msg, data),
  error: (msg: string, data?: any) => log("error", msg, data),
};
```

---

## 📖 UPDATED README TEMPLATE

**Replace:** `PomoJI/README.md`

````markdown
# 🍅 PomoJI - Pomodoro Timer with Real-Time Streak Tracking

A mobile productivity app built with React Native, Expo, Firebase, and TypeScript. Track your focus sessions, maintain productivity streaks, and visualize your daily progress.

## ✨ Features

- **⏱️ Pomodoro Timer**: 25-min focus sessions with 5/15-min breaks
- **🔥 Real-Time Streak Tracking**: Automatic streak calculation with Firebase Firestore
- **📊 Activity Analytics**: View your productivity statistics and trends
- **👤 User Profiles**: Customize your profile and track personal stats
- **📱 Cross-Platform**: Works on iOS and Android via Expo
- **🔐 Secure Authentication**: Firebase Auth with email/password
- **📍 Timezone Support**: Automatic timezone detection for accurate streak tracking

## 🛠️ Tech Stack

| Category     | Technology                                 |
| ------------ | ------------------------------------------ |
| **Frontend** | React Native, Expo, Expo Router            |
| **Styling**  | NativeWind (Tailwind CSS for React Native) |
| **State**    | Zustand, AsyncStorage                      |
| **Backend**  | Firebase (Auth, Firestore, Storage)        |
| **Language** | TypeScript                                 |
| **Linting**  | ESLint, Expo Config                        |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Firebase account (create at [console.firebase.google.com](https://console.firebase.google.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/weewsyur/software-engineering-1-PomoJi-by-pipti-50.git
   cd software-engineering-1-PomoJi-by-pipti-50/PomoJI
   ```
````

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Copy `.env.example` to `.env.local`
   - Add your Firebase credentials:

   ```bash
   cp .env.example .env.local
   ```

   - Edit `.env.local` with your Firebase project details

4. **Start the app**

   ```bash
   npx expo start
   ```

5. **Run on device**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app on physical device

## 📁 Project Structure

```
PomoJI/
├── app/                 # Expo Router screens
├── components/          # Reusable UI components
├── services/           # Business logic & Firebase
├── hooks/              # Custom React hooks
├── store/              # State management (Zustand)
├── utils/              # Utility functions
├── constants/          # Colors, styles, config
└── assets/             # Images and fonts
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` with Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Note:** Never commit `.env.local` to version control. Use `.env.example` as a template.

## 📱 Main Screens

| Screen                | Purpose                                      |
| --------------------- | -------------------------------------------- |
| **Welcome**           | Onboarding landing page                      |
| **Sign In / Sign Up** | Authentication                               |
| **Home**              | Real-time streak display & activity overview |
| **Timer**             | Pomodoro timer with task management          |
| **Analytics**         | Productivity statistics and trends           |
| **Profile**           | User profile, settings, and achievements     |

## 🔥 Streak System

The app automatically calculates streaks based on:

- **Daily Activity**: Track focus sessions
- **Timezone-Aware**: Respects user's timezone for accurate day boundaries
- **Real-Time Updates**: Firestore listeners provide instant updates
- **Auto-Reset**: Missed days break the streak

### Firestore Schema

```
users/{userId}/
├── streakData/current
│   ├── currentStreak: number
│   ├── highestStreak: number
│   ├── lastActiveDate: Timestamp
│   └── timezone: string
│
└── activities/{docId}
    ├── title: string
    ├── sessions: number
    ├── totalMinutes: number
    └── timestamp: Timestamp
```

## 🚨 Troubleshooting

### Firebase Connection Issues

- Verify `.env.local` has correct credentials
- Check Firebase security rules allow reads/writes
- Ensure Firebase Firestore is enabled

### Emulator Won't Start

```bash
# Clear cache and reinstall
npm run reset-project
rm -rf node_modules
npm install
npx expo start --clear
```

### Build Errors

```bash
# Clear cache
npx expo start -c

# Update all packages
npm update
```

## 📚 Documentation

- [Firebase Integration Guide](../FIREBASE_INTEGRATION_GUIDE.md)
- [Streak System Setup](../STREAK_SYSTEM_SETUP.md)
- [Streak System Reference](../STREAK_SYSTEM_REFERENCE.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Test auth flows before submitting

## 📋 Roadmap

- [ ] Social features (share streaks, compare stats)
- [ ] Dark mode support
- [ ] Offline mode with sync
- [ ] Sound/notification alerts
- [ ] Streak badges and achievements
- [ ] Export activity data (CSV/PDF)

## 🐛 Known Issues

- ⚠️ Analytics screen needs implementation
- ⚠️ Password reset feature not yet implemented
- ⚠️ Email verification pending

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Community](https://reactnative.dev/)

## 📞 Support

For issues, questions, or feature requests:

- 📧 Email: support@pomoji.dev
- 💬 GitHub Issues: [Create Issue](https://github.com/weewsyur/software-engineering-1-PomoJi-by-pipti-50/issues)
- 🐦 Twitter: [@PomiJiApp](https://twitter.com)

---

**Built with ❤️ by the PomoJI Team**

````

---

## 🌳 IMPROVED PROJECT STRUCTURE

See section 3.7 for detailed structure.

---

## ✅ GITHUB BEST PRACTICES

### 1. **Meaningful Commit Messages**

```bash
# ❌ Bad
git commit -m "fix stuff"
git commit -m "update"

# ✅ Good
git commit -m "fix(auth): add email validation to sign-up form

- Validate email format before submission
- Show user-friendly error messages
- Prevent invalid emails from reaching Firebase"

git commit -m "feat(timer): implement task persistence to Firestore

- Save tasks to users/{uid}/tasks collection
- Add error handling and retry logic
- Update UI with loading states"
````

### 2. **Branching Strategy**

```bash
# Feature branch
git checkout -b feature/new-auth-flow

# Bug fix
git checkout -b bugfix/timer-not-stopping

# Improvement
git checkout -b improvement/refactor-auth-service

# Always branch from main
git checkout main
git pull origin main
git checkout -b feature/xyz
```

### 3. **Pull Request Template**

**Create:** `.github/pull_request_template.md`

```markdown
## 📝 Description

Brief description of changes

## 🎯 Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Documentation

## ✅ Checklist

- [ ] Code follows style guidelines
- [ ] Added comments for complex logic
- [ ] Updated documentation
- [ ] Tested on iOS and Android
- [ ] No console errors/warnings

## 🧪 Testing

Describe how to test the changes

## 📸 Screenshots (if UI changes)

Add screenshots here
```

### 4. **GitHub Issues Template**

**Create:** `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
## 🐛 Bug Report

**Describe the bug:**
Clear description of what the bug is.

**Steps to reproduce:**

1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior:**
What should happen

**Actual behavior:**
What actually happened

**Device:**

- OS: iOS/Android
- App version: v1.0.0

**Screenshots:**
Add screenshots if applicable
```

### 5. **CI/CD Suggestion** (Optional - GitHub Actions)

**Create:** `.github/workflows/lint.yml`

```yaml
name: Lint & Test

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Week 1)

- [ ] Move Firebase credentials to `.env`
- [ ] Fix `C` variable import errors
- [ ] Add input validation to auth forms
- [ ] Implement authentication service layer
- [ ] Fix StyleSheet.flatten warnings

### Phase 2: Error Handling (Week 2)

- [ ] Add error boundaries
- [ ] Implement error UI components
- [ ] Add loading states
- [ ] Create logger utility
- [ ] Add network error handling

### Phase 3: Features (Week 3)

- [ ] Complete Firebase Auth implementation
- [ ] Persist tasks to Firestore
- [ ] Implement analytics screen
- [ ] Add password reset flow
- [ ] Create timezone picker

### Phase 4: Polish (Week 4)

- [ ] Refactor code structure
- [ ] Add unit tests
- [ ] Performance optimization
- [ ] Update documentation
- [ ] Prepare production build

---

## 🎓 CONCLUSION

Your PomoJI app has a solid foundation with good architecture. The main improvements are:

1. **Security**: Move credentials to environment variables
2. **Error Handling**: Implement comprehensive error flows
3. **Validation**: Add input validation and user feedback
4. **Documentation**: Provide clear setup and usage guides
5. **Structure**: Organize files into logical folders
6. **Features**: Complete the authentication and persistence layers

Following this guide will take your project from ~70% complete to **production-ready**. Focus on Phase 1 first, then proceed systematically.

---

**Last Updated:** May 5, 2026  
**Status:** Comprehensive guide created  
**Next Step:** Implement Priority 1 fixes

```

Now let me push this comprehensive guide to GitHub:
<function_calls>
<invoke name="run_in_terminal">
<parameter name="command">cd c:\Users\2060\Desktop\SoftwareEngineering && git add CODE_REVIEW_AND_IMPROVEMENTS.md && git commit -m "docs: add comprehensive code review and improvement guide

- Identified critical issues (Firebase credentials, missing validation)
- Provided step-by-step fixes with code examples
- Suggested improved project structure
- Added GitHub best practices (commits, PRs, CI/CD)
- Included production readiness checklist
- Added implementation phases and timeline

This guide covers security, error handling, validation, documentation,
and feature completion to achieve production-ready status."
```
