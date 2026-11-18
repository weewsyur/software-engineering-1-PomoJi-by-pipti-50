import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TimerMode } from "@/hooks/useTimerPersistence";

interface BreakBannerProps {
  mode: TimerMode;
  onSkip: () => void;
}

export const BreakBanner = ({ mode, onSkip }: BreakBannerProps) => {
  if (mode === "focus") return null;
  return (
    <View style={bannerStyles.banner}>
      <Text style={bannerStyles.text}>Break time. Recharge and return when ready.</Text>
      <TouchableOpacity onPress={onSkip} accessibilityRole="button">
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
  text: { flex: 1, fontSize: 12, color: "#856404", fontWeight: "500" },
  skip: { fontSize: 12, fontWeight: "700", color: "#C94C3C" },
});
