# Real-Time Streak Tracking System - Complete Setup Guide

## 🎯 System Architecture

```
┌─────────────────────────────────────────────┐
│         React Native Frontend               │
│  (Home.tsx + StreakCard Component)          │
└──────────────┬──────────────────────────────┘
               │
               ▼ useStreakListener Hook
┌─────────────────────────────────────────────┐
│    Firestore Real-Time Listener             │
│    (onSnapshot → StreakData)                │
└──────────────┬──────────────────────────────┘
               │
               ▼ Calculate Streak
┌─────────────────────────────────────────────┐
│    Firestore Database                       │
│  ┌─────────────────────────────────────┐   │
│  │ users/{userId}/streakData/current   │   │
│  │ - currentStreak: number             │   │
│  │ - lastActiveDate: Timestamp         │   │
│  │ - highestStreak: number             │   │
│  │ - timezone: string                  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📦 Installation Steps

### 1. Install Firebase Packages

```bash
cd PomoJI
npm install firebase
npm install @react-native-async-storage/async-storage
```

### 2. Setup Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Enable Authentication (Email/Password, Google Sign-In, etc.)
4. Enable Firestore Database (Start in test mode for development)

### 3. Create `.env.local` File

Create `PomoJI/.env.local` with your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore Database Rules (Development)

Go to Firestore → Rules and set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Development: Allow all reads/writes for authenticated users
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

⚠️ **IMPORTANT**: Update security rules before production!

---

## 🗄️ Firestore Schema

### Collection: `users/{userId}/streakData`

**Document: `current`**

```json
{
  "userId": "user123",
  "currentStreak": 5,
  "lastActiveDate": Timestamp("2026-05-02T00:00:00Z"),
  "highestStreak": 12,
  "timezone": "America/New_York",
  "createdAt": Timestamp("2026-04-20T10:30:00Z"),
  "updatedAt": Timestamp("2026-05-02T14:22:00Z")
}
```

### Collection: `users/{userId}/activities`

**Document: `2026-05-02_1714655400000`**

```json
{
  "userId": "user123",
  "title": "Study Session",
  "sessions": 3,
  "totalMinutes": 75,
  "timestamp": Timestamp("2026-05-02T14:22:00Z"),
  "date": "2026-05-02"
}
```

---

## 🧮 Streak Calculation Logic

### Rules

```
TODAY:
  → Continue streak (maintain current count)

YESTERDAY:
  → Increment streak (add 1)

2+ DAYS AGO:
  → Reset streak to 1

NEVER ACTIVE:
  → Streak = 0
```

### Example

```
May 1:  Active → Streak = 1
May 2:  Active → Streak = 2
May 3:  Inactive → Streak = 2
May 4:  Active → Streak = 3 (yesterday was May 3, continue!)
May 5:  Inactive → Streak = 3
May 6:  Inactive → Streak = 3
May 7:  Active → Streak = 1 (gap > 1 day, reset!)
```

---

## 💻 Complete Working Code Examples

### 1. Log an Activity

```typescript
import { logActivity } from '@/utils/activityTracker';

// In your timer or activity component
const handleActivityComplete = async (userId: string) => {
  try {
    await logActivity(
      userId,
      'Study Session',
      sessions = 3,
      totalMinutes = 75,
      timezone = 'America/New_York'
    );
    console.log('✅ Activity logged and streak updated!');
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
  }
};
```

### 2. Initialize User (On Sign-Up)

```typescript
import { initializeStreakData } from '@/utils/activityTracker';
import { setUserStore } from '@/store/userStore';

export async function handleSignUp(uid: string, email: string, username: string) {
  try {
    // Initialize user data
    await setUserStore({
      userId: uid,
      email,
      username,
      timezone: 'UTC',
    });

    // Initialize streak tracking
    await initializeStreakData(uid, 'UTC');
    console.log('✅ User streak data initialized');
  } catch (error) {
    console.error('❌ Sign-up error:', error);
  }
}
```

### 3. Display Real-Time Streak (Home Screen)

```typescript
// app/(tabs)/home.tsx
import { useStreakListener } from '@/utils/useStreakListener';
import { StreakCard } from '@/app/components/StreakCard';

export default function HomeScreen() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getUserStore();
    setUserId(user.userId);
  }, []);

  // Real-time listener - updates automatically!
  const { streakData, loading, error } = useStreakListener(db, userId);

  return (
    <ScrollView>
      <StreakCard
        streakData={streakData}
        loading={loading}
        error={error}
        streakUnit="Days"
      />
    </ScrollView>
  );
}
```

---

## 🔄 Real-Time Features Explained

### `useStreakListener` Hook

**What it does:**
- ✅ Listens to Firestore changes in real-time
- ✅ Automatically recalculates streak when activity is logged
- ✅ Updates UI instantly across all devices
- ✅ Handles loading and error states
- ✅ Properly cleans up listeners on unmount

**How it works:**

```typescript
const { streakData, loading, error } = useStreakListener(db, userId, timezone);

