import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { useFonts } from "expo-font";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncingIndicator } from "@/components/SyncingIndicator";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastHost } from "@/components/Toast";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch((error) => {
    console.warn("Unable to keep the native splash screen visible:", error);
  });
}

function StartupContent() {
  const { initializing } = useAuth();
  const [rootLaidOut, setRootLaidOut] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" || initializing || !rootLaidOut) return;

    SplashScreen.hideAsync().catch((error) => {
      console.error("Unable to hide the native splash screen:", error);
    });
  }, [initializing, rootLaidOut]);

  return (
    <View style={styles.root} onLayout={() => setRootLaidOut(true)}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
      {initializing && (
        <View style={styles.startupSplash}>
          <Image
            source={require("../assets/images/POMOJI.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="PomoJI"
          />
        </View>
      )}
      {!initializing && Platform.OS === "web" && (
        <>
          <PWAInstallPrompt />
          <OfflineIndicator />
          <SyncingIndicator />
        </>
      )}
    </View>
  );
}

// Service Worker Registration for Web PWA
function registerServiceWorker() {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    Platform.OS === "web"
  ) {
    window.addEventListener("load", () => {
      console.log(
        "Attempting to register service worker at /service-worker.js",
      );

      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/" })
        .then((registration) => {
          console.log("✓ Service Worker registered:", registration.scope);
          console.log("✓ Service Worker state:", registration.active?.state);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log("✓ New service worker installing");
              newWorker.addEventListener("statechange", () => {
                console.log("✓ Service Worker state:", newWorker.state);
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("✓ New service worker available");
                  // You can show a "New version available" banner here
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("✗ Service Worker registration failed:");
          console.error("  Error name:", error.name);
          console.error("  Error message:", error.message);
          console.error("  Error stack:", error.stack);
        });
    });
  } else {
    console.log("Service Worker not supported or not on web platform");
  }
}

const FONT_FALLBACK_MS = 3000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  // Never block the app forever: fall back to system fonts on error or timeout.
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const fontsReady = fontsLoaded || fontError != null || fontTimedOut;

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError != null) return;
    const timer = setTimeout(() => setFontTimedOut(true), FONT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  // Apply a global default Text style to use Bricolage Grotesque when fonts are ready.
  useEffect(() => {
    if (!fontsReady) return;
    try {
      // Ensure defaultProps exists
      const textComponent = Text as any;
      textComponent.defaultProps = textComponent.defaultProps || {};
      // Prefer the bundled font family names; harmless if fonts failed to load.
      textComponent.defaultProps.style = {
        ...(textComponent.defaultProps.style || {}),
        fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular",
      };
      const inputComponent = TextInput as any;
      inputComponent.defaultProps = inputComponent.defaultProps || {};
      inputComponent.defaultProps.style = {
        ...(inputComponent.defaultProps.style || {}),
        fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular",
      };
    } catch {
      // Silently fail if can't set Text defaults
    }

    // Also set a web body font-family for web platform to use the Bricolage face
    if (typeof document !== "undefined" && Platform.OS === "web") {
      try {
        document.body.style.fontFamily =
          "'BricolageGrotesque_400Regular', 'Bricolage Grotesque', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
      } catch {
        /* ignore */
      }
    }
  }, [fontsReady]);

  // Hold the splash until fonts settle so the first paint uses the right family.
  if (!fontsReady) {
    return (
      <View style={styles.startupSplash}>
        <Image
          source={require("../assets/images/POMOJI.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="PomoJI"
        />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StartupContent />
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFEF1",
  },
  startupSplash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFEF1",
    zIndex: 10,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
