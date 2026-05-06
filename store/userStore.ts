// ─── userStore.ts ─────────────────────────────────────────────────────────────
// User data store with Firebase integration
// Persists user authentication and profile data

import { auth } from '@/services/firebase';
import { User, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserStore {
  userId: string | null;
  username: string;
  email: string;
  timezone: string;
  firebaseUser: User | null;
}

const DEFAULT_STORE: UserStore = {
  userId: null,
  username: '',
  email: '',
  timezone: 'UTC',
  firebaseUser: null,
};

let store: UserStore = { ...DEFAULT_STORE };

/**
 * Initialize store from Firebase auth state
 */
export async function initializeUserStore(): Promise<UserStore> {
  try {
    const savedUser = await AsyncStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      store = { ...store, ...parsed };
    }
    return { ...store };
  } catch (error) {
    console.error('Error initializing user store:', error);
    return { ...store };
  }
}

/**
 * Set user store data and persist to AsyncStorage
 */
export async function setUserStore(data: Partial<UserStore>): Promise<void> {
  Object.assign(store, data);
  
  try {
    const dataToStore = {
      userId: store.userId,
      username: store.username,
      email: store.email,
      timezone: store.timezone,
    };
    await AsyncStorage.setItem('user', JSON.stringify(dataToStore));
  } catch (error) {
    console.error('Error saving user store:', error);
  }
}

/**
 * Get current user store
 */
export function getUserStore(): UserStore {
  return { ...store };
}

/**
 * Set Firebase user object
 */
export function setFirebaseUser(user: User | null): void {
  store.firebaseUser = user;
  if (user) {
    store.userId = user.uid;
    store.email = user.email || '';
  } else {
    store.userId = null;
  }
}

/**
 * Sign out and clear store
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    store = { ...DEFAULT_STORE };
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}