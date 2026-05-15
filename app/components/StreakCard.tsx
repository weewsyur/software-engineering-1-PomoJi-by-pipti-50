import React, { useMemo, memo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Flame } from "lucide-react";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { StreakData } from "@/utils/streakCalculator";
import { Activity } from "@/hooks/useActivities";
import { calculateWeeklyStreak, groupSessionsByDay } from "@/utils/sessionFilters";

interface StreakCardProps {
  streakCount?: number;
  streakUnit?: string;
  streakData?: StreakData | null;
  loading?: boolean;
  error?: Error | null;
  activities?: Activity[];
  useWeeklyStreak?: boolean;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const StreakCard = memo<StreakCardProps>(({
  streakCount,
  streakUnit = "Days",
  streakData,
  loading = false,
  error = null,
  activities = [],
  useWeeklyStreak = false,
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
  startOfWeek.setHours(0, 0, 0, 0);

  // Generate all week dates properly (handles month boundaries)
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startOfWeek]);

  // Calculate weekly streak if enabled
  const weeklyStreak = useMemo(() => {
    if (useWeeklyStreak && activities.length > 0) {
      return calculateWeeklyStreak(activities, today);
    }
    return 0;
  }, [useWeeklyStreak, activities, today]);

  // Get daily session counts for progress indicator (always calculate for activity marking)
  const dailySessions = useMemo(() => {
    if (activities.length > 0) {
      return groupSessionsByDay(activities, today);
    }
    return [];
  }, [activities, today]);

  // Use streakData if provided (real-time), otherwise fall back to streakCount or weeklyStreak
  const displayCount = useMemo(() => {
    if (useWeeklyStreak) {
      return weeklyStreak;
    }
    if (streakData) {
      return streakData.currentStreak;
    }
    return streakCount || 0;
  }, [useWeeklyStreak, weeklyStreak, streakData, streakCount]);

  // Update streak unit for weekly mode
  const displayUnit = useMemo(() => {
    if (useWeeklyStreak) {
      return "sessions";
    }
    return streakUnit;
  }, [useWeeklyStreak, streakUnit]);

  return (
    <View style={StyleSheet.flatten([SharedStyles.card, styles.card])}>
      <Text style={styles.title}>{useWeeklyStreak ? "This Week's Streak" : "Your Streak"}</Text>

      {/* Loading State */}
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ Unable to load streak</Text>
        </View>
      )}

      {/* Normal State */}
      {!loading && !error && (
        <View style={styles.body}>
          {/* Flame + count */}
          <View style={styles.flameBlock}>
            <View style={styles.flameBadge}>
              <Flame size={22} color={Colors.surface} strokeWidth={2.5} fill={Colors.surface} />
              <Text style={styles.flameCount}>{displayCount}</Text>
            </View>
            <Text style={styles.streakUnit}>{displayUnit}</Text>
          </View>

          {/* Days row */}
          <View style={styles.daysRow}>
            {DAYS.map((day, i) => {
              const isActive = i === mondayIndex;
              const currentDate = weekDates[i];
              const isCurrentDay = currentDate.toDateString() === today.toDateString();
              const daySessionCount = dailySessions[i]?.totalSessions || 0;
              const hasSession = daySessionCount > 0;

              return (
                <View key={i} style={styles.dayColumn}>
                  <Text
                    style={StyleSheet.flatten([styles.dayLabel, isActive && styles.dayLabelActive])}
                  >
                    {day}
                  </Text>
                  <View
                    style={StyleSheet.flatten([
                      styles.dayCircle,
                      useWeeklyStreak
                        ? (hasSession ? styles.dayCircleActive : styles.dayCircleInactive)
                        : (hasSession ? styles.dayCircleActive : (isCurrentDay ? styles.dayCircleActive : styles.dayCircleInactive)),
                    ])}
                  >
                    <Text
                      style={StyleSheet.flatten([
                        styles.dayNumber,
                        useWeeklyStreak
                          ? (hasSession ? styles.dayNumberActive : styles.dayNumberInactive)
                          : (hasSession ? styles.dayNumberActive : (isCurrentDay ? styles.dayNumberActive : styles.dayNumberInactive)),
                      ])}
                    >
                      {useWeeklyStreak ? daySessionCount : currentDate.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

StreakCard.displayName = 'StreakCard';

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
  loaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
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