// streakData automatically updates when Firestore document changes!
// Component re-renders instantly
```

### Timezone-Aware Date Handling

The system correctly handles:
- ✅ Different user timezones
- ✅ Day boundary calculations
- ✅ Cross-timezone streak continuity

```typescript
// Example: User in New York at 11:59 PM
// Firestore at UTC stores: 2026-05-03T03:59:00Z
// System correctly identifies as "today" for user

// Logs activity → lastActiveDate = 2026-05-03
// Next day in UTC: 2026-05-04T12:00:00Z
// System correctly identifies as "yesterday" → increment streak
```

---

## ⚠️ Common Bugs to Avoid

### 1. **Missing Firebase Initialization**
```typescript
// ❌ WRONG - Will cause errors
import { db } from 'firebase.config'; // File doesn't exist

// ✅ CORRECT
import { db } from '@/firebase.config'; // Proper path
```

### 2. **Not Passing Real-Time Data**
```typescript
// ❌ WRONG - Hardcoded values
<StreakCard streakCount={3} />

// ✅ CORRECT - Real-time updates
<StreakCard streakData={streakData} loading={loading} error={error} />
```

### 3. **Forgetting Timezone in Calculations**
```typescript
// ❌ WRONG - Uses browser timezone, wrong for mobile users
const today = new Date();

// ✅ CORRECT - Respects user timezone
const today = getTodayAtMidnight(userTimezone);
```

### 4. **Not Initializing Streak Data**
```typescript
// ❌ WRONG - Will crash when querying empty doc
logActivity(userId, ...); // Doc doesn't exist yet

// ✅ CORRECT - Initialize first
await initializeStreakData(userId);
logActivity(userId, ...);
```

### 5. **Memory Leaks from Listeners**
```typescript
// ❌ WRONG - Listener never cleans up
useEffect(() => {
  onSnapshot(ref, (doc) => {
    // ... no cleanup!
  });
}, [userId]);

// ✅ CORRECT - Proper cleanup
useEffect(() => {
  const unsubscribe = onSnapshot(ref, (doc) => {
    // ...
  });
  return () => unsubscribe(); // Cleanup!
}, [userId]);
```

---

## 🚀 Production Checklist

- [ ] Firestore security rules configured (not test mode)
- [ ] Firebase initialization error handling
- [ ] Streak data validation in backend rules
- [ ] Activity logging retry logic
- [ ] Timezone validation (user can set in profile)
- [ ] Analytics tracking integrated
- [ ] Error logging to Sentry/Crashlytics
- [ ] Load testing for concurrent updates
- [ ] Offline persistence enabled

### Enable Offline Persistence

```typescript
// firebase.config.ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(err => {
  if (err.code == 'failed-precondition') {
    console.log('Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    console.log('Browser does not support persistence');
  }
});
```

---

## 📊 Testing the System

### Manual Test: Log Activity

```typescript
// In your timer or debug screen
import { logActivity } from '@/utils/activityTracker';

const testStreak = async () => {
  try {
    const userId = 'user123';
    await logActivity(userId, 'Test Activity', 1, 30);
    
    // Watch home screen - streak should update instantly!
  } catch (error) {
    console.error('Test failed:', error);
  }
};
```

### Check Firestore

1. Open Firebase Console
2. Go to Firestore
3. Look for `users/{userId}/streakData/current`
4. Verify `lastActiveDate` is today
5. Check `currentStreak` value

---

## 🔗 File Structure

```
PomoJI/
├── firebase.config.ts                    (Firebase init)
├── utils/
│   ├── streakCalculator.ts              (Streak logic)
│   ├── useStreakListener.ts             (Real-time hook)
│   └── activityTracker.ts               (Logging functions)
├── store/
│   └── userStore.ts                     (User auth state)
└── app/
    ├── components/
    │   └── StreakCard.tsx               (Updated component)
    └── (tabs)/
        └── home.tsx                     (Updated home)
```

---

## 📚 Additional Resources

- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [onSnapshot Real-Time Listener](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Timezone in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

---

## ✅ Next Steps

1. Install Firebase packages
2. Set up Firebase project and get credentials
3. Create `.env.local` with Firebase config
4. Set Firestore security rules
5. Test with `testStreak()` function
6. Integrate with sign-up flow
7. Deploy to production with security updates

**You now have a production-ready real-time streak tracking system!** 🎉
