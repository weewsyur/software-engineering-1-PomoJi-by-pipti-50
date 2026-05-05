# Firebase Integration Guide for React Native (Expo)

## Recommended Setup

**Framework:** Expo (already configured in your project)
**SDK Choice:** Firebase JS SDK (modular) - `firebase` package

### Why Firebase JS SDK for Expo?

- **Expo Go Compatibility:** Works without native builds
- **Web Support:** Same code works on web platform
- **Simpler Setup:** No native module configuration needed
- **TypeScript Support:** Full type safety with modular SDK

**Note:** If you need native features (push notifications, crashlytics), use `@react-native-firebase` with a development build.

---

## Installation Commands

Your project already has Firebase installed (`firebase@^12.12.1`). No additional installation needed.

If starting fresh:

```bash
npm install firebase
# or
yarn add firebase
```

---

## Firebase Config File

**Location:** `firebase.config.ts`

```typescript
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAvJ3HwJe_TkNYYjfjAREhRve8oLa7v1Zs',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'software-engineering1-pomoji.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'software-engineering1-pomoji',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'software-engineering1-pomoji.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '544871394102',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:544871394102:web:603e8becd54276639ca197',
};

// Singleton pattern - prevents multiple initializations
const initializeFirebase = (): { app: FirebaseApp; auth: Auth; db: Firestore } => {
  if (getApps().length > 0) {
    const app = getApp();
    return { app, auth: getAuth(app), db: getFirestore(app) };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
};

let firebaseInstance: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export const getFirebase = () => {
  if (!firebaseInstance) {
    firebaseInstance = initializeFirebase();
  }
  return firebaseInstance;
};

export const { app, auth, db } = getFirebase();
export default app;
```

---

## Firestore Real-Time Example (onSnapshot)

**Location:** `services/firebase/firestore.ts`

```typescript
import { onSnapshot, doc, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase.config';

// Listen to a single document
export const listenToDocument = (
  collectionName: string,
  docId: string,
  callback: (data: any, error: Error | null) => void
) => {
  const docRef = doc(db, collectionName, docId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() }, null);
    } else {
      callback(null, null);
    }
  }, (error) => {
    callback(null, error);
  });
};

// Listen to a collection with query
export const listenToCollection = (
  collectionName: string,
  callback: (data: any[], error: Error | null) => void,
  queryFn?: (ref: any) => any
) => {
  const collectionRef = collection(db, collectionName);
  const q = queryFn ? queryFn(collectionRef) : collectionRef;
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data, null);
  }, (error) => {
    callback([], error);
  });
};
```

---

## React Native Usage Example

**Location:** `hooks/useFirestore.ts`

```typescript
import { useState, useEffect } from 'react';
import { listenToDocument } from '../services/firebase/firestore';

export const useDocument = <T = any>(collectionName: string, docId: string | null) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    const unsubscribe = listenToDocument(collectionName, docId, (fetchedData, err) => {
      if (err) {
        setError(err);
      } else {
        setData(fetchedData as T);
        setError(null);
      }
      setLoading(false);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
};
```

**Usage in Component:**

```typescript
import { useDocument } from '@/hooks/useFirestore';

const MyComponent = () => {
  const { data, loading, error } = useDocument<StreakData>('streaks', 'user-123');

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return <Text>Streak: {data?.currentStreak}</Text>;
};
```

---

## Best Practices

### 1. Use `serverTimestamp()` for Server-Side Time

```typescript
import { serverTimestamp } from 'firebase/firestore';

await setDoc(docRef, {
  createdAt: serverTimestamp(),  // Server time, not device time
  updatedAt: serverTimestamp(),
});
```

### 2. Handle App Reloads with Singleton Pattern

```typescript
// Always check if Firebase is already initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}
```

### 3. Avoid Multiple Initializations

```typescript
// ❌ BAD - initializes on every import
import { initializeApp } from 'firebase/app';
const app = initializeApp(config);

// ✅ GOOD - singleton pattern
let app: FirebaseApp | null = null;
export const getAppInstance = () => {
  if (!app) app = initializeApp(config);
  return app;
};
```

### 4. Clean Up Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    // handle updates
  });

  // Always return cleanup function
  return () => unsubscribe();
}, []);
```

### 5. Structure Folders

```
PomoJI/
├── firebase.config.ts          # Firebase initialization
├── services/
│   └── firebase/
│       └── firestore.ts        # Firestore operations
├── hooks/
│   └── useFirestore.ts         # React hooks for Firestore
└── app/
    └── components/
        └── RealTimeStreakCard.tsx  # Example component
