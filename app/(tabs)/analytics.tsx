import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Alert, View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { SharedStyles } from "../../constants/styles";
import { getFreshDownloadURL, isStoragePath } from "@/utils/imageStorage";
import { useActivities } from "../../hooks/useActivities";
import { filterSessionsByWeek, filterSessionsByMonth, filterSessionsByYear, groupSessionsByDay, groupSessionsByWeekForMonth, groupSessionsByMonthForYear } from "../../utils/sessionFilters";
import { StreakCard } from "../components/StreakCard";
import { useStreakListener } from "../../utils/useStreakListener";
import { getUserStore } from "../../store/userStore";
import { db } from "../../services/firebase";
import { ActivityDetailModal } from "../components/ActivityDetailModal";
import { useDeleteActivity } from "../../hooks/useDeleteActivity";
import { Activity } from "../../hooks/useActivities";
import { AreaChart, CHART_PAD_X, LABEL_AREA, type DailyPoint } from "../components/AreaChart";
import { StreakSection, type StreakData } from "../components/StreakSection";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtFocusTime(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { activities, isLoading } = useActivities();
  const [viewMode, setViewMode] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityImageUrls, setActivityImageUrls] = useState<Record<string, string>>({});
  const { deleteActivity, deleting } = useDeleteActivity();
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    const user = getUserStore();
    setUserId(user.userId);
  }, []);

  useEffect(() => {
    const loadImageUrls = async () => {
      const urls: Record<string, string> = {};

      for (const activity of activities) {
        if (activity.images && activity.images.length > 0) {
          const firstImage = activity.images[0];
          if (isStoragePath(firstImage)) {
            try {
              const freshUrl = await getFreshDownloadURL(firstImage);
              urls[activity.id] = freshUrl;
            } catch (error) {
              console.error('Failed to get download URL for activity:', activity.id, error);
              urls[activity.id] = firstImage; // Fallback to original
            }
          } else {
            urls[activity.id] = firstImage;
          }
        }
      }

      setActivityImageUrls(urls);
    };

    loadImageUrls();
  }, [activities]);

  const { streakData, loading: streakLoading, error: streakError } = useStreakListener(db, userId, "UTC");
  const typedStreakData = streakData as StreakData | null | undefined;

  const filteredActivities = useMemo(() => {
    if (viewMode === "weekly") return filterSessionsByWeek(activities);
    if (viewMode === "monthly") return filterSessionsByMonth(activities);
    return filterSessionsByYear(activities);
  }, [activities, viewMode]);

  const totalSessions = useMemo(
    () => filteredActivities.reduce((sum, a) => sum + (a.sessions || 0), 0),
    [filteredActivities]
  );
  const totalFocusTime = useMemo(
    () => filteredActivities.reduce((sum, a) => sum + (a.totalTime || 0), 0),
    [filteredActivities]
  );

  const dailyData = useMemo<DailyPoint[]>(() => {
    if (viewMode === "weekly") return groupSessionsByDay(activities);
    if (viewMode === "monthly") return groupSessionsByWeekForMonth(activities);
    return groupSessionsByMonthForYear(activities);
  }, [activities, viewMode]);

  const maxDailySeconds = useMemo(() => {
    return Math.max(...dailyData.map((d) => d.totalTime), 1);
  }, [dailyData]);

  const byCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    activities.forEach((activity) => {
      const category = activity.category || "other";
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + (activity.totalTime || 0));
    });
    return Array.from(categoryMap.entries())
      .map(([category, totalTime]) => ({ category, totalTime }))
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [activities]);

  // Chart width: card has 16px horizontal padding on each side, content padding 16px each side
  const cardPadding = 32; // SharedStyles.card typically has 16px padding each side
  const chartWidth = screenWidth - 32 - cardPadding; // 32 = content paddingHorizontal * 2

  // Build label positions for chart x-axis
  const chartLabels = useMemo(() => {
    if (dailyData.length === 0) return [];
    const step = dailyData.length === 1 ? 0 : (chartWidth - CHART_PAD_X * 2) / (dailyData.length - 1);
    return dailyData.map((d, i) => ({
      label: "day" in d ? d.day : "weekLabel" in d ? d.weekLabel : d.monthLabel,
      x: CHART_PAD_X + i * step,
    }));
  }, [dailyData, chartWidth]);

  return (
    <SafeAreaView style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ANALYTICS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── 1. Strava-style Streak Section ── */}
        <StreakSection
          streakData={typedStreakData}
          loading={streakLoading}
          error={streakError}
        />

        {/* ── Weekly / Monthly / Yearly Toggle ── */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.viewToggle, viewMode === "weekly" && styles.viewToggleActive])}
            onPress={() => setViewMode("weekly")}
          >
            <Text style={StyleSheet.flatten([styles.viewToggleText, viewMode === "weekly" && styles.viewToggleTextActive])}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.viewToggle, viewMode === "monthly" && styles.viewToggleActive])}
            onPress={() => setViewMode("monthly")}
          >
            <Text style={StyleSheet.flatten([styles.viewToggleText, viewMode === "monthly" && styles.viewToggleTextActive])}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.viewToggle, viewMode === "yearly" && styles.viewToggleActive])}
            onPress={() => setViewMode("yearly")}
          >
            <Text style={StyleSheet.flatten([styles.viewToggleText, viewMode === "yearly" && styles.viewToggleTextActive])}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Card ── */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.statsCard])}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{filteredActivities.length}</Text>
              <Text style={styles.statLabel}>Recorded Activities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{fmtFocusTime(totalFocusTime)}</Text>
              <Text style={styles.statLabel}>Total Focus Time</Text>
            </View>
          </View>
        </View>

        {/* ── 2. SVG Area Chart ── */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.chartCard])}>
          <View style={styles.chartTitleRow}>
            <Text style={styles.cardTitle}>
              Focus Time — {viewMode === "weekly" ? "This Week" : viewMode === "monthly" ? "This Month" : "This Year"}
            </Text>
            <Text style={styles.chartUnit}>hrs</Text>
          </View>

          <View style={styles.svgChartWrapper}>
            <AreaChart data={dailyData} maxValue={maxDailySeconds} width={chartWidth} />

            {/* X-axis labels rendered as RN Text (more reliable than SVG text in RN) */}
            <View style={[styles.xLabelsRow, { width: chartWidth }]}>
              {chartLabels.map((lbl, i) => (
                <Text
                  key={i}
                  style={[
                    styles.xLabel,
                    {
                      position: "absolute",
                      left: lbl.x - 16, // center ~32px wide text
                      width: 32,
                      textAlign: "center",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {lbl.label}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── Focus Time by Category ── */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.chartCard])}>
          <Text style={styles.cardTitle}>Focus Time by Category</Text>
          {byCategory.length === 0 ? (
            <Text style={styles.emptyText}>No sessions yet. Complete a focus session to see stats.</Text>
          ) : (
            byCategory.map((item) => (
              <View key={item.category} style={styles.taskBarRow}>
                <View style={styles.taskBarLabelRow}>
                  <Text style={styles.taskBarTitle} numberOfLines={1}>
                    {item.category}
                  </Text>
                  <Text style={styles.taskBarMeta}>{fmtFocusTime(item.totalTime)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Activity History ── */}
        <Text style={StyleSheet.flatten([SharedStyles.sectionLabel, { marginHorizontal: 4, marginTop: 8 }])}>
          Activity History
        </Text>
        {isLoading ? (
          <View style={StyleSheet.flatten([SharedStyles.card, styles.loadingCard])}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : activities.length === 0 ? (
          <View style={StyleSheet.flatten([SharedStyles.card, styles.emptyCard])}>
            <Text style={styles.emptyText}>No sessions yet. Complete a focus session to see stats.</Text>
          </View>
        ) : (
          activities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              activeOpacity={0.75}
              onPress={() => setSelectedActivity(activity)}
              style={StyleSheet.flatten([SharedStyles.card, styles.activityItem])}
            >
              <View style={styles.activityContent}>
                <Text style={styles.historyTitle}>{activity.title}</Text>
                <Text style={styles.historyDate}>{fmtDate(activity.createdAt)}</Text>
                <Text style={styles.activityMeta}>
                  {activity.sessions} sessions • {fmtFocusTime(activity.totalTime)}
                </Text>
              </View>
              {activity.images[0] ? (
                <Image source={{ uri: activityImageUrls[activity.id] || activity.images[0] }} style={styles.activityImage} resizeMode="cover" />
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <ActivityDetailModal
        activity={selectedActivity}
        visible={selectedActivity !== null}
        onClose={() => setSelectedActivity(null)}
        onDelete={async (id) => {
          try {
            await deleteActivity(id);
            setSelectedActivity(null);
          } catch (error) {
            Alert.alert("Error", (error as Error).message);
          }
        }}
      />
    </SafeAreaView>
  );
}

// ─── Screen Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110, gap: 12 },

  // Toggle
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  viewToggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  viewToggleActive: {
    backgroundColor: Colors.primary,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  viewToggleTextActive: {
    color: Colors.surface,
  },

  // Stats
  statsCard: { paddingVertical: 18 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statBlock: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  statValue: { fontSize: 19, fontWeight: "800", color: Colors.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500", textAlign: "center" },

  // Chart
  chartCard: { paddingBottom: 14 },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  chartUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  svgChartWrapper: {
    position: 'relative',
  },
  xLabelsRow: {
    height: LABEL_AREA,
    position: 'relative',
  },
  xLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // History
  taskBarRow: { marginBottom: 10 },
  taskBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  taskBarTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  taskBarMeta: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  historyTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  historyDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  activityContent: { flex: 1 },
  activityMeta: { fontSize: 11, color: Colors.primary, marginTop: 6, fontWeight: '600' },
  activityImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.background },
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#C4A8A8', fontWeight: '500' },
});