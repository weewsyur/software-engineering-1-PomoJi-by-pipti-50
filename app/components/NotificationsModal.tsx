import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Clock,
  CheckCircle2,
  UserPlus,
} from "lucide-react-native";
import { useColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { Notification } from "@/hooks/useNotifications";
import { useRouter } from "expo-router";
import { NotificationDetailModal } from "@/app/components/NotificationDetailModal";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

type ThemeColors = ReturnType<typeof useColors>;
type Tab = "all" | "unread";
type ListItem =
  | { kind: "label"; key: string; text: string }
  | { kind: "item"; key: string; n: Notification; idx: number };

const fmtDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_reminder":
      return Clock;
    case "session_complete":
      return CheckCircle2;
    case "follow":
      return UserPlus;
    default:
      return Bell;
  }
};

const getNotificationTitle = (notification: Notification): string => {
  switch (notification.type) {
    case "task_reminder":
      return notification.taskTitle || "Task Reminder";
    case "session_complete":
      return "Session Complete";
    case "follow":
      return `${notification.fromUsername} started following you`;
    default:
      return "Notification";
  }
};

const getNotificationPreview = (notification: Notification): string => {
  switch (notification.type) {
    case "task_reminder":
      return notification.reminderStatus === "overdue" ? "Overdue" : "Upcoming";
    case "session_complete":
      return `${Math.floor((notification.durationSeconds || 0) / 60)}m session`;
    case "follow":
      return `@${notification.fromUsername || "user"}`;
    default:
      return "";
  }
};

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

const NotificationRow = ({
  notification,
  index,
  onPress,
  colors,
}: {
  notification: Notification;
  index: number;
  onPress: () => void;
  colors: ThemeColors;
}) => {
  const anim = useEntrance(Math.min(index, 8) * 45, 14, 320);
  const pressAnim = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(pressAnim, {
      toValue: to,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();

  const unread = !notification.read;
  const isFollow = notification.type === "follow";
  const Icon = getNotificationIcon(notification.type);
  const initials = (notification.fromUsername || "U").slice(0, 2).toUpperCase();
  const preview = getNotificationPreview(notification);

  return (
    <Animated.View
      style={{
        opacity: anim.opacity,
        transform: [...anim.transform, { scale: pressAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.row,
          unread && { backgroundColor: colors.primaryMuted },
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={() => spring(0.98)}
        onPressOut={() => spring(1)}
      >
        <View>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isFollow
                  ? colors.avatarBg
                  : colors.primaryMuted,
              },
            ]}
          >
            {isFollow ? (
              <Text style={[styles.avatarText, { color: colors.avatarText }]}>
                {initials}
              </Text>
            ) : (
              <Icon size={22} color={colors.primary} strokeWidth={2} />
            )}
          </View>
          {isFollow && (
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: colors.primary, borderColor: colors.surface },
              ]}
            >
              <Icon size={10} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          )}
        </View>

        <View style={styles.rowContent}>
          <Text
            style={[
              styles.rowTitle,
              { color: colors.text, fontWeight: unread ? "700" : "500" },
            ]}
            numberOfLines={2}
          >
            {getNotificationTitle(notification)}
          </Text>
          {preview ? (
            <Text
              style={[styles.rowPreview, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          ) : null}
          <Text
            style={[
              styles.rowTime,
              {
                color: unread ? colors.primary : colors.textMuted,
                fontWeight: unread ? "700" : "500",
              },
            ]}
          >
            {fmtDate(notification.createdAt)}
          </Text>
        </View>

        {unread && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const [tab, setTab] = useState<Tab>("all");
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const headerAnim = useEntrance(0, -10, 350);

  useEffect(() => {
    if (!visible) setTab("all");
  }, [visible]);

  const handleNotificationPress = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);

    if (notification.type === "follow") {
      // Still support navigation for follow notifications
      router.push({
        pathname: "/profile/[uid]" as never,
        params: { uid: notification.fromUid },
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Facebook-style grouping: "New" (unread) then "Earlier"
  const items = useMemo<ListItem[]>(() => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);
    if (tab === "unread") {
      return unread.map((n, i) => ({ kind: "item", key: n.id, n, idx: i }));
    }
    const out: ListItem[] = [];
    let i = 0;
    if (unread.length) {
      out.push({ kind: "label", key: "label-new", text: "New" });
      unread.forEach((n) => out.push({ kind: "item", key: n.id, n, idx: i++ }));
    }
    if (read.length) {
      out.push({ kind: "label", key: "label-earlier", text: "Earlier" });
      read.forEach((n) => out.push({ kind: "item", key: n.id, n, idx: i++ }));
    }
    return out;
  }, [notifications, tab]);

  const renderTab = (id: Tab, label: string) => {
    const active = tab === id;
    return (
      <TouchableOpacity
        key={id}
        onPress={() => setTab(id)}
        style={[
          styles.tab,
          { backgroundColor: active ? colors.primary : colors.background },
        ]}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.tabText,
            { color: active ? "#FFFFFF" : colors.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={[styles.screen, { backgroundColor: colors.surface }]}
        >
          <Animated.View style={[styles.header, headerAnim]}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
            >
              <ArrowLeft size={24} color={colors.text} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              Notifications
            </Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={onMarkAllAsRead}>
                <Text style={[styles.markAllText, { color: colors.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.markAllSpacer} />
            )}
          </Animated.View>

          <View style={styles.tabs}>
            {renderTab("all", "All")}
            {renderTab(
              "unread",
              unreadCount > 0 ? `Unread (${unreadCount})` : "Unread",
            )}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Bell size={34} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {tab === "unread"
                      ? "You're all caught up"
                      : "No notifications yet"}
                  </Text>
                </View>
              }
              renderItem={({ item }) =>
                item.kind === "label" ? (
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    {item.text}
                  </Text>
                ) : (
                  <NotificationRow
                    notification={item.n}
                    index={item.idx}
                    colors={colors}
                    onPress={() => handleNotificationPress(item.n)}
                  />
                )
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      <NotificationDetailModal
        visible={detailModalVisible}
        notification={selectedNotification}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={onMarkAsRead}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { flex: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  markAllText: { fontSize: 13, fontWeight: "700" },
  markAllSpacer: { width: 1 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tab: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  tabText: { fontSize: 13, fontWeight: "700" },
  list: { paddingBottom: 24, flexGrow: 1 },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "800" },
  typeBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, lineHeight: 19 },
  rowPreview: { fontSize: 12, fontWeight: "500" },
  rowTime: { fontSize: 12, marginTop: 2 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  centered: { paddingVertical: 60, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "500" },
});