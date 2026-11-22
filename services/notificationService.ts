import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Task } from "@/store/taskStore";
import {
  webNotificationService,
  showSessionCompleteNotification as showWebSessionComplete,
  showBreakReminderNotification as showWebBreakReminder,
  showFocusSessionAlert as showWebFocusAlert,
  requestNotificationPermission as requestWebPermission,
} from "@/services/webNotificationService";

let handlerConfigured = false;
let timerNotificationQueue: Promise<void> = Promise.resolve();
const webTimerNotificationIds = new Map<
  "approaching" | "completion" | "background",
  number
>();

function queueTimerNotificationOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = timerNotificationQueue.then(operation, operation);
  timerNotificationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function getNotifications() {
  if (Platform.OS === "web") return null;
  return Notifications;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;
  const notifications = getNotifications();
  if (!notifications) return;

  await notifications.setNotificationChannelAsync("timer", {
    name: "Timer",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

function configureNotificationHandler() {
  const notifications = getNotifications();
  if (!notifications || handlerConfigured) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function initializeNotifications() {
  if (Platform.OS === "web") {
    return webNotificationService.getPermissionStatus() === "granted";
  }

  const notifications = getNotifications();
  if (!notifications) return false;

  configureNotificationHandler();
  await ensureAndroidNotificationChannel();

  let permissions = await notifications.getPermissionsAsync();
  if (!permissions.granted && permissions.canAskAgain) {
    permissions = await notifications.requestPermissionsAsync();
  }
  return permissions.granted;
}

export async function requestTimerNotificationPermission() {
  if (Platform.OS === "web") {
    return requestWebPermission();
  }
  return initializeNotifications();
}

export async function getNotificationPermissionStatus() {
  if (Platform.OS === "web") {
    return webNotificationService.getPermissionStatus() === "granted";
  }

  const notifications = getNotifications();
  if (!notifications) return false;
  const permissions = await notifications.getPermissionsAsync();
  return permissions.granted;
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

  configureNotificationHandler();

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
  // Use web notifications on web platform
  if (Platform.OS === "web") {
    return showWebSessionComplete({
      taskTitle: params.taskTitle,
      durationSeconds: params.durationSeconds,
    });
  }

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

export async function scheduleTaskAddedNotification(taskTitle: string) {
  // Use web notifications on web platform
  if (Platform.OS === "web") {
    const { webNotificationService } = await import("@/services/webNotificationService");
    return webNotificationService.showNotification({
      title: "Task Added",
      body: `New task: ${taskTitle}`,
      tag: "task-added",
    });
  }

  const notifications = getNotifications();
  if (!notifications) return null;

  configureNotificationHandler();

  const fireAt = new Date(Date.now() + 1000);

  return notifications.scheduleNotificationAsync({
    content: {
      title: "Task Added",
      body: `New task: ${taskTitle}`,
      data: { type: 'task_added' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

async function cancelScheduledTimerNotifications() {
  if (Platform.OS === "web") {
    for (const id of webTimerNotificationIds.values()) {
      webNotificationService.cancelScheduledNotification(id);
    }
    webTimerNotificationIds.clear();
    return;
  }

  const notifications = getNotifications();
  if (!notifications) return;

  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  const timerNotifications = scheduled.filter(
    ({ content }) =>
      content.data?.pomojiTimerNotice === "completion" ||
      content.data?.pomojiTimerNotice === "approaching" ||
      content.data?.pomojiTimerNotice === "background",
  );
  await Promise.all(
    timerNotifications.map(({ identifier }) =>
      notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );
}

export function scheduleTimerNotifications(params: {
  taskTitle: string;
  durationSeconds: number;
}) {
  return queueTimerNotificationOperation(async () => {
    if (Platform.OS === "web") {
      if (!(await getNotificationPermissionStatus())) return false;

      if (params.durationSeconds <= 0) {
        if (webTimerNotificationIds.has("completion")) return true;
        await webNotificationService.showNotification({
          title: "Focus session complete",
          body: `${params.taskTitle} • Your Pomodoro session is complete.`,
          tag: "pomoji-timer-completion",
          requireInteraction: true,
          data: { pomojiTimerNotice: "completion", url: "/timer" },
        });
        return true;
      }

      await cancelScheduledTimerNotifications();
      const schedule = (
        notice: "approaching" | "completion",
        delaySeconds: number,
      ) =>
        webNotificationService
          .scheduleNotification({
          title:
            notice === "approaching" ? "Almost there" : "Focus session complete",
          body:
            notice === "approaching"
              ? "Your Pomodoro session finishes in about five minutes."
              : `${params.taskTitle} • Your Pomodoro session is complete.`,
          delayMs: delaySeconds * 1000,
          tag: `pomoji-timer-${notice}`,
          data: { pomojiTimerNotice: notice, url: "/timer" },
          })
          .then((id) => {
            if (id !== -1) webTimerNotificationIds.set(notice, id);
            return id !== -1;
          });

      if (params.durationSeconds > 5 * 60) {
        if (!(await schedule("approaching", params.durationSeconds - 5 * 60))) {
          return false;
        }
      }
      return schedule("completion", params.durationSeconds);
    }

    const notifications = getNotifications();
    if (!notifications) return false;

    const permissions = await notifications.getPermissionsAsync();
    if (!permissions.granted) return false;

    configureNotificationHandler();
    await ensureAndroidNotificationChannel();
    if (params.durationSeconds <= 0) {
      const scheduled = await notifications.getAllScheduledNotificationsAsync();
      return scheduled.some(
        ({ content }) => content.data?.pomojiTimerNotice === "completion",
      );
    }
    await cancelScheduledTimerNotifications();

    const schedule = (
      notice: "approaching" | "completion",
      delaySeconds: number,
    ) =>
      notifications.scheduleNotificationAsync({
        content: {
          title:
            notice === "approaching" ? "Almost there" : "Focus session complete",
          body:
            notice === "approaching"
              ? "Your Pomodoro session finishes in about five minutes."
              : `${params.taskTitle} • Your Pomodoro session is complete.`,
          data: { pomojiTimerNotice: notice },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + delaySeconds * 1000),
          ...(Platform.OS === "android" ? { channelId: "timer" } : {}),
        },
      });

    if (params.durationSeconds > 5 * 60) {
      await schedule("approaching", params.durationSeconds - 5 * 60);
    }
    await schedule("completion", params.durationSeconds);
    return true;
  });
}

export function scheduleBackgroundSessionNotification(taskTitle: string) {
  return queueTimerNotificationOperation(async () => {
    if (Platform.OS === "web") {
      if (!(await getNotificationPermissionStatus())) return;
      const previousId = webTimerNotificationIds.get("background");
      if (previousId !== undefined) {
        webNotificationService.cancelScheduledNotification(previousId);
      }
      const id = await webNotificationService.scheduleNotification({
        title: "Focus session is still running",
        body: `${taskTitle} continues while PomoJI is in the background.`,
        delayMs: 60_000,
        tag: "pomoji-timer-background",
        data: { pomojiTimerNotice: "background", url: "/timer" },
      });
      webTimerNotificationIds.set("background", id);
      return;
    }

    const notifications = getNotifications();
    if (!notifications) return;

    const permissions = await notifications.getPermissionsAsync();
    if (!permissions.granted) return;
    await ensureAndroidNotificationChannel();

    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          ({ content }) => content.data?.pomojiTimerNotice === "background",
        )
        .map(({ identifier }) =>
          notifications.cancelScheduledNotificationAsync(identifier),
        ),
    );

    await notifications.scheduleNotificationAsync({
      content: {
        title: "Focus session is still running",
        body: `${taskTitle} continues while PomoJI is in the background.`,
        data: { pomojiTimerNotice: "background" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        ...(Platform.OS === "android" ? { channelId: "timer" } : {}),
      },
    });
  });
}

export function cancelTimerNotifications(preserveCompletion = false) {
  return queueTimerNotificationOperation(async () => {
    if (Platform.OS === "web") {
      for (const [notice, id] of webTimerNotificationIds) {
        if (preserveCompletion && notice === "completion") continue;
        webNotificationService.cancelScheduledNotification(id);
        webTimerNotificationIds.delete(notice);
      }
      return;
    }

    const notifications = getNotifications();
    if (!notifications) return;

    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    const timerNotifications = scheduled.filter(({ content }) => {
      const notice = content.data?.pomojiTimerNotice;
      return (
        notice === "approaching" ||
        notice === "background" ||
        (!preserveCompletion && notice === "completion")
      );
    });
    await Promise.all(
      timerNotifications.map(({ identifier }) =>
        notifications.cancelScheduledNotificationAsync(identifier),
      ),
    );
  });
}

export function cancelBackgroundSessionNotification() {
  return queueTimerNotificationOperation(async () => {
    if (Platform.OS === "web") {
      const id = webTimerNotificationIds.get("background");
      if (id !== undefined) {
        webNotificationService.cancelScheduledNotification(id);
        webTimerNotificationIds.delete("background");
      }
      return;
    }

    const notifications = getNotifications();
    if (!notifications) return;

    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          ({ content }) => content.data?.pomojiTimerNotice === "background",
        )
        .map(({ identifier }) =>
          notifications.cancelScheduledNotificationAsync(identifier),
        ),
    );
  });
}
