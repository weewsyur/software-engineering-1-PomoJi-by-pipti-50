/**
 * Route paths + pre-session config. ADAPT the ROUTES to your real Expo Router paths.
 */
export const ROUTES = {
  HOME: '/(tabs)/home',
  FOCUS: '/(tabs)/timer',     // Timer tab is also the Focus screen (holds Start)
  DASS: '/dass',              // app/dass.tsx
  BEFORE_SESSION: '/before-session', // app/before-session.tsx
  DASS_HISTORY: '/dass-history', // app/dass-history.tsx
  // NOTE: TIMER is the same screen as FOCUS. The checks are enforced at the
  // action level (Start button / auto-start param), not by a route guard,
  // because a redirect to FOCUS from TIMER would loop.
  TIMER: '/(tabs)/timer',
} as const;

/**
 * Bottom two values of the EXISTING after-session mood scale (MOOD_OPTIONS in
 * constants/mood.ts): 1 = Very Bad, 2 = Bad on a 1-5 scale.
 */
export const NEGATIVE_MOOD_VALUES: readonly number[] = [1, 2];

export const DISTRACTION_OPTIONS = [
  { id: 'noisy', label: 'Noisy place' },
  { id: 'phone', label: 'Phone / notifications nearby' },
  { id: 'hungry', label: 'Hungry' },
  { id: 'tired', label: 'Tired / not enough sleep' },
  { id: 'busy_mind', label: 'Too many things on my mind' },
  { id: 'academic_worry', label: 'Academic worry' },
  { id: 'other', label: 'Other' },
] as const;

export const OTHER_DISTRACTION_ID = 'other';
export const OTHER_TEXT_MAX = 60;

export const CAUSE_OPTIONS = [
  { id: 'academic', label: 'Schoolwork, exams, or deadlines' },
  { id: 'family', label: 'Family or home' },
  { id: 'friends', label: 'Friends or relationships' },
  { id: 'health', label: 'Health, sleep, or hunger' },
  { id: 'other', label: 'Something else' },
  { id: 'none', label: 'Nothing in particular' },
] as const;

export type CauseId = (typeof CAUSE_OPTIONS)[number]['id'];
