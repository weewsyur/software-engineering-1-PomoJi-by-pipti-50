import Constants from "expo-constants";
import type { Task } from "@/store/taskStore";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

function shouldEnableExpoNotifications() {
  // Expo Go auto-registers remote push tokens and crashes on Android for SDK >= 53.
  // We avoid importing expo-notifications in that environment.
  return Constants.executionEnvironment !== "storeClient";
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!shouldEnableExpoNotifications()) return null;
  if (notificationsModule) return notificationsModule;

  const mod = await import("expo-notifications");
  notificationsModule = mod;

  if (!handlerConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  return notificationsModule;
}

export async function initializeNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.requestPermissionsAsync();
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
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  if (previousNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(previousNotificationId).catch(() => null);
  }

  if (!task.reminderEnabled || task.completed) return null;

  const triggerDate = toReminderDate(task.dueDate);
  if (!triggerDate || triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
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
  const Notifications = await getNotifications();
  if (!Notifications) return;
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => null);
}

export async function scheduleSessionCompletionNotification(params: {
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
}) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const mins = Math.floor(params.durationSeconds / 60);
  const secs = params.durationSeconds % 60;

  // Fire very shortly after completion time.
  const fireAt = new Date(Date.now() + 1500);

  return Notifications.scheduleNotificationAsync({
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
