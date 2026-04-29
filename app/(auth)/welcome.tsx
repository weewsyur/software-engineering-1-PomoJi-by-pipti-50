import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Link } from "expo-router";

// Abstract blob component
function AbstractBlob({ style }: any) {
  return <View style={[styles.blob, style]} />; 
}

// Pill button component
function PillButton({ title, href, variant = "primary", style }: any) {
  const buttonStyle =
    variant === "primary" ? styles.pillButtonPrimary : styles.pillButtonOutline;
  const textStyle =
    variant === "primary"
      ? styles.pillButtonTextPrimary
      : styles.pillButtonTextOutline;

  return (
    <Link href={href} asChild>
      <Pressable style={[styles.pillButton, buttonStyle, style]}>
        <Text style={[styles.pillButtonText, textStyle]}>{title}</Text>
      </Pressable>
    </Link>
  );
}

function WelcomeScreen() {
  return (
    <View style={styles.welcomeContainer}>
      {/* Background blobs */}
      <AbstractBlob style={styles.blobTopLeft} />
      <AbstractBlob style={styles.blobBottomRight} />
      <AbstractBlob style={styles.blobMidRight} />
      <AbstractBlob style={styles.blobTopRight} />
       <AbstractBlob style={styles.blobBottomLeft} />

      {/* Content */}
      <View style={styles.welcomeContent}>
        {/* Logo */}

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcomeTitle}>Welcome to PomoJI</Text>
        <Text style={styles.welcomeSub}>
          A Gamified Productivity and Progress Monitoring System
        </Text>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <PillButton
            title="SIGN IN"
            href="./(auth)/sign-in"
            variant="background"
            style={styles.btnHalf}
          />
          <PillButton
            title="SIGN UP"
            href="./(auth)/sign-up"
            variant="background"
            style={styles.btnHalf}
          />
        </View>
      </View>
    </View>
  );
}

export default WelcomeScreen;

const COLORS = {
  primary: "#C54A3A",
  background: "#FFFEF1",
  card: "#FFFFFF",
  textDark: "#2C2C2C",
  textMid: "#666666",
  textLight: "#999999",
  white: "#FFFFFF",
  inputBorder: "#F0E6E0",
};

const styles = StyleSheet.create({
  
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  blobTopLeft: {
    width: 220,
    height: 220,
    top: -60,
    left: -70,
  },
  blobBottomRight: {
    width: 350,
    height: 350,
    bottom: -150,
    right: -150,
    opacity: 1.0,
  },
  blobMidRight: {
    width: 60,
    height: 60,
    top: 140,
    right: -20,
    opacity: 0.8,
  },
  blobTopRight: {
    width: 200,
    height: 200,
    top: -70,
    right: -100,
    opacity: 1.0,
  },
  blobBottomLeft: {
    width: 200,
    height: 200,
    bottom: 10,
    left: -120,
    opacity: 0.7,
  },

  // ── Welcome screen ──
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
  logo: {
    width: 210,
    height: 210,
    marginBottom: 10,
  },
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
  btnRow: {
    flexDirection: "row",
    gap: 15,
  },
  btnHalf: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  // ── Pill button ──
  pillButton: {
    color: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  pillButtonPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  pillButtonOutline: {
    backgroundColor: "primary",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pillButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  pillButtonTextPrimary: {
    color: COLORS.white,
  },
  pillButtonTextOutline: {
    color: COLORS.primary,
  },
  fullBtn: {
    width: "100%",
  },
});
