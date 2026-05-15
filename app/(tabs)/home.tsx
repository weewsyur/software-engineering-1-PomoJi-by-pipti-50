import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LucideIcon } from "@/app/components/LucideIcon";
import * as Notifications from "expo-notifications";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { StreakCard } from "../components/StreakCard";
import { ActivityCard } from "../components/ActivityCard";
import { db } from "@/services/firebase";
import { useRouter } from "expo-router";
import { useStreakListener } from "@/utils/useStreakListener";
import { getUserStore } from "@/store/userStore";
import { useReminders } from "@/hooks/useReminders";
import { useSocialActivities, SocialActivity } from "@/hooks/useSocialActivities";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsModal } from "@/app/components/NotificationsModal";
import {
  searchUsers,
  getFollowStatusMap,
  followUser,
  UserSearchResult,
  FollowStatus,
} from "@/services/social";
import { initializeNotifications } from "@/services/notificationService";
import Constants from "expo-constants";

const fmtTotalHours = (seconds: number) => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function HomeScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("User");
  const [showReminders, setShowReminders] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingUid, setFollowingUid] = useState<string | null>(null);
  const [followStatusMap, setFollowStatusMap] = useState<Record<string, FollowStatus>>({});
  const { reminders, pendingCount } = useReminders();
  const { activities } = useSocialActivities();
  const { profile } = useProfile();
  const { notifications, unreadCount: notificationCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications();

  // Real-time streak listener
  const { streakData, loading, error } = useStreakListener(db, userId, "UTC");

  // Memoize expensive calculations
  const initials = useMemo(() => {
    const email = userId ?? "User";
    return email.slice(0, 2).toUpperCase();
  }, [userId]);

  // Get user ID from store on mount
  useEffect(() => {
    const user = getUserStore();
    setUserId(user.userId);
    setCurrentUsername(user.username || "User");
  }, []);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let mounted = true;

    (async () => {
      if (Constants.executionEnvironment === "storeClient") return;
      await initializeNotifications().catch(() => null);

      if (!mounted) return;

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const taskId = response.notification.request.content.data?.taskId;
        if (typeof taskId === "string") {
          router.push({ pathname: "/(tabs)/timer", params: { taskId } });
        }
      });
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [router]);

  const runUserSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchQuery, userId);
      setSearchResults(results);
      const statusMap = await getFollowStatusMap(results, userId);
      setFollowStatusMap(statusMap);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, userId]);

  // Debounced search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      runUserSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, runUserSearch]);

  const handleFollow = async (target: UserSearchResult) => {
    setFollowingUid(target.id);
    try {
      await followUser(target, currentUsername);
      setFollowStatusMap((prev) => ({
        ...prev,
        [target.id]: "following",
      }));
    } catch {
      Alert.alert("Error", "Failed to follow user. Please try again.");
    } finally {
      setFollowingUid(null);
    }
  };

  return (
    <SafeAreaView style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>HOME</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(true)}>
            <LucideIcon name="search-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setShowNotifications(true)}>
            {(pendingCount > 0 || notificationCount > 0) && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{(pendingCount + notificationCount) > 9 ? "9+" : (pendingCount + notificationCount)}</Text>
              </View>
            )}
            <LucideIcon name="notifications-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Card - Real-time Updates */}
        <StreakCard
          streakData={streakData}
          loading={loading}
          error={error}
          streakUnit="Days"
        />

        {/* Activity Feed */}
        {activities.length === 0 ? (
          <View style={StyleSheet.flatten([SharedStyles.card, styles.emptyCard])}>
            <Text style={styles.emptyText}>No activities yet. Complete a focus session to add one.</Text>
          </View>
        ) : (
          activities.map((activity) => (
            <View key={activity.id} style={styles.activityCardWrap}>
              <ActivityCard
                initials={initials}
                name={profile.name}
                timestamp={fmtDate(activity.createdAt)}
                title={activity.title}
                sessions={activity.sessions}
                totalHours={fmtTotalHours(activity.totalTime)}
                images={activity.images.map((uri) => ({ uri }))}
                photoUri={profile.photoUri}
                userName={activity.userName}
                userPhotoUri={activity.userPhotoUri}
              />
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showReminders} animationType="fade" transparent onRequestClose={() => setShowReminders(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reminderSheet}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderTitle}>Reminders</Text>
              <TouchableOpacity onPress={() => setShowReminders(false)}>
                <LucideIcon name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {reminders.length === 0 ? (
              <Text style={styles.reminderEmpty}>No pending reminders.</Text>
            ) : (
              reminders.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reminderRow}
                  onPress={() => {
                    setShowReminders(false);
                    router.push({ pathname: "/(tabs)/timer", params: { taskId: item.taskId } });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderRowTitle}>{item.title}</Text>
                    <Text style={styles.reminderRowDate}>{fmtDate(item.dueDate)}</Text>
                  </View>
                  <Text
                    style={StyleSheet.flatten([
                      styles.reminderStatus,
                      item.status === "overdue" ? styles.overdue : styles.upcoming,
                    ])}
                  >
                    {item.status}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        loading={notificationsLoading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      <Modal visible={showSearch} animationType="slide" transparent onRequestClose={() => setShowSearch(false)}>
        <KeyboardAvoidingView
          style={styles.searchOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.searchSheet}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Find Friends</Text>
              <TouchableOpacity onPress={() => setShowSearch(false)}>
                <LucideIcon name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search username"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={runUserSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchSubmitBtn} onPress={runUserSearch}>
                <LucideIcon name="search" size={16} color={Colors.surface} />
              </TouchableOpacity>
            </View>

            {searching ? (
              <Text style={styles.searchHint}>Searching...</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.searchHint}>
                    {searchQuery.trim() ? "No users found." : "Search by username to find users."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.resultRow}>
                    <TouchableOpacity
                      style={styles.avatarCircle}
                      onPress={() =>
                        router.push({ pathname: "/profile/[uid]" as never, params: { uid: item.id } })
                      }
                    >
                      <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() =>
                        router.push({ pathname: "/profile/[uid]" as never, params: { uid: item.id } })
                      }
                    >
                      <Text style={styles.resultName}>{item.username}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={StyleSheet.flatten([
                        styles.addBtn,
                        followStatusMap[item.id] === "following" && { backgroundColor: Colors.textMuted },
                        (followingUid === item.id || followStatusMap[item.id] === "following") &&
                        styles.addBtnDisabled,
                      ])}
                      disabled={followingUid === item.id || followStatusMap[item.id] === "following"}
                      onPress={() => handleFollow(item)}
                    >
                      <Text style={styles.addBtnText}>
                        {followingUid === item.id
                          ? "Following..."
                          : followStatusMap[item.id] === "following"
                            ? "Following"
                            : followStatusMap[item.id] === "followBack"
                              ? "Follow Back"
                              : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scroll: {
    flex: 1,
  },
  iconBtn: { padding: 4 },
  bellBtn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    zIndex: 1,
  },
  badgeText: { fontSize: 9, color: Colors.surface, fontWeight: "800" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 0,
  },
  activityCardWrap: { marginBottom: 12 },
  emptyCard: { marginTop: 8, paddingVertical: 18, alignItems: "center" },
  emptyText: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    paddingTop: 84,
    paddingHorizontal: 16,
  },
  reminderSheet: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  reminderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  reminderTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  reminderEmpty: { fontSize: 12, color: Colors.textMuted, paddingVertical: 10 },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  reminderRowTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  reminderRowDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  reminderStatus: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  upcoming: { color: "#4C7AC9" },
  overdue: { color: "#C94C3C" },
  searchOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  searchSheet: {
    maxHeight: "72%",
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  searchSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  searchHint: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingVertical: 12,
    textAlign: "center",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  avatarText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: "800",
  },
  resultName: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: "700",
  },
});
