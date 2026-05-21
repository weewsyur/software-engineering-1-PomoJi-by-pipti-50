import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Text } from "react-native";
import * as Font from "expo-font";
import {
  useFonts,
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from "@expo-google-fonts/open-sans";
import { useState } from "react";
import { PWAInstallPrompt } from "@/app/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/app/components/OfflineIndicator";
import { SyncingIndicator } from "@/app/components/SyncingIndicator";

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
  const [googleFontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
  });
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
        // If local fonts aren't present, fall back to @expo-google-fonts
        console.warn(
          "Local Open Sans fonts not found or failed to load. Falling back to google fonts.",
          e?.message || e,
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fontsReady = localFontsLoaded || googleFontsLoaded;

  // Apply a global default Text style to use Open Sans when fonts are loaded.
  useEffect(() => {
    if (fontsReady) {
      // Ensure defaultProps exists
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Text.defaultProps = Text.defaultProps || {};
      // Prefer local font family names if available
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Text.defaultProps.style = {
        ...(Text.defaultProps.style || {}),
        fontFamily: localFontsLoaded
          ? "OpenSans-Regular"
          : "OpenSans_400Regular",
      };

      // Also set a web body font-family for web platform to use the Open Sans face
      if (typeof document !== "undefined" && Platform.OS === "web") {
        try {
          document.body.style.fontFamily =
            "'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
        } catch (e) {
          /* ignore */
        }
      }
    }
  }, [fontsReady, localFontsLoaded, googleFontsLoaded]);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        {Platform.OS === "web" && <PWAInstallPrompt />}
        {Platform.OS === "web" && <OfflineIndicator />}
        {Platform.OS === "web" && <SyncingIndicator />}
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
