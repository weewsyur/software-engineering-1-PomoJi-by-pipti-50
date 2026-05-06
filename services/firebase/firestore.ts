// ─── services/firebase/firestore.ts ───────────────────────────────────────────
// Firestore service layer with real-time capabilities
// Provides functions for common Firestore operations

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
  Query,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

// Types
export interface Activity {
  id?: string;
  userId: string;
  type: 'pomodoro' | 'break' | 'focus';
  duration: number;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  tags?: string[];
}

export interface FirestoreStreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Timestamp;
  totalActivities: number;
}

// ─── REAL-TIME LISTENERS ─────────────────────────────────────────────────────

/**
 * Listen to a single document in real-time
 * @param collectionName - Collection path
 * @param docId - Document ID
 * @param callback - Callback function with (data, error)
 * @returns Unsubscribe function
 */
export const listenToDocument = (
  collectionName: string,
  docId: string,
  callback: (data: DocumentData | null, error: Error | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() }, null);
      } else {
        callback(null, null);
      }
    },
    (error) => {
      callback(null, error);
    }
  );
};

/**
 * Listen to a collection in real-time
 * @param collectionName - Collection path
 * @param callback - Callback function with (data, error)
 * @param queryFn - Optional query function to filter/sort
 * @returns Unsubscribe function
 */
export const listenToCollection = (
  collectionName: string,
  callback: (data: DocumentData[], error: Error | null) => void,
  queryFn?: (ref: any) => Query
): Unsubscribe => {
  const collectionRef = collection(db, collectionName);
  const q = queryFn ? queryFn(collectionRef) : collectionRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(data, null);
    },
    (error) => {
      callback([], error);
    }
  );
};

/**
 * Listen to user's streak data in real-time
 * @param userId - User ID
 * @param callback - Callback function with (streakData, error)
 * @returns Unsubscribe function
 */
export const listenToStreak = (
  userId: string,
  callback: (streakData: FirestoreStreakData | null, error: Error | null) => void
): Unsubscribe => {
  return listenToDocument('streaks', userId, (data, error) => {
    callback(data as FirestoreStreakData | null, error);
  });
};

/**
 * Listen to user's activities in real-time
 * @param userId - User ID
 * @param callback - Callback function with (activities, error)
 * @param limitCount - Optional limit on number of activities
 * @returns Unsubscribe function
 */
export const listenToUserActivities = (
  userId: string,
  callback: (activities: Activity[], error: Error | null) => void,
  limitCount: number = 50
): Unsubscribe => {
  return listenToCollection(
    'activities',
    (data, error) => {
      callback(data as Activity[], error);
    },
    (ref) =>
      query(
        ref,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
  );
};

// ─── WRITE OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Create or update a document with server timestamp
 * @param collectionName - Collection path
 * @param docId - Document ID (optional for auto-generated)
 * @param data - Document data
 * @returns Promise with document reference
 */
export const saveDocument = async (
  collectionName: string,
  data: DocumentData,
  docId?: string
) => {
  const dataWithTimestamp = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (docId) {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, dataWithTimestamp, { merge: true });
    return docRef;
  } else {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...dataWithTimestamp,
      createdAt: serverTimestamp(),
    });
    return docRef;
  }
};

/**
 * Save an activity to Firestore
 * @param activity - Activity data
 * @returns Promise with document reference
 */
export const saveActivity = async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
  return saveDocument('activities', {
    ...activity,
    createdAt: serverTimestamp(),
  });
};

/**
 * Update streak data
 * @param userId - User ID
 * @param streakData - Streak data to update
 * @returns Promise
 */
export const updateStreak = async (userId: string, streakData: Partial<FirestoreStreakData>) => {
  const docRef = doc(db, 'streaks', userId);
  await updateDoc(docRef, {
    ...streakData,
    updatedAt: serverTimestamp(),
  });
  return docRef;
};

/**
 * Initialize streak for new user
 * @param userId - User ID
 * @returns Promise
 */
export const initializeStreak = async (userId: string) => {
  const streakData: FirestoreStreakData = {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: serverTimestamp() as any,
    totalActivities: 0,
  };
  return saveDocument('streaks', streakData, userId);
};

// ─── READ OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Get a single document
 * @param collectionName - Collection path
 * @param docId - Document ID
 * @returns Promise with document data
 */
export const getDocument = async (
  collectionName: string,
  docId: string
): Promise<DocumentData | null> => {
  const docRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
};

/**
 * Get user's streak data
 * @param userId - User ID
 * @returns Promise with streak data
 */
export const getStreak = async (userId: string): Promise<FirestoreStreakData | null> => {
  return getDocument('streaks', userId) as Promise<FirestoreStreakData | null>;
};

/**
 * Get user's activities
 * @param userId - User ID
 * @param limitCount - Optional limit
 * @returns Promise with activities array
 */
export const getUserActivities = async (
  userId: string,
  limitCount: number = 50
): Promise<Activity[]> => {
  const collectionRef = collection(db, 'activities');
  const q = query(
    collectionRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Activity[];
};

// ─── DELETE OPERATIONS ───────────────────────────────────────────────────────

/**
 * Delete a document
 * @param collectionName - Collection path
 * @param docId - Document ID
 * @returns Promise
 */
export const deleteDocument = async (collectionName: string, docId: string) => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};
