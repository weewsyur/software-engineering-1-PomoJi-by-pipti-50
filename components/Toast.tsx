import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/constants/colors";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export type ToastOptions = {
  duration?: number;
  persistent?: boolean;
  dismissible?: boolean;
  showIcon?: boolean;
  title?: string;
};

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
  options: ToastOptions;
};

type ToastListener = (message: ToastMessage | null) => void;

const listeners = new Set<ToastListener>();
let nextToastId = 0;
let lastToastKey = "";
let lastToastTime = 0;

export const toast = {
  message(
    text: string,
    type: ToastType = "info",
    options: ToastOptions = {},
  ) {
    const message = text.trim();
    if (!message) return;

    const now = Date.now();
    const key = `${type}:${message}`;
    if (key === lastToastKey && now - lastToastTime < 1500) return;

    lastToastKey = key;
    lastToastTime = now;
    const notification = {
      id: ++nextToastId,
      text: message,
      type,
      options,
    };
    listeners.forEach((listener) => listener(notification));
  },
  dismiss() {
    listeners.forEach((listener) => listener(null));
  },
};

const DEFAULT_DURATIONS: Record<Exclude<ToastType, "loading">, number> = {
  success: 3500,
  error: 5000,
  warning: 4500,
  info: 3500,
};

export function ToastHost() {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const currentId = current?.id;
  const currentType = current?.type;

  const dismiss = useCallback(
    (id: number) => {
      if (reduceMotion) {
        setCurrent((active) => (active?.id === id ? null : active));
        return;
      }

      Animated.timing(animation, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setCurrent((active) => (active?.id === id ? null : active));
        }
      });
    },
    [animation, reduceMotion],
  );

  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch((error) => {
        console.warn("Unable to read reduced-motion preference:", error);
      });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const listener: ToastListener = (message) => {
      if (message === null) {
        setCurrent(null);
        return;
      }
      setCurrent(message);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (currentId === undefined) return;

    if (reduceMotion) {
      animation.setValue(1);
      return;
    }

    animation.setValue(0);
    const entrance = Animated.timing(animation, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [animation, currentId, reduceMotion]);

  useEffect(() => {
    if (!current || current.options.persistent) return;

    const duration =
      current.options.duration ??
      (current.type === "loading" ? 0 : DEFAULT_DURATIONS[current.type]);
    if (duration <= 0) return;

    const timeout = setTimeout(() => dismiss(current.id), duration);
    return () => clearTimeout(timeout);
  }, [current, dismiss]);

  useEffect(() => {
    if (currentType !== "loading" || reduceMotion) {
      spinnerRotation.setValue(0);
      return;
    }

    const spinner = Animated.loop(
      Animated.timing(spinnerRotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinner.start();
    return () => spinner.stop();
  }, [currentId, currentType, reduceMotion, spinnerRotation]);

  if (!current) return null;

  const tone = {
    success: colors.primary,
    error: isDarkMode ? "#FF8A80" : "#B9382D",
    warning: isDarkMode ? "#F2C66D" : "#94620F",
    info: colors.textSecondary,
    loading: colors.primary,
  }[current.type];
  const Icon =
    current.type === "success"
      ? CheckCircle2
      : current.type === "error"
        ? XCircle
        : current.type === "warning"
          ? AlertTriangle
          : current.type === "loading"
            ? Loader2
            : Info;
  const rotation = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const title = current.options.title?.trim();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 12, 16),
          paddingHorizontal: Math.max(insets.left, insets.right, 16),
        },
      ]}
    >
      <Animated.View
        accessibilityLiveRegion={current.type === "error" ? "assertive" : "polite"}
        accessibilityRole={current.type === "error" ? "alert" : "summary"}
        pointerEvents="box-none"
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {current.options.showIcon !== false && (
          <View style={[styles.indicator, { backgroundColor: `${tone}16` }]}>
            {current.type === "loading" ? (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Icon size={18} color={tone} strokeWidth={2} />
              </Animated.View>
            ) : (
              <Icon size={18} color={tone} strokeWidth={2} />
            )}
          </View>
        )}
        <View style={styles.message}>
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : null}
          <Text
            style={[
              styles.text,
              title && styles.description,
              { color: title ? colors.textSecondary : colors.text },
            ]}
          >
            {current.text}
          </Text>
        </View>
        {current.options.dismissible !== false && (
          <Pressable
            accessibilityLabel="Dismiss notification"
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => dismiss(current.id)}
            style={({ pressed }) => [
              styles.dismissButton,
              pressed && styles.dismissButtonPressed,
            ]}
          >
            <X size={16} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    zIndex: 100,
  },
  toast: {
    width: "100%",
    maxWidth: 480,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  indicator: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginRight: 10,
  },
  message: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600", fontFamily: "Figtree_600SemiBold",
    lineHeight: 19,
  },
  text: {
    fontSize: 14,
    fontWeight: "500", fontFamily: "Figtree_500Medium",
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    fontWeight: "400", fontFamily: "Figtree_400Regular",
    lineHeight: 18,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderRadius: 6,
  },
  dismissButtonPressed: {
    opacity: 0.6,
  },
});
