import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { X, User } from "lucide-react";
import { Colors } from "@/constants/colors";
import { Notification } from "@/hooks/useNotifications";
import { useRouter } from "expo-router";

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

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const router = useRouter();

  const handleNotificationPress = async (notification: Notification) => {
    await onMarkAsRead(notification.id);
    
    if (notification.type === "follow") {
      router.push({ pathname: "/profile/[uid]" as never, params: { uid: notification.fromUid } });
      onClose();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={Colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[styles.notificationItem, !notification.read && styles.unread]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <User size={20} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      <Text style={styles.username}>{notification.fromUsername}</Text> started following you
                    </Text>
                    <Text style={styles.timestamp}>{fmtDate(notification.createdAt)}</Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 20,
  },
  username: {
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
