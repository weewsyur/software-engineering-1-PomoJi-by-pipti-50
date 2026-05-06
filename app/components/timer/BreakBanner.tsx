import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type TimerMode = "focus" | "short" | "long";

interface BreakBannerProps {
  mode: TimerMode;
  onSkip: () => void;
}

export const BreakBanner = ({ mode, onSkip }: BreakBannerProps) => {
  if (mode === "focus") return null;
  return (
    <View style={bannerStyles.banner}>
      <Text style={bannerStyles.emoji}>{mode === "long" ? "🛋️" : "☕"}</Text>
      <Text style={bannerStyles.text}>
        {mode === "long"
          ? "Long Break – great work on 4 sessions!"
          : "Short Break – recharge!"}
      </Text>
      <TouchableOpacity onPress={onSkip}>
        <Text style={bannerStyles.skip}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

export default BreakBanner;

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  emoji: { fontSize: 16 },
  text: { flex: 1, fontSize: 12, color: "#856404", fontWeight: "500" },
  skip: { fontSize: 12, fontWeight: "700", color: "#C94C3C" },
});
