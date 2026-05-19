import { Platform } from 'react-native';

// Web Notification API service for PWA
class WebNotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.permission = this.isSupported ? Notification.permission : 'default';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Web notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    }

    return false;
  }

  async showNotification(options: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  }): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async scheduleNotification(options: {
    title: string;
    body: string;
    delayMs: number;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }): Promise<number> {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return -1;
    }

    const timeoutId = window.setTimeout(() => {
      this.showNotification(options);
    }, options.delayMs);

    return timeoutId;
  }

  cancelScheduledNotification(timeoutId: number): void {
    if (timeoutId !== -1) {
      clearTimeout(timeoutId);
    }
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }
}

// Singleton instance
export const webNotificationService = new WebNotificationService();

// Helper functions for common notification types
export async function showSessionCompleteNotification(params: {
  taskTitle: string;
  durationSeconds: number;
}) {
  const mins = Math.floor(params.durationSeconds / 60);
  const secs = params.durationSeconds % 60;

  await webNotificationService.showNotification({
    title: '🎉 Session Complete!',
    body: `${params.taskTitle} • ${mins}m ${secs}s`,
    tag: 'session-complete',
    requireInteraction: true,
    data: { type: 'session-complete' },
  });
}

export async function showBreakReminderNotification(params: {
  breakType: 'short' | 'long';
  durationMinutes: number;
}) {
  await webNotificationService.showNotification({
    title: '☕ Time for a Break!',
    body: `${params.breakType === 'short' ? '5' : '15'} minute ${params.breakType} break`,
    tag: 'break-reminder',
    requireInteraction: true,
    data: { type: 'break-reminder', breakType: params.breakType },
  });
}

export async function showFocusSessionAlert(params: {
  taskTitle?: string;
}) {
  await webNotificationService.showNotification({
    title: '🎯 Focus Session',
    body: params.taskTitle || 'Start your focus session now',
    tag: 'focus-alert',
    requireInteraction: false,
    data: { type: 'focus-alert' },
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  return await webNotificationService.requestPermission();
}
