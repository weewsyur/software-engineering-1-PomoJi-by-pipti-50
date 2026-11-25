import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sub_${hash.toString(16)}`;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function registerNativePushToken(uid: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return false;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  if (!token?.data) return false;

  await setDoc(doc(db, 'users', uid, 'push_tokens', token.data), {
    token: token.data,
    platform: Platform.OS,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return true;
}

async function registerWebPushSubscription(uid: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidKey) as BufferSource,
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await setDoc(doc(db, 'users', uid, 'push_subscriptions', hashString(json.endpoint)), {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return true;
}

/** Best-effort backup push registration after notification permission is granted. */
export async function registerRestPushChannels(uid: string): Promise<void> {
  if (Platform.OS === 'web') {
    await registerWebPushSubscription(uid);
    return;
  }
  await registerNativePushToken(uid);
}
