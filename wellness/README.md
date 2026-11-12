# PomoJI Wellness Features (standalone)

Nothing here modifies or imports into your app. Copy the folder in and wire it up manually.

## Files

| File | Purpose |
|---|---|
| `types/wellness.ts` | Types, `MOOD_OPTIONS`, default config, and `DEFAULT_FIELD_MAP` (**your session field names go here**) |
| `utils/wellnessScore.ts` | Pure score maths, session normalisation, status bands |
| `utils/moodCheckIn.ts` | Work-only prompt check, duplicate-prompt guard, transactional Firestore write |
| `utils/counselingTrigger.ts` | Threshold/cooldown logic and dismissal stores |
| `hooks/useMoodCheckIn.ts` | Modal state + safe `requestMoodCheckIn()` |
| `hooks/useWellnessScore.ts` | Live Firestore subscription returning `WellnessScoreState` |
| `hooks/useCounselingTrigger.ts` | Visibility + dismissal cooldown |
| `components/MoodCheckInModal.tsx` | "How are you feeling?" modal (Lucide icons, no emoji) |
| `components/WellnessScoreCard.tsx` | Score card (matches your mock-up) with loading / empty / error states |
| `components/CounselingSmartTrigger.tsx` | Prominent counseling prompt below a threshold |
| `index.ts` | Optional barrel export |

## Dependencies (all should already exist in PomoJI)

`react`, `react-native`, `firebase` (modular v9+ API), `lucide-react-native` (+ its peer `react-native-svg`).
No new packages. `@react-native-async-storage/async-storage` is optional (see Feature 3).

## Assumptions about existing sessions (verify and adjust `fieldMap`)

Path: `users/{userId}/sessions/{sessionId}`. Defaults:

- `type`: `"work"` | `"shortBreak"` | `"longBreak"` (matching ignores case, spaces, `_`, `-`; `focus` / `pomodoro` also count as work)
- `completed` (boolean) **or** `status` (`"completed"`), otherwise a valid `completedAt` counts as completed
- `completedAt`: Firestore Timestamp, set when the session finishes
- Break sessions are saved as their own session docs (that is how break compliance is measured)

If any differ, pass a custom `fieldMap` (shape `SessionFieldMap`) to the hooks, or edit `DEFAULT_FIELD_MAP`.

## Integration steps

### 1. Mood check-in
```tsx
import { db, auth } from '<your existing firebase module>';
import { useMoodCheckIn } from '<path>/generated-wellness-features';
import { MoodCheckInModal } from '<path>/generated-wellness-features';

const mood = useMoodCheckIn({ firestore: db, userId: auth.currentUser?.uid });

// In your timer-completion handler, AFTER the session doc has been saved:
mood.requestMoodCheckIn(savedSessionId, sessionType); // safe to call repeatedly; ignores breaks

// Render once on the timer screen:
<MoodCheckInModal
  visible={mood.visible}
  saving={mood.saving}
  errorMessage={mood.error}
  onSelect={mood.submit}
  onSkip={mood.skip}
/>
```
The completed session's Firestore doc must already exist when the user picks a mood (the write refuses to create documents).

### 2. Wellness score card
```tsx
const wellness = useWellnessScore({ firestore: db, userId: auth.currentUser?.uid });
<WellnessScoreCard state={wellness} onPressDashboard={() => navigation.navigate('<your route>')} />
```
Place it next to the Streak Card. It updates live via `onSnapshot`.

### 3. Counseling smart trigger
```tsx
<CounselingSmartTrigger
  score={wellness.result?.score ?? null}
  threshold={40}
  onOpenCounseling={() => navigation.navigate('<your counseling route>')}
/>
```
Optional persistence across app restarts:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
const store = createAsyncStorageDismissalStore(AsyncStorage);
<CounselingSmartTrigger store={store} ... />
```
Default store is in-memory (cooldown lasts until the app is closed). Default cooldown is 24 h.

## How scoring works

`score = mood*0.40 + breakCompliance*0.30 + sessionFrequency*0.30`, each factor 0-100, window = last **7 calendar days including today**.

- **Mood** = `(average rating of work sessions with a valid 1-5 rating / 5) * 100`. Skipped or missing moods are **excluded, never counted as 0**.
- **Break compliance** = `min(completed breaks, expected) / expected * 100`, where expected = completed work sessions (one break owed per work session). Work sessions finished in the last 30 minutes are not yet counted (grace).
- **Session frequency** = per-day work-session counts capped at **3/day**, summed, divided by `3 * 7`. Extra sessions never raise the score, so heavy study volume is not rewarded.
- If a factor cannot be measured, its weight is redistributed proportionally to the others. With all three present the result is exactly the formula above.
- No completed work sessions in the window → empty state (no score), not a score of 0.
- Final value is rounded and clamped to 0-100. Bands: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Needs Attention.

All defaults are overridable via the `config` option (`periodDays`, `dailySessionTarget`, `breakGraceMinutes`, `weights`).

> The mock-up shows a "Balanced" pill; this implementation uses the four labels from your spec. Change `STATUS_STYLE` in `WellnessScoreCard.tsx` if you prefer otherwise.

## Firestore

- **Fields added to the session doc:** `moodRating` (1-5), `moodLabel`, `moodRecordedAt` (server timestamp). Skipping writes nothing.
- **Indexes:** none. The score query is a single-field range on `completedAt` (auto-indexed).
- **Security rules:** users must be able to `update` their own session docs, and the update should be limited to these fields if you validate field-level, e.g.
  ```
  match /users/{uid}/sessions/{sid} {
    allow read: if request.auth.uid == uid;
    allow update: if request.auth.uid == uid
      && request.resource.data.moodRating in [1,2,3,4,5];
  }
  ```
  Merge this with your existing rules rather than replacing them. The mood write uses a transaction (read + update), so `read` is also required.

## Safety / UX notes

- The counseling prompt never diagnoses; copy describes the score only as a productivity/wellness indicator.
- It shows only when `score < threshold` (strictly), is dismissible, and stays quiet for the cooldown after dismissal or tap-through.
- Consider also showing crisis-resource information in your counseling screen; this folder does not handle emergencies.

## Known limitations

- The score is computed when Firestore pushes a snapshot; it does not recompute at midnight on its own (it refreshes on the next session change or remount).
- Break compliance assumes one break per work session and that breaks are stored as session docs.
- `moodLabel` / `moodRecordedAt` field names are fixed; only `moodRating` is remappable.
