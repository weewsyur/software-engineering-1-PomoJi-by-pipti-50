import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import WarningModal from '@/components/WarningModal';
import { ROUTES } from '@/constants/sessionFlow';

function isRestNotification(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'rest_checkin';
}

export default function RestNotificationListener() {
  const router = useRouter();
  const [promptVisible, setPromptVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const showPrompt = () => setPromptVisible(true);
      window.addEventListener('pomoji:rest-checkin', showPrompt);
      return () => window.removeEventListener('pomoji:rest-checkin', showPrompt);
    }

    const received = Notifications.addNotificationReceivedListener((notification) => {
      if (isRestNotification(notification.request.content.data)) {
        setPromptVisible(true);
      }
    });
    const response = Notifications.addNotificationResponseReceivedListener((notificationResponse) => {
      if (isRestNotification(notificationResponse.notification.request.content.data)) {
        router.push(ROUTES.REST);
      }
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [router]);

  return (
    <WarningModal
      visible={promptVisible}
      title="Rest time is over"
      message="How are you feeling now?"
      primaryLabel="Check in"
      onPrimary={() => {
        setPromptVisible(false);
        router.push(ROUTES.REST);
      }}
      secondaryLabel="Later"
      onSecondary={() => setPromptVisible(false)}
    />
  );
}
