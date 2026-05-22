import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import {
  X,
  User,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
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

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const router = useRouter();
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={onMarkAllAsRead}
                    style={styles.markAllBtn}
                  >
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={Colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Bell
                    size={32}
                    color={Colors.textMuted}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.read && styles.unread,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          notification.type === "task_reminder" && {
                            backgroundColor: "#4C7AC9" + "20",
                          },
                          notification.type === "session_complete" && {
                            backgroundColor: "#10B981" + "20",
                          },
                          notification.type === "follow" && {
                            backgroundColor: "#8B5CF6" + "20",
                          },
                        ]}
                      >
                        <IconComponent
                          size={18}
                          color={
                            notification.type === "task_reminder"
                              ? "#4C7AC9"
                              : notification.type === "session_complete"
                                ? "#10B981"
                                : notification.type === "follow"
                                  ? "#8B5CF6"
                                  : Colors.primary
                          }
                          strokeWidth={2}
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text
                          style={[
                            styles.notificationText,
                            { color: Colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {getNotificationTitle(notification)}
                        </Text>
                        <Text
                          style={[
                            styles.notificationPreview,
                            { color: Colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {getNotificationPreview(notification)}
                        </Text>
                        <Text
                          style={[
                            styles.timestamp,
                            { color: Colors.textMuted },
                          ]}
                        >
                          {fmtDate(notification.createdAt)}
                        </Text>
                      </View>
                      {!notification.read && (
                        <View style={styles.unreadDot} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    paddingTop: 84,
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  unread: {
    backgroundColor: Colors.surface + "40",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
  },
  notificationPreview: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    flexShrink: 0,
  },
});

