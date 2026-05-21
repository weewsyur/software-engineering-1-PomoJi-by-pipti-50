import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import { Platform } from "react-native";
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
  useEffect(() => {
    registerServiceWorker();
  }, []);

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
