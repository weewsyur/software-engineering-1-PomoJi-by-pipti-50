import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export default function CounselingScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Support and counseling
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.message, { color: colors.text }]}>
            The daily readiness check is a screening tool based on recent
            self-reported answers. It is not a diagnosis or a measure of your
            personal worth.
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            If you would like to talk with someone, consider reaching out to a
            trusted person or a qualified counseling professional in your
            community.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/home")}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 20, justifyContent: "center", gap: 20 },
  title: { fontSize: 24, fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold" },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 16 },
  message: { fontFamily: "Figtree_400Regular", fontSize: 16, lineHeight: 24 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Figtree_600SemiBold" },
});
