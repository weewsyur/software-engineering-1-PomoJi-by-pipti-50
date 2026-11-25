const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const webpush = require('web-push');

initializeApp();
const db = getFirestore();

const TITLE = 'Rest time is over';
const BODY = 'Your rest time is over. How are you feeling now? Tap to check in.';

function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureWebPush() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
}

async function sendExpoPushes(uid, payload) {
  const snap = await db.collection('users').doc(uid).collection('push_tokens').get();
  const messages = snap.docs
    .map((docSnap) => docSnap.data()?.token)
    .filter(Boolean)
    .map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'rest',
      data: payload.data,
    }));
  if (messages.length === 0) return 0;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo push failed with status ${response.status}`);
  }
  return messages.length;
}

async function sendWebPushes(uid, payload) {
  if (!configureWebPush()) return 0;
  const snap = await db.collection('users').doc(uid).collection('push_subscriptions').get();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    requireInteraction: true,
    data: payload.data,
  });
  let sent = 0;
  await Promise.all(
    snap.docs.map(async (docSnap) => {
      const subscription = docSnap.data();
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          body,
          { TTL: 60 * 60 },
        );
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await docSnap.ref.delete().catch(() => null);
        } else {
          console.warn('[rest-push] web push failed:', error.message);
        }
      }
    }),
  );
  return sent;
}

exports.sendRestCheckinNotifications = onSchedule('every 1 minutes', async () => {
  const now = Timestamp.now();
  const snap = await db
    .collectionGroup('rest_periods')
    .where('rest_end_time', '<=', now)
    .limit(200)
    .get();

  for (const docSnap of snap.docs) {
    const rest = docSnap.data();
    if (rest.notified_at) continue;
    const uid = docSnap.ref.parent.parent?.id;
    if (!uid) continue;

    const payload = {
      title: TITLE,
      body: BODY,
      tag: 'pomoji-rest-checkin',
      requireInteraction: true,
      data: {
        type: 'rest_checkin',
        url: '/rest',
        rest_id: rest.rest_id || '',
      },
    };

    let expoSent = 0;
    let webSent = 0;
    try {
      expoSent = await sendExpoPushes(uid, payload);
      webSent = await sendWebPushes(uid, payload);
    } catch (error) {
      console.error('[rest-push] notification send failed:', error);
    }

    await docSnap.ref.set(
      {
        notified_at: Timestamp.now(),
        notification_counts: { expo: expoSent, web: webSent },
      },
      { merge: true },
    );
  }
});
