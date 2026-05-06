import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { SharedStyles } from "../../constants/styles";
import { useActivities } from "../../hooks/useActivities";
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

export default function HistoryScreen() {
  const { activities, isLoading } = useActivities();

  const totalSessions = useMemo(
    () => activities.reduce((sum, activity) => sum + (activity.sessions || 0), 0),
    [activities]
  );
  const totalFocusTime = useMemo(
    () => activities.reduce((sum, activity) => sum + (activity.totalTime || 0), 0),
    [activities]
  );

  const dailyData = useMemo(() => {
    const totalsByDay = new Map<string, number>();
    activities.forEach((activity) => {
      const key = new Date(activity.createdAt).toISOString().slice(0, 10);
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + (activity.totalTime || 0));
    });

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        day: d.toLocaleDateString([], { weekday: "short" }),
        totalTime: totalsByDay.get(key) ?? 0,
      };
    });
  }, [activities]);

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

  const maxDailySeconds = Math.max(...dailyData.map((d) => d.totalTime), 1);

  return (
    <SafeAreaView style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerLabel}>ANALYTICS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={StyleSheet.flatten([SharedStyles.card, styles.statsCard])}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{activities.length}</Text>
              <Text style={styles.statLabel}>Recorded Activities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{fmtFocusTime(totalFocusTime)}</Text>
              <Text style={styles.statLabel}>Total Focus Time</Text>
            </View>
          </View>
        </View>

        <View style={StyleSheet.flatten([SharedStyles.card, styles.chartCard])}>
          <Text style={styles.cardTitle}>Focus Time - Last 7 Days</Text>
          <View style={styles.bars}>
            {dailyData.map((d, i) => {
              const heightPercent = d.totalTime / maxDailySeconds;
              return (
                <View key={i} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={StyleSheet.flatten([
                        styles.barFill,
                        {
                          height: `${Math.max(heightPercent * 100, 4)}%`,
                          backgroundColor: Colors.primary,
                        },
                      ])}
                    />
                  </View>
                  <Text style={styles.barLabel}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

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
            <View key={activity.id} style={StyleSheet.flatten([SharedStyles.card, styles.activityItem])}>
              <View style={styles.activityContent}>
                <Text style={styles.historyTitle}>{activity.title}</Text>
                <Text style={styles.historyDate}>{fmtDate(activity.createdAt)}</Text>
                <Text style={styles.activityMeta}>
                  {activity.sessions} sessions • {fmtFocusTime(activity.totalTime)}
                </Text>
              </View>
              {activity.images[0] ? (
                <Image source={{ uri: activity.images[0] }} style={styles.activityImage} resizeMode="cover" />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  statsCard: { paddingVertical: 18 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statBlock: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  statValue: { fontSize: 19, fontWeight: "800", color: Colors.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500", textAlign: "center" },
  chartCard: { paddingBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 6 },
  barColumn: { flex: 1, alignItems: "center", height: "100%", gap: 6 },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  barFill: { width: "100%", borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  barLabelToday: { color: Colors.primary, fontWeight: "800" },
  taskBarRow: { marginBottom: 10 },
  taskBarLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  taskBarTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: Colors.text },
  taskBarMeta: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  historyTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  historyDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  activityItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  activityContent: { flex: 1 },
  activityMeta: { fontSize: 11, color: Colors.primary, marginTop: 6, fontWeight: "600" },
  activityImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.background },
  loadingCard: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  emptyCard: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 13, color: "#C4A8A8", fontWeight: "500" },
});