import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, Platform } from "react";
import { PWAInstallPrompt } from "@/app/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/app/components/OfflineIndicator";
import { SyncingIndicator } from "@/app/components/SyncingIndicator";

// Service Worker Registration for Web PWA
function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && Platform.OS === "web") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("✓ Service Worker registered:", registration.scope);
          
          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("✓ New service worker available");
                  // You can show a "New version available" banner here
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("✗ Service Worker registration failed:", error);
        });
    });
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
