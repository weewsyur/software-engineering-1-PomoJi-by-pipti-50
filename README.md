# PomoJI

PomoJI is a productivity-focused mobile app designed to help people build deep focus, keep up with tasks, and track progress over time. Built with Expo and React Native, it combines a Pomodoro timer, structured task management, reminders, and productivity insights into one streamlined experience.

## Why this app

The app is built for students, freelancers, and professionals who want to:

- stay focused during work and study sessions
- break large tasks into actionable segments
- avoid distraction with focus-mode protection
- monitor streaks and session history
- stay motivated with progress tracking and activity updates

## Core features

- Pomodoro timer with focus, short break, and long break modes
- Task categories and task selection inside focus sessions
- Notification reminders and session completion alerts
- Daily streak and activity tracking
- Analytics dashboard for productivity overview
- Social/progress feed and profile experience
- Firebase-powered authentication and data persistence
- Mobile and web support through Expo

## Tech stack

- Expo / React Native
- TypeScript
- Firebase Authentication + Firestore
- Expo Notifications
- Zustand for app state
- NativeWind / Tailwind styling
- Expo Router

## Project structure

```bash
PomoJI/
├── app/                  # app screens and routes
│   ├── (auth)/           # sign in / sign up / welcome flow
│   ├── (tabs)/           # home, timer, analytics, profile screens
│   └── components/       # reusable UI pieces
├── hooks/                # custom hooks for timer, tasks, reminders, notifications
├── services/             # Firebase and notification services
├── store/                # application state stores
├── utils/                # helpers and productivity logic
├── assets/               # app images and branding assets
├── app.json              # Expo app config
├── .env.example          # Firebase environment template
├── package.json          # scripts and dependencies
├── README.md             # project overview and setup guide
└── firebase.config.ts    # Firebase configuration entry
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example env file and add your Firebase values:

```bash
copy .env.example .env.local
```

Then fill in the Firebase values in `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run the app

```bash
npx expo start
```

From the Expo terminal, you can run the app in:

- Expo Go on a mobile device
- an Android emulator
- an iOS simulator
- the web browser

## Useful scripts

```bash
npm run start
npm run android
npm run ios
npm run web
npm run type-check
npm run lint
npm run build:web
npm run deploy:web
```

To deploy the web app to Firebase Hosting, run `npm run deploy:web` from the `PomoJI` project directory. Firebase Hosting automatically builds the Expo web export into `dist/` before deployment, and the build stops if its `index.html` entrypoint is missing.

## Firebase security rollout

Firestore account documents at `users/{uid}` are private to their owner. Signed-in social features use `publicProfiles/{uid}`, which contains only the user-chosen display name/username and profile image reference; email and structured name fields remain private. New accounts write both documents; existing accounts populate their public profile the next time they open their profile in the updated app. Until then, they will not appear in social search.

Deploy the updated app and Firestore rules as a coordinated change: older app versions still read other users' `users/{uid}` documents and will lose those social profile lookups under the stricter rules. Profile images are readable by authenticated users; activity images are limited to the owner and mutual connections. The activity-image Storage rule checks Firestore follow documents, so verify Storage-to-Firestore rule access is enabled for the Firebase project before deploying.

## App workflow

1. Sign in or create an account.
2. Add or select a task for focus sessions.
3. Start a Pomodoro timer and work without distractions.
4. Take short or long breaks when the timer ends.
5. Review analytics and streak updates to stay consistent.
6. Use reminders and notifications to keep momentum throughout the day.

## Notes

This project is a full Expo app tailored for productivity tracking and focus routines. It is intended to be used as a working application and can be extended with additional productivity features, gamification, or team collaboration.

## License

This project is for educational and development use within the software engineering coursework context.
