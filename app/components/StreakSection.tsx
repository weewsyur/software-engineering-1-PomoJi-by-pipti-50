import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Share } from "react-native";
import { Colors } from "../../constants/colors";
import { SharedStyles } from "../../constants/styles";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const CIRCLE_SIZE = 30;

export interface StreakData {
  currentStreak: number;
  activeDates: string[];
}

interface StreakSectionProps {
  streakData: StreakData | null | undefined;
  loading: boolean;
  error: Error | null;
}

type Cell = {
  date: number;
  inMonth: boolean;
  iso?: string;
};

export function StreakSection({ streakData, loading, error }: StreakSectionProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthLabel = today.toLocaleDateString([], { month: "long", year: "numeric" });

  const currentStreakDays: number = streakData?.currentStreak ?? 0;
  const streakWeeks = Math.floor(currentStreakDays / 7);
  const streakRemDays = currentStreakDays % 7;
  const streakDisplay =
    streakWeeks > 0
      ? `${streakWeeks}w ${streakRemDays > 0 ? `${streakRemDays}d` : ""}`.trim()
      : `${currentStreakDays}d`;

  const activeDates = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    if (!streakData?.activeDates) return s;
    streakData.activeDates.forEach((d) => s.add(d));
    return s;
  }, [streakData]);

  const streakActivities = activeDates.size;

  const firstDay = new Date(year, month, 1).getDay();
  const firstDayMon = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Cell[] = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayMon; i++) {
    const d = prevMonthDays - firstDayMon + 1 + i;
    cells.push({ date: d, inMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ date: d, inMonth: true, iso: `${year}-${mm}-${dd}` });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ date: d, inMonth: false });
    }
  }

  const todayISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const handleShare = () => {
    Share.share({ message: `My ${monthLabel} streak: ${streakDisplay} — ${streakActivities} activities!` });
  };

  return (
    <View style={StyleSheet.flatten([SharedStyles.card, styles.card])}>
      <View style={styles.headerRow}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareIcon}>⬆</Text>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
      ) : error ? (
        <Text style={styles.errorText}>Unable to load streak</Text>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statCaption}>Your Streak</Text>
              <Text style={styles.statValue}>{streakDisplay}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statCaption}>Streak Activities</Text>
              <Text style={styles.statValue}>{streakActivities}</Text>
            </View>
          </View>

          <View style={styles.calendarContainer}>
            <View style={styles.calRow}>
              {WEEK_DAYS.map((d, i) => (
                <View key={i} style={styles.calCell}>
                  <Text style={styles.dowLabel}>{d}</Text>
                </View>
              ))}
            </View>

            {rows.map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((cell, ci) => {
                  const isToday = cell.iso === todayISO;
                  const hasSession = cell.iso ? activeDates.has(cell.iso) : false;
                  const isFuture = cell.inMonth && cell.iso && cell.iso > todayISO;
                  const isPast = cell.inMonth && !isToday && !isFuture;

                  return (
                    <View key={ci} style={styles.calCell}>
                      {cell.inMonth ? (
                        <View
                          style={[
                            styles.dayCircle,
                            hasSession && styles.dayCircleFilled,
                            isToday && !hasSession && styles.dayCircleToday,
                            isPast && !hasSession && styles.dayCirclePast,
                            isFuture && styles.dayCircleFuture,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              hasSession && styles.dayNumberFilled,
                              isToday && !hasSession && styles.dayNumberToday,
                              isFuture && styles.dayNumberFuture,
                            ]}
                          >
                            {cell.date}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.outOfMonthText}>{cell.date}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default StreakSection;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  shareIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  shareText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 16,
  },
  statCol: {
    gap: 2,
  },
  statCaption: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  errorText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
    marginVertical: 12,
  },
  calendarContainer: {
    gap: 2,
  },
  calRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  dowLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  dayCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleFilled: {
    backgroundColor: Colors.text,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: Colors.text,
    backgroundColor: "transparent",
  },
  dayCirclePast: {
    backgroundColor: Colors.background,
  },
  dayCircleFuture: {
    backgroundColor: "transparent",
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
  },
  dayNumberFilled: {
    color: Colors.surface,
  },
  dayNumberToday: {
    color: Colors.text,
    fontWeight: "700",
  },
  dayNumberFuture: {
    color: Colors.textMuted,
  },
  outOfMonthText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "400",
    lineHeight: CIRCLE_SIZE,
  },
});
