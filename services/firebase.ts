import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvJ3HwJe_TkNYYjfjAREhRve8oLa7v1Zs",
  authDomain: "software-engineering1-pomoji.firebaseapp.com",
  projectId: "software-engineering1-pomoji",
  storageBucket: "software-engineering1-pomoji.appspot.com",
  messagingSenderId: "544871394102",
  appId: "1:544871394102:web:603e8becd54276639ca197",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firebase v9+ in React Native requires explicit persistence.
// Guard against duplicate initialization during Fast Refresh / hot reload.
const authKey = "__pomoji_firebase_auth__";
const globalAny = globalThis as unknown as { [authKey: string]: ReturnType<typeof initializeAuth> | undefined };

export const auth =
  globalAny[authKey] ??
  (() => {
    try {
      const initialized = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
      globalAny[authKey] = initialized;
      return initialized;
    } catch {
      // If auth was already initialized elsewhere, return the existing instance.
      const existing = getAuth(app);
      globalAny[authKey] = existing;
      return existing;
    }
  })();

export const db = getFirestore(app);
export const storage = getStorage(app);
