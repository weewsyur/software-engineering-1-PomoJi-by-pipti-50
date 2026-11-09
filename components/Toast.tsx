import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type ToastType = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastListener = (message: ToastMessage) => void;

const listeners = new Set<ToastListener>();
let nextToastId = 0;
let lastToastKey = "";
let lastToastTime = 0;

export const toast = {
  message(text: string, type: ToastType = "info") {
    const message = text.trim();
    if (!message) return;

    const now = Date.now();
    const key = `${type}:${message}`;
    if (key === lastToastKey && now - lastToastTime < 1500) return;

    lastToastKey = key;
    lastToastTime = now;
    const notification = { id: ++nextToastId, text: message, type };
    listeners.forEach((listener) => listener(notification));
  },
};

export function ToastHost() {
  const [current, setCurrent] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const listener: ToastListener = (message) => setCurrent(message);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const timeout = setTimeout(() => {
      setCurrent((active) => (active?.id === current.id ? null : active));
    }, 3500);
    return () => clearTimeout(timeout);
  }, [current]);

  if (!current) return null;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        pointerEvents="none"
        style={[
          styles.toast,
          current.type === "success" && styles.success,
          current.type === "error" && styles.error,
        ]}
      >
        <Text style={styles.text}>{current.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 48,
    zIndex: 100,
  },
  toast: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "#3A302A",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  success: {
    backgroundColor: "#26734D",
  },
  error: {
    backgroundColor: "#A83228",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
