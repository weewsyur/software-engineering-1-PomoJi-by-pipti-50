import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
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

export default function RootLayout() {
  const [localFontsLoaded, setLocalFontsLoaded] = useState(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Try to load local font files (if you've placed them in assets/fonts/)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          "OpenSans-Regular": require("../assets/fonts/OpenSans-Regular.ttf"),
          "OpenSans-SemiBold": require("../assets/fonts/OpenSans-SemiBold.ttf"),
          "OpenSans-Bold": require("../assets/fonts/OpenSans-Bold.ttf"),
        });
        if (mounted) setLocalFontsLoaded(true);
      } catch (e) {
        // If local fonts aren't present, fall back to system fonts
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(
          "Local Open Sans fonts not found or failed to load. Using system fonts.",
          errorMessage,
        );
        if (mounted) setLocalFontsLoaded(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply a global default Text style to use Open Sans when fonts are loaded.
  useEffect(() => {
    if (localFontsLoaded) {
      try {
        // Ensure defaultProps exists
        const textComponent = Text as any;
        textComponent.defaultProps = textComponent.defaultProps || {};
        // Prefer local font family names if available
        textComponent.defaultProps.style = {
          ...(textComponent.defaultProps.style || {}),
          fontFamily: "OpenSans-Regular",
        };
      } catch {
        // Silently fail if can't set Text defaults
      }

      // Also set a web body font-family for web platform to use the Open Sans face
      if (typeof document !== "undefined" && Platform.OS === "web") {
        try {
          document.body.style.fontFamily =
            "'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
        } catch {
          /* ignore */
        }
      }
    }
  }, [localFontsLoaded]);

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
