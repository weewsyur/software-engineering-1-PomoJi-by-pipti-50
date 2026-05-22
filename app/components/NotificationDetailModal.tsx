import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  X,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { Notification } from "@/hooks/useNotifications";
import { markNotificationAsRead } from "@/services/notificationPersistence";

interface NotificationDetailModalProps {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const getNotificationColor = (type: string) => {
  switch (type) {
    case "task_reminder":
      return "#4C7AC9";
    case "session_complete":
      return "#10B981";
    case "follow":
      return "#8B5CF6";
    default:
      return Colors.primary;
  }
};

const getNotificationTitle = (notification: Notification): string => {
  switch (notification.type) {
    case "task_reminder":
      return `Task Reminder: ${notification.taskTitle || "Untitled"}`;
    case "session_complete":
      return "Session Complete";
    case "follow":
      return `${notification.fromUsername} started following you`;
    default:
      return "Notification";
  }
};

const getNotificationMessage = (notification: Notification): string => {
  switch (notification.type) {
    case "task_reminder": {
      const status =
        notification.reminderStatus === "overdue" ? "Overdue" : "Due";
      return `${status} on ${notification.dueDate ? formatDate(notification.dueDate) : "unknown date"}`;
    }
    case "session_complete":
      return `Completed ${notification.taskTitle || "Focus Session"} in ${Math.floor((notification.durationSeconds || 0) / 60)}m ${(notification.durationSeconds || 0) % 60}s`;
    case "follow":
      return `You can now see ${notification.fromUsername}'s activities`;
    default:
      return "";
  }
};

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  visible,
  notification,
  onClose,
  onMarkAsRead,
}) => {
  useEffect(() => {
    if (visible && notification && !notification.read) {
      markNotificationAsRead(notification.id).then(() => {
        if (onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
      });
    }
  }, [visible, notification]);

  if (!notification) return null;

  const IconComponent = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);
  const title = getNotificationTitle(notification);
  const message = getNotificationMessage(notification);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: Colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: iconColor + "20" },
                ]}
              >
                <IconComponent size={28} color={iconColor} strokeWidth={1.5} />
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: Colors.text }]}>{title}</Text>

            <Text style={[styles.message, { color: Colors.textMuted }]}>
              {message}
            </Text>

            {notification.type === "task_reminder" && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: Colors.textMuted }]}>
                    Task
                  </Text>
                  <Text style={[styles.detailValue, { color: Colors.text }]}>
                    {notification.taskTitle || "Untitled Task"}
                  </Text>
                </View>
                {notification.dueDate && (
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, { color: Colors.textMuted }]}
                    >
                      Due
                    </Text>
                    <Text style={[styles.detailValue, { color: Colors.text }]}>
                      {formatDate(notification.dueDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: Colors.textMuted }]}
                  >
                    Status
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color:
                          notification.reminderStatus === "overdue"
                            ? "#C94C3C"
                            : "#4C7AC9",
                      },
                    ]}
                  >
                    {notification.reminderStatus === "overdue"
                      ? "Overdue"
                      : "Upcoming"}
                  </Text>
                </View>
              </View>
            )}

            {notification.type === "session_complete" && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: Colors.textMuted }]}
                  >
                    Task
                  </Text>
                  <Text style={[styles.detailValue, { color: Colors.text }]}>
                    {notification.taskTitle || "Focus Session"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: Colors.textMuted }]}
                  >
                    Duration
                  </Text>
                  <Text style={[styles.detailValue, { color: Colors.text }]}>
                    {Math.floor((notification.durationSeconds || 0) / 60)}m{" "}
                    {(notification.durationSeconds || 0) % 60}s
                  </Text>
                </View>
                {notification.sessionsCompleted && (
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, { color: Colors.textMuted }]}
                    >
                      Sessions Completed
                    </Text>
                    <Text style={[styles.detailValue, { color: Colors.text }]}>
                      {notification.sessionsCompleted}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {notification.type === "follow" && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: Colors.textMuted }]}
                  >
                    User
                  </Text>
                  <Text style={[styles.detailValue, { color: Colors.text }]}>
                    {notification.fromUsername || "Unknown User"}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.timestamp, { color: Colors.textMuted }]}>
              {formatDate(notification.createdAt)}
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.actionBtnText, { color: Colors.surface }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
    lineHeight: 26,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
