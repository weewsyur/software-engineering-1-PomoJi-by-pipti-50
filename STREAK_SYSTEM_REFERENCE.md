# Real-Time Streak System - Quick Reference

## 📋 File Locations & Purposes

| File | Purpose | Key Exports |
|------|---------|-------------|
| `firebase.config.ts` | Firebase initialization | `db`, `auth` |
| `utils/streakCalculator.ts` | Streak math & date logic | `calculateStreak()`, `getTodayAtMidnight()` |
| `utils/useStreakListener.ts` | Real-time Firestore hook | `useStreakListener()` |
| `utils/activityTracker.ts` | Activity logging functions | `logActivity()`, `initializeStreakData()` |
| `store/userStore.ts` | User auth state (persistent) | `setUserStore()`, `getUserStore()` |
| `app/components/StreakCard.tsx` | Streak display component | `StreakCard` |

---

## 🚀 Quick Start

### 1. For Users Signing Up

```typescript
import { initializeStreakData } from '@/utils/activityTracker';
import { setUserStore } from '@/store/userStore';

// After Firebase auth sign-up
await setUserStore({ userId, username, email, timezone: 'UTC' });
await initializeStreakData(userId, 'UTC');
```

### 2. When User Completes Activity

```typescript
import { logActivity } from '@/utils/activityTracker';

await logActivity(userId, 'Study Session', 3, 75, 'UTC');
// Streak updates automatically in Firestore
// Home screen updates instantly (real-time listener)
```

### 3. Display Streak on Home Screen

```typescript
import { useStreakListener } from '@/utils/useStreakListener';

const { streakData, loading, error } = useStreakListener(db, userId);

<StreakCard streakData={streakData} loading={loading} error={error} />
```

---

## 🧪 Testing Checklist

```
✓ Firebase project created
✓ Environment variables set (.env.local)
✓ Firestore security rules configured
✓ User can sign up
✓ initializeStreakData() runs on sign-up
✓ logActivity() successfully saves to Firestore
✓ Real-time listener shows instant updates
✓ Streak calculation is correct
✓ Different timezones handled correctly
✓ Error states display properly
```

---

## 🐛 Debugging Tips

### Check if Firestore is Updated
```typescript
// In Firebase Console
// Collections > users > {userId} > streakData > current
// Should see: currentStreak, lastActiveDate, highestStreak
```

### Check if Listener is Connected
```typescript
// Add to useStreakListener
useEffect(() => {
  console.log('📡 Listener subscribed:', userId);
  return () => console.log('🔌 Listener unsubscribed:', userId);
}, [userId]);
```

### Check Streak Calculation
```typescript
import { calculateStreak, getTodayAtMidnight } from '@/utils/streakCalculator';

const lastActive = new Date('2026-05-02');
const result = calculateStreak(lastActive, 5, 'UTC');
console.log('Calculated Streak:', result);
// Should show updated currentStreak based on logic
```

### Check Timezone Handling
```typescript
import { getTodayAtMidnight, isToday } from '@/utils/streakCalculator';

const today = getTodayAtMidnight('America/New_York');
console.log('Today at midnight (NY):', today);

const lastActive = new Date();
console.log('Is today?', isToday(lastActive, 'America/New_York'));
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot find module '@/firebase.config'"
**Solution:** Make sure `firebase.config.ts` is in root `PomoJI/` folder, not nested.

### Issue: Streak doesn't update after logActivity
**Check:**
1. User is authenticated (userId exists)
2. Firestore has `users/{userId}/streakData/current` document
3. Security rules allow write access
4. Network request succeeded (check Console)

### Issue: Firestore listener shows null/undefined
**Check:**
1. Document exists in Firestore
2. User is authenticated (`userId` is not null)
3. No Firestore errors in console
4. Loading state is correct

### Issue: Wrong streak count after day change
**Likely cause:** Timezone not matching user's actual timezone
**Solution:** 
```typescript
// Get user's timezone from device
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Store in userStore and pass to listeners
```

### Issue: Listener keeps subscribing/unsubscribing
**Likely cause:** `userId` prop changing on every render
**Solution:** Use `useMemo()` or ensure `userId` is stable reference

---

## 🔐 Security Notes

### Firestore Rules Template

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only users can read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Public leaderboard (optional)
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### Validation in Rules

```javascript
match /users/{userId}/streakData/{document} {
  allow write: if 
    request.data.currentStreak is int &&
    request.data.lastActiveDate is timestamp &&
    request.data.highestStreak is int &&
    request.auth.uid == userId;
}
```

---

## 📈 Scaling Considerations

### Database Indexes
As user count grows, add index for:
- `users/{userId}/activities: date (ascending)`
- `users/{userId}/activities: timestamp (descending)`

### Performance Optimization
- Use pagination for activity history
- Limit real-time listener to current streak only
- Archive old activities monthly

### Analytics
Track:
- Streak starts/resets
- Daily activity rates
- Average streak length
- Timezone distribution

---

## 🎯 Next Features to Build

1. **Streak History** - Show activity timeline
2. **Reminders** - Notify before streak resets
3. **Achievements** - Badges for milestones (7, 30, 100 days)
4. **Social** - Compare streaks with friends
5. **Analytics Dashboard** - Weekly/monthly stats

---

## 📞 Support

### If Something Breaks

1. Check [STREAK_SYSTEM_SETUP.md](STREAK_SYSTEM_SETUP.md) - detailed guide
2. Check Firestore Console for data
3. Check browser console for errors
4. Check network tab for failed requests
5. Review common issues above

---

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Status:** Production Ready ✅
