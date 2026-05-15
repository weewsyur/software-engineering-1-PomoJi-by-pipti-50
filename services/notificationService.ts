import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Task } from "@/store/taskStore";

let handlerConfigured = false;

function shouldEnableExpoNotifications() {
  // Disable notifications on web as expo-notifications has limited web support
  if (Platform.OS === "web") return false;
  return Constants.executionEnvironment !== "storeClient";
}

function getNotifications() {
  if (!shouldEnableExpoNotifications()) return null;
  return Notifications;
}

export async function initializeNotifications() {
  const notifications = getNotifications();
  if (!notifications) return;
  await notifications.requestPermissionsAsync();
}

function toReminderDate(dueDate: string) {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function upsertTaskReminder(
  task: Task,
  previousNotificationId?: string | null,
) {
  const notifications = getNotifications();
  if (!notifications) return null;

  if (previousNotificationId) {
    await notifications.cancelScheduledNotificationAsync(previousNotificationId).catch(() => null);
  }

  if (!task.reminderEnabled || task.completed) return null;

  const triggerDate = toReminderDate(task.dueDate);
  if (!triggerDate || triggerDate.getTime() <= Date.now()) return null;

  if (!handlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  const id = await notifications.scheduleNotificationAsync({
    content: {
      title: "Task Reminder",
      body: task.title || "You have a pending task",
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelTaskReminder(notificationId?: string | null) {
  const notifications = getNotifications();
  if (!notifications) return;
  if (!notificationId) return;
  await notifications.cancelScheduledNotificationAsync(notificationId).catch(() => null);
}

export async function scheduleSessionCompletionNotification(params: {
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
}) {
  const notifications = getNotifications();
  if (!notifications) return null;

  const mins = Math.floor(params.durationSeconds / 60);
  const secs = params.durationSeconds % 60;

  const fireAt = new Date(Date.now() + 1500);

  return notifications.scheduleNotificationAsync({
    content: {
      title: "Session Complete",
      body: `${params.taskTitle} • ${mins}m ${secs}s`,
      data: { taskId: params.taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}
