import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";

// Firebase exposes this API from its React Native runtime entry point only.
// @ts-expect-error The package's platform-neutral type entry point omits this native-only export.
import { getReactNativePersistence } from "firebase/auth";

export function initializePlatformAuth(app: FirebaseApp) {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/already-initialized") {
      return getAuth(app);
    }
    throw error;
  }
}
