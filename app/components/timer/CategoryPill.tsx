import { StyleSheet, Text, View } from "react-native";
import { TaskCategory } from "@/hooks/usePomodoro";

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  work: "#C94C3C",
  study: "#4C7AC9",
  personal: "#7AC94C",
  health: "#C9A44C",
  other: "#9A7AC9",
};

interface CategoryPillProps {
  cat: TaskCategory;
}

export const CategoryPill = ({ cat }: CategoryPillProps) => (
  <View
    style={StyleSheet.flatten([
      pillStyles.pill,
      { backgroundColor: CATEGORY_COLORS[cat] + "22" },
    ])}
  >
    <View
      style={StyleSheet.flatten([
        pillStyles.dot,
        { backgroundColor: CATEGORY_COLORS[cat] },
      ])}
    />
    <Text
      style={StyleSheet.flatten([
        pillStyles.label,
        { color: CATEGORY_COLORS[cat] },
      ])}
    >
      {cat.charAt(0).toUpperCase() + cat.slice(1)}
    </Text>
  </View>
);

export default CategoryPill;

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: "600" },
});