```

### 6. Use Environment Variables

Create `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Note:** Variables must start with `EXPO_PUBLIC_` to be accessible in React Native.

---

## Common Errors + Fixes

### Error 1: Firebase Not Initializing

**Symptom:** `Firebase: No Firebase App '[DEFAULT]' has been created`

**Cause:** Calling Firebase functions before initialization or multiple initializations

**Fix:**
```typescript
// ✅ Initialize before using
import { getApps, initializeApp } from 'firebase/app';

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}
```

### Error 2: Firestore Not Working in React Native

**Symptom:** Network errors or timeouts

**Cause:** Using native SDK (`@react-native-firebase`) with Expo Go

**Fix:** Use Firebase JS SDK (`firebase` package) for Expo Go:

```bash
npm install firebase  # ✅ Correct for Expo Go
# NOT: npm install @react-native-firebase/app  # ❌ Requires dev build
```

### Error 3: Incorrect Imports (Web vs Native SDK)

**Symptom:** Type errors or runtime crashes

**Cause:** Mixing SDK import styles

**Fix:** Use modular SDK imports consistently:

```typescript
// ✅ Correct - modular SDK
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ❌ Incorrect - compat/namespaced
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
```

### Error 4: Missing Async Handling

**Symptom:** Data not updating or errors not caught

**Cause:** Not awaiting async operations

**Fix:**
```typescript
// ✅ Correct
const saveActivity = async () => {
  try {
    await addDoc(collection(db, 'activities'), data);
    console.log('Saved!');
  } catch (error) {
    console.error('Error:', error);
  }
};

// ❌ Incorrect - no error handling
const saveActivity = () => {
  addDoc(collection(db, 'activities'), data);
};
```

### Error 5: Memory Leaks from Unsubscribed Listeners

**Symptom:** Performance degradation, multiple updates

**Cause:** Not cleaning up `onSnapshot` listeners

**Fix:**
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    setData(snapshot.data());
  });

  return () => unsubscribe();  // ✅ Always cleanup
}, [docId]);
```

### Error 6: Environment Variables Not Loading

**Symptom:** `process.env.EXPO_PUBLIC_*` is undefined

**Cause:** Missing `EXPO_PUBLIC_` prefix or not restarting dev server

**Fix:**
```env
# ✅ Correct - has EXPO_PUBLIC_ prefix
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...

# ❌ Incorrect - missing prefix
FIREBASE_API_KEY=AIzaSy...
```

**Important:** Restart dev server after adding `.env.local`:
```bash
# Stop server (Ctrl+C)
npm start
```

### Error 7: Timestamp Conversion Issues

**Symptom:** Timestamp objects not displaying correctly

**Cause:** Firestore Timestamps are not JavaScript Dates

**Fix:**
```typescript
// ✅ Convert to Date
const date = timestamp.toDate();
const millis = timestamp.toMillis();

// ❌ Direct usage won't work
console.log(timestamp.seconds);  // Not a real date
```

---

## Quick Start Checklist

- [x] Firebase package installed (`firebase@^12.12.1`)
- [x] Config file created (`firebase.config.ts`)
- [x] Firestore service layer created (`services/firebase/firestore.ts`)
- [x] React hooks created (`hooks/useFirestore.ts`)
- [x] Example component created (`RealTimeStreakCard.tsx`)
- [ ] Add `.env.local` with Firebase credentials (optional - defaults in config)
- [ ] Test real-time updates in your app
- [ ] Set up Firestore security rules in Firebase Console

---

## Testing Real-Time Updates

1. Start your Expo app:
```bash
npm start
```

2. Use the `RealTimeStreakCard` component:
```typescript
import { RealTimeStreakCard } from '@/components/RealTimeStreakCard';

<RealTimeStreakCard userId="test-user-123" />
```

3. Update data in Firebase Console or another device
4. Watch the component update automatically

---

## Next Steps

1. **Authentication:** Add Firebase Auth for user login
2. **Security Rules:** Configure Firestore rules in Firebase Console
3. **Offline Support:** Enable offline persistence with `enableIndexedDbPersistence()`
4. **Analytics:** Add Firebase Analytics for tracking
5. **Push Notifications:** Use `@react-native-firebase/messaging` with dev build

---

## Additional Resources

- [Firebase Modular SDK Docs](https://firebase.google.com/docs/web/modular-sdk)
- [Firestore Real-time Updates](https://firebase.google.com/docs/firestore/query-data/listen)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [React Native Firebase](https://rnfirebase.io/) (for native features)
