import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { Link } from "expo-router";
import { shadowStyle } from "@/utils/shadowStyle";

const COLORS = {
  primary: "#F4512C",
  background: "#FFFEF1",
  textDark: "#2C2C2C",
  textLight: "#999999",
  white: "#FFFFFF",
};

// Fade + slide-up entrance
function useEntrance(delay = 0, distance = 24) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return {
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}

// Endless gentle drifting
function useFloat(amplitude = 12, duration = 3500, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return {
    translateY: v.interpolate({
      inputRange: [0, 1],
      outputRange: [-amplitude, amplitude],
    }),
    translateX: v.interpolate({
      inputRange: [0, 1],
      outputRange: [amplitude / 2, -amplitude / 2],
    }),
  };
}

function AbstractBlob({ style, amplitude, duration, delay }: any) {
  const { translateX, translateY } = useFloat(amplitude, duration, delay);
  return (
    <Animated.View
      style={[styles.blob, style, { transform: [{ translateX }, { translateY }] }]}
    />
  );
}

function PillButton({ title, href, variant = "primary", style }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      speed: 40,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  const primary = variant === "primary";

  return (
    <Link href={href} asChild>
      <Pressable
        style={style}
        onPressIn={() => press(0.94)}
        onPressOut={() => press(1)}
      >
        <Animated.View
          style={[
            styles.pillButton,
            primary ? styles.pillButtonPrimary : styles.pillButtonOutline,
            { transform: [{ scale }] },
          ]}
        >
          <Text
            style={[
              styles.pillButtonText,
              primary ? styles.textPrimary : styles.textOutline,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

function WelcomeScreen() {
  // Logo: spring in, then float
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const { translateY: logoFloat } = useFloat(7, 2400);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoScale, logoFade]);

  const titleAnim = useEntrance(350);
  const subAnim = useEntrance(500);
  const btnAnim = useEntrance(700, 40);

  return (
    <View style={styles.welcomeContainer}>
      {/* Floating background blobs */}
      <AbstractBlob style={styles.blobTopLeft} amplitude={14} duration={3800} />
      <AbstractBlob style={styles.blobBottomRight} amplitude={10} duration={4600} delay={300} />
      <AbstractBlob style={styles.blobMidRight} amplitude={18} duration={2800} delay={150} />
      <AbstractBlob style={styles.blobTopRight} amplitude={12} duration={4200} delay={500} />
      <AbstractBlob style={styles.blobBottomLeft} amplitude={16} duration={3400} delay={250} />

      <View style={styles.welcomeContent}>
        <Animated.Image
          source={require("@/assets/images/logo.png")}
          style={[
            styles.logo,
            {
              opacity: logoFade,
              transform: [{ scale: logoScale }, { translateY: logoFloat }],
            },
          ]}
          resizeMode="contain"
        />

        <Animated.Text style={[styles.welcomeTitle, titleAnim]}>
          Welcome to PomoJI
        </Animated.Text>
        <Animated.Text style={[styles.welcomeSub, subAnim]}>
          A Productivity and Progress Monitoring System
        </Animated.Text>

        <Animated.View style={[styles.btnRow, btnAnim]}>
          <PillButton
            title="SIGN IN"
            href="/(auth)/sign-in"
            variant="outline"
            style={styles.btnHalf}
          />
          <PillButton
            title="SIGN UP"
            href="/(auth)/sign-up"
            variant="primary"
            style={styles.btnHalf}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export default WelcomeScreen;

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  blobTopLeft: { width: 220, height: 220, top: -60, left: -70 },
  blobBottomRight: { width: 350, height: 350, bottom: -150, right: -150, opacity: 1.0 },
  blobMidRight: { width: 60, height: 60, top: 140, right: -20, opacity: 0.8 },
  blobTopRight: { width: 200, height: 200, top: -70, right: -100, opacity: 1.0 },
  blobBottomLeft: { width: 200, height: 200, bottom: 10, left: -120, opacity: 0.7 },

  welcomeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },
  welcomeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  logo: { width: 210, height: 210, marginBottom: 10 },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  welcomeSub: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 48,
    textAlign: "center",
    lineHeight: 20,
  },
  btnRow: { flexDirection: "row", gap: 15, width: "100%" },
  btnHalf: { flex: 1 },

  pillButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pillButtonPrimary: {
    backgroundColor: COLORS.primary,
    ...shadowStyle(COLORS.primary, 0, 6, 12, 0.35, 6),
  },
  pillButtonOutline: { backgroundColor: "transparent" },
  pillButtonText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  textPrimary: { color: COLORS.white },
  textOutline: { color: COLORS.primary },
});