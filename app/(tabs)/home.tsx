import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
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
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LucideIcon } from "@/app/components/LucideIcon";
import * as Notifications from "expo-notifications";
import { Colors, useColors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { StreakCard } from "../components/StreakCard";
import { ActivityCard } from "../components/ActivityCard";
import { auth, db } from "@/services/firebase";
import { useRouter } from "expo-router";
import { useStreakListener } from "@/utils/useStreakListener";
import { getUserStore } from "@/store/userStore";
import { useReminders } from "@/hooks/useReminders";
import { useSocialActivities } from "@/hooks/useSocialActivities";
import { initializeStreakData } from "@/utils/activityTracker";
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

function AnimatedActivityCard({
  activity,
  initials,
  profile,
  fmtActivityDate,
}: {
  activity: any;
  initials: string;
  profile: { name: string; photoUri: string | null };
  fmtActivityDate: string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View style={styles.activityCardWrap}>
        <ActivityCard
          initials={initials}
          name={profile.name}
          timestamp={fmtActivityDate}
          title={activity.title}
          sessions={activity.sessions}
          totalHours={fmtTotalHours(activity.totalTime)}
          images={activity.images.map((uri: string) => ({ uri }))}
          photoUri={profile.photoUri}
          userName={activity.userName}
          userPhotoUri={activity.userPhotoUri}
        />
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("User");
  const [showReminders, setShowReminders] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingUid, setFollowingUid] = useState<string | null>(null);
  const [followStatusMap, setFollowStatusMap] = useState<
    Record<string, FollowStatus>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const { reminders, pendingCount } = useReminders();
  const { activities } = useSocialActivities();
  const { profile } = useProfile();
  const headerButtonScale = useRef(new Animated.Value(1)).current;
  const iconButtonScale = useRef(new Animated.Value(1)).current;
  const searchButtonScale = useRef(new Animated.Value(1)).current;
  const followButtonScale = useRef(new Animated.Value(1)).current;
  const {
    notifications,
    unreadCount: notificationCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Real-time streak listener
  const { streakData, loading, error } = useStreakListener(db, userId, "UTC");

  // Initialize streak data if it doesn't exist
  useEffect(() => {
    if (userId && !loading && !error && !streakData) {
      // Initialize streak data for new users
      initializeStreakData(userId, "UTC").catch((err) => {
        console.error("Failed to initialize streak data:", err);
      });
    }
  }, [userId, loading, error, streakData]);

  // Memoize expensive calculations
  const initials = useMemo(() => {
    const email = userId ?? "User";
    return email.slice(0, 2).toUpperCase();
  }, [userId]);

  // Keep the active user id synchronized with Firebase Auth. This runs only
  // after Auth has confirmed the current session state, avoiding the cold-start
  // race where a stale store value is used before the token is ready.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
      setCurrentUsername(user?.displayName || "User");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let mounted = true;

    (async () => {
      if (Constants.executionEnvironment === "storeClient") return;
      await initializeNotifications().catch(() => null);

      if (!mounted) return;

      sub = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const taskId = response.notification.request.content.data?.taskId;
          if (typeof taskId === "string") {
            router.push({ pathname: "/(tabs)/timer", params: { taskId } });
          }
        },
      );
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

  const animatePressScale = useCallback(
    (anim: Animated.Value, pressed: boolean) => {
      Animated.spring(anim, {
        toValue: pressed ? 0.97 : 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }).start();
    },
    [],
  );

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

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Force re-fetch of social activities
      // Since useSocialActivities has debounced refresh, we just wait for it
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return (
    <SafeAreaView
      style={StyleSheet.flatten([
        SharedStyles.screen,
        styles.safe,
        { backgroundColor: colors.background },
      ])}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Top header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>
          HOME
        </Text>
        <View style={styles.headerActions}>
          <Animated.View style={{ transform: [{ scale: iconButtonScale }] }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowSearch(true)}
              onPressIn={() => animatePressScale(iconButtonScale, true)}
              onPressOut={() => animatePressScale(iconButtonScale, false)}
              accessibilityRole="button"
              accessibilityHint="Open the friend search sheet"
            >
              <LucideIcon name="search-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: headerButtonScale }] }}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => setShowNotifications(true)}
              onPressIn={() => animatePressScale(headerButtonScale, true)}
              onPressOut={() => animatePressScale(headerButtonScale, false)}
              accessibilityRole="button"
              accessibilityHint="Open the notifications sheet"
            >
              {(pendingCount > 0 || notificationCount > 0) && (
                <View
                  style={[styles.badge, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.badgeText, { color: colors.surface }]}>
                    {pendingCount + notificationCount > 9
                      ? "9+"
                      : pendingCount + notificationCount}
                  </Text>
                </View>
              )}
              <LucideIcon
                name="notifications-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            enabled={true}
            progressViewOffset={-10}
          />
        }
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
          <View
            style={StyleSheet.flatten([
              SharedStyles.card,
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
          >
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No activities yet. Complete a focus session to add one.
            </Text>
          </View>
        ) : (
          activities.map((activity) => (
            <AnimatedActivityCard
              key={activity.id}
              activity={activity}
              initials={initials}
              profile={profile}
              fmtActivityDate={fmtDate(activity.createdAt)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showReminders}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowReminders(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.reminderSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.reminderHeader}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>
                Reminders
              </Text>
              <TouchableOpacity onPress={() => setShowReminders(false)}>
                <LucideIcon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {reminders.length === 0 ? (
              <Text style={[styles.reminderEmpty, { color: colors.textMuted }]}>
                No pending reminders.
              </Text>
            ) : (
              reminders.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reminderRow}
                  onPress={() => {
                    setShowReminders(false);
                    router.push({
                      pathname: "/(tabs)/timer",
                      params: { taskId: item.taskId },
                    });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.reminderRowTitle, { color: colors.text }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.reminderRowDate,
                        { color: colors.textMuted },
                      ]}
                    >
                      {fmtDate(item.dueDate)}
                    </Text>
                  </View>
                  <Text
                    style={StyleSheet.flatten([
                      styles.reminderStatus,
                      item.status === "overdue"
                        ? styles.overdue
                        : styles.upcoming,
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

      <Modal
        visible={showSearch}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowSearch(false)}
      >
        <KeyboardAvoidingView
          style={styles.searchOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.searchSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.searchHeader}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>
                Find Friends
              </Text>
              <TouchableOpacity onPress={() => setShowSearch(false)}>
                <LucideIcon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search username"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={runUserSearch}
                returnKeyType="search"
              />
              <Animated.View
                style={{ transform: [{ scale: searchButtonScale }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.searchSubmitBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={runUserSearch}
                  onPressIn={() => animatePressScale(searchButtonScale, true)}
                  onPressOut={() => animatePressScale(searchButtonScale, false)}
                  accessibilityRole="button"
                  accessibilityHint="Search for users"
                >
                  <LucideIcon name="search" size={16} color={colors.surface} />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {searching ? (
              <Text style={[styles.searchHint, { color: colors.textMuted }]}>
                Searching...
              </Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text
                    style={[styles.searchHint, { color: colors.textMuted }]}
                  >
                    {searchQuery.trim()
                      ? "No users found."
                      : "Search by username to find users."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.resultRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/profile/[uid]" as never,
                          params: { uid: item.id },
                        })
                      }
                    >
                      <Text
                        style={[styles.avatarText, { color: colors.surface }]}
                      >
                        {item.username.slice(0, 2).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() =>
                        router.push({
                          pathname: "/profile/[uid]" as never,
                          params: { uid: item.id },
                        })
                      }
                    >
                      <Text style={[styles.resultName, { color: colors.text }]}>
                        {item.username}
                      </Text>
                    </TouchableOpacity>
                    <Animated.View
                      style={{ transform: [{ scale: followButtonScale }] }}
                    >
                      <TouchableOpacity
                        style={StyleSheet.flatten([
                          styles.addBtn,
                          { backgroundColor: colors.primary },
                          followStatusMap[item.id] === "following" && {
                            backgroundColor: colors.textMuted,
                          },
                          (followingUid === item.id ||
                            followStatusMap[item.id] === "following") &&
                            styles.addBtnDisabled,
                        ])}
                        disabled={
                          followingUid === item.id ||
                          followStatusMap[item.id] === "following"
                        }
                        onPress={() => handleFollow(item)}
                        onPressIn={() =>
                          animatePressScale(followButtonScale, true)
                        }
                        onPressOut={() =>
                          animatePressScale(followButtonScale, false)
                        }
                        accessibilityRole="button"
                        accessibilityHint="Follow this user"
                      >
                        <Text
                          style={[styles.addBtnText, { color: colors.surface }]}
                        >
                          {followingUid === item.id
                            ? "Following..."
                            : followStatusMap[item.id] === "following"
                              ? "Following"
                              : followStatusMap[item.id] === "followBack"
                                ? "Follow Back"
                                : "Follow"}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
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
    minHeight: "100%",
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
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
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
  reminderStatus: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
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
