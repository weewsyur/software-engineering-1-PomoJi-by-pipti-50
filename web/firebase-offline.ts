import { Firestore, enableIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

let isOfflinePersistenceEnabled = false;

export async function enableFirestoreOfflinePersistence(db: Firestore) {
  if (isOfflinePersistenceEnabled) {
    console.warn('Firestore offline persistence already enabled');
    return;
  }

  if (typeof window === 'undefined') {
    console.warn('IndexedDB not available (Server-side rendering)');
    return;
  }

  try {
    await enableIndexedDbPersistence(db);
    isOfflinePersistenceEnabled = true;
    console.log('✓ Firestore offline persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, offline persistence disabled');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support offline persistence');
    } else {
      console.error('Firestore offline persistence error:', err);
    }
  }
}

export function getOfflinePersistenceStatus(): boolean {
  return isOfflinePersistenceEnabled;
}

// Configure Firestore settings for optimal offline behavior
export const FIRESTORE_SETTINGS = {
  cacheSizeBytes: 40 * 1024 * 1024, // 40 MB cache
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true,
};

export async function initializeOfflineFirestore(
  app: FirebaseApp,
  projectId: string
): Promise<Firestore> {
  if (typeof window === 'undefined') {
    throw new Error('Firestore offline initialization requires browser environment');
  }

  const db = initializeFirestore(app, FIRESTORE_SETTINGS);
  await enableFirestoreOfflinePersistence(db);

  return db;
}
