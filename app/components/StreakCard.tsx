import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";

interface StreakCardProps {
  streakCount: number;
  streakUnit?: string;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const StreakCard: React.FC<StreakCardProps> = ({
  streakCount,
  streakUnit = "Weeks",
}) => {
  // Calculate the current date and day of the week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Convert to 0 = Monday format (subtract 1, and handle Sunday as 6)
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Calculate the start of the current week (Monday)
  const daysFromMonday = mondayIndex;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysFromMonday);

  const startDate = startOfWeek.getDate();

  return (
    <View style={[SharedStyles.card, styles.card]}>
      <Text style={styles.title}>Your Streak</Text>

      <View style={styles.body}>
        {/* Flame + count */}
        <View style={styles.flameBlock}>
          <View style={styles.flameBadge}>
            <Ionicons name="flame" size={22} color={Colors.surface} />
            <Text style={styles.flameCount}>{streakCount}</Text>
          </View>
          <Text style={styles.streakUnit}>{streakUnit}</Text>
        </View>

        {/* Days row */}
        <View style={styles.daysRow}>
          {DAYS.map((day, i) => {
            const isActive = i === mondayIndex;
            return (
              <View key={i} style={styles.dayColumn}>
                <Text
                  style={[styles.dayLabel, isActive && styles.dayLabelActive]}
                >
                  {day}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    isActive
                      ? styles.dayCircleActive
                      : styles.dayCircleInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isActive
                        ? styles.dayNumberActive
                        : styles.dayNumberInactive,
                    ]}
                  >
                    {startDate + i}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default StreakCard;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  flameBlock: {
    alignItems: "center",
    gap: 4,
  },
  flameBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  flameCount: {
    color: Colors.surface,
    fontWeight: "800",
    fontSize: 16,
  },
  streakUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  daysRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap: 5,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  dayLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: Colors.primary,
  },
  dayCircleInactive: {
    backgroundColor: "transparent",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayNumberActive: {
    color: Colors.surface,
  },
  dayNumberInactive: {
    color: Colors.textSecondary,
  },
});
