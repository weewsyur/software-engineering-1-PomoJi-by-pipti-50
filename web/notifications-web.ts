export class WebNotifications {
  private static notificationPermission: NotificationPermission = 'default';

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        return permission === 'granted';
      } catch (error) {
        console.error('Notification permission request failed:', error);
        return false;
      }
    }

    return false;
  }

  static hasPermission(): boolean {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  static async showNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<Notification | null> {
    if (!this.hasPermission()) {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options,
      });

      // Close notification after 5 seconds if click handler not provided
      if (!options.tag) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  static async showTimerCompleteNotification(timerType: string): Promise<Notification | null> {
    const messages = {
      focus: '🎉 Focus session complete! Time for a break.',
      short: '✅ Break finished! Ready to focus again?',
      long: '🏆 Long break done! You earned it.',
    };

    return this.showNotification(
      'PomoJI - Session Complete',
      {
        body: messages[timerType as keyof typeof messages] || 'Session complete!',
        tag: 'timer-complete',
        requireInteraction: false,
      }
    );
  }

  static async showTaskReminderNotification(taskTitle: string): Promise<Notification | null> {
    return this.showNotification(
      'PomoJI - Task Reminder',
      {
        body: `📌 Reminder: ${taskTitle}`,
        tag: `reminder-${taskTitle}`,
        requireInteraction: true,
      }
    );
  }

  static getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }
}
