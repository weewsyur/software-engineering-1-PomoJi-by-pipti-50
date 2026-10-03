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
  Platform,
  FlatList,
  Animated,
  Easing,
  ActivityIndicator,
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
import { useWebPullToRefresh } from "@/hooks/useWebPullToRefresh";
import { WebPullToRefreshIndicator } from "@/app/components/WebPullToRefreshIndicator";
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
  index = 0,
}: {
  activity: any;
  initials: string;
  profile: { name: string; photoUri: string | null };
  fmtActivityDate: string;
  index?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index, 6) * 90 + 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay: Math.min(index, 6) * 90 + 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

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

type ThemeColors = ReturnType<typeof useColors>;

function useEntrance(delay = 0, distance = 24, duration = 500) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay, duration]);
  return {
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}

// Badge that pops whenever the count changes
function NotificationBadge({
  count,
  backgroundColor,
  textColor,
}: {
  count: number;
  backgroundColor: string;
  textColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (count > 0) {
      scale.setValue(0.4);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [count, scale]);

  if (count <= 0) return null;
  return (
    <Animated.View
      style={[styles.badge, { backgroundColor, transform: [{ scale }] }]}
    >
      <Text style={[styles.badgeText, { color: textColor }]}>
        {count > 9 ? "9+" : count}
      </Text>
    </Animated.View>
  );
}

function FollowButton({
  status,
  loading,
  onPress,
  colors,
}: {
  status?: FollowStatus;
  loading: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  const following = status === "following";
  const label = loading
    ? "..."
    : following
      ? "Following"
      : status === "followBack"
        ? "Follow Back"
        : "Follow";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.followBtn,
          { backgroundColor: following ? colors.border : colors.primary },
        ]}
        disabled={loading || following}
        onPress={onPress}
        onPressIn={() => press(0.94)}
        onPressOut={() => press(1)}
        accessibilityRole="button"
        accessibilityHint="Follow this user"
      >
        <Text
          style={[
            styles.followBtnText,
            { color: following ? colors.textSecondary : "#FFFFFF" },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchResultRow({
  item,
  index,
  status,
  loading,
  onOpen,
  onFollow,
  colors,
}: {
  item: UserSearchResult;
  index: number;
  status?: FollowStatus;
  loading: boolean;
  onOpen: () => void;
  onFollow: () => void;
  colors: ThemeColors;
}) {
  const anim = useEntrance(Math.min(index, 8) * 40, 12, 300);
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.6}
        onPress={onOpen}
      >
        <View
          style={[styles.avatarCircle, { backgroundColor: colors.avatarBg }]}
        >
          <Text style={[styles.avatarText, { color: colors.avatarText }]}>
            {item.username.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text
          style={[styles.resultName, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.username}
        </Text>
        <FollowButton
          status={status}
          loading={loading}
          onPress={onFollow}
          colors={colors}
        />
      </TouchableOpacity>
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
  const headerAnim = useEntrance(0, -12, 450);
  const streakAnim = useEntrance(120, 24, 550);
  const { reminders, pendingCount } = useReminders();
  const { activities } = useSocialActivities();
  const { profile } = useProfile();
  const headerButtonScale = useRef(new Animated.Value(1)).current;
  const iconButtonScale = useRef(new Animated.Value(1)).current;
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

  const searchReqRef = useRef(0);
  const runUserSearch = useCallback(async () => {
    const reqId = ++searchReqRef.current;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchQuery, userId);
      if (reqId !== searchReqRef.current) return;
      setSearchResults(results);
      const statusMap = await getFollowStatusMap(results, userId);
      if (reqId !== searchReqRef.current) return;
      setFollowStatusMap(statusMap);
    } finally {
      if (reqId === searchReqRef.current) setSearching(false);
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

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const openProfile = (uid: string) => {
    closeSearch();
    router.push({ pathname: "/profile/[uid]" as never, params: { uid } });
  };

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

  const { pullDistance, webScrollProps } = useWebPullToRefresh({
    onRefresh,
    refreshing,
  });

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
      <Animated.View
        style={[styles.header, { backgroundColor: colors.background }, headerAnim]}
      >
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
              <NotificationBadge
                count={pendingCount + notificationCount}
                backgroundColor={colors.primary}
                textColor={colors.surface}
              />
              <LucideIcon
                name="notifications-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...webScrollProps}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              enabled={true}
              progressViewOffset={-10}
            />
          ) : undefined
        }
      >
        <WebPullToRefreshIndicator
          refreshing={refreshing}
          pullDistance={pullDistance}
          color={colors.primary}
        />

        {/* Streak Card - Real-time Updates */}
        <Animated.View style={streakAnim}>
        <StreakCard
          streakData={streakData}
          loading={loading}
          error={error}
          streakUnit="Days"
        />
        </Animated.View>

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
          activities.map((activity, index) => (
            <AnimatedActivityCard
              key={activity.id}
              index={index}
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
        statusBarTranslucent
        onRequestClose={closeSearch}
      >
        <SafeAreaView
          style={[styles.searchScreen, { backgroundColor: colors.surface }]}
        >
          <View style={styles.searchBar}>
            <TouchableOpacity
              onPress={closeSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close search"
            >
              <Text style={[styles.searchBack, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            <View
              style={[styles.searchField, { backgroundColor: colors.background }]}
            >
              <LucideIcon name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search people"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  accessibilityLabel="Clear search"
                >
                  <LucideIcon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.searchList}
            ListHeaderComponent={
              searchResults.length > 0 ? (
                <Text
                  style={[styles.searchSectionLabel, { color: colors.textMuted }]}
                >
                  People
                </Text>
              ) : null
            }
            ListEmptyComponent={
              searching ? null : (
                <Text style={[styles.searchHint, { color: colors.textMuted }]}>
                  {searchQuery.trim()
                    ? "No people found."
                    : "Search by username to find people."}
                </Text>
              )
            }
            renderItem={({ item, index }) => (
              <SearchResultRow
                item={item}
                index={index}
                status={followStatusMap[item.id]}
                loading={followingUid === item.id}
                onOpen={() => openProfile(item.id)}
                onFollow={() => handleFollow(item)}
                colors={colors}
              />
            )}
          />
        </SafeAreaView>
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
  searchScreen: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchBack: { fontSize: 24, lineHeight: 28 },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchList: { paddingHorizontal: 16, paddingBottom: 24 },
  searchSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchHint: { fontSize: 13, textAlign: "center", paddingVertical: 32 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800" },
  resultName: { flex: 1, fontSize: 15, fontWeight: "600" },
  followBtn: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  followBtnText: { fontSize: 12, fontWeight: "700" },
});