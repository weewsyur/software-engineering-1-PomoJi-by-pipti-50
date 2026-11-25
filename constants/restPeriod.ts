export const REST_DURATION_OPTIONS = [
  {
    minutes: 60,
    title: 'A short calm break',
    description: 'A gentle reset when you need a moment to settle before trying again.',
  },
  {
    minutes: 120,
    title: 'A gentle cool-down',
    description: 'More time for your mind and body to move out of a stressed state.',
  },
  {
    minutes: 180,
    title: 'A longer recovery rest',
    description: 'Useful when emotions feel intense or keep pulling your attention.',
  },
  {
    minutes: 240,
    title: 'A substantial rest',
    description: 'Choose this when you need real distance before checking in again.',
  },
] as const;

export type RestDurationMinutes = (typeof REST_DURATION_OPTIONS)[number]['minutes'];

export const REST_DURATIONS = REST_DURATION_OPTIONS.map((option) => option.minutes);
