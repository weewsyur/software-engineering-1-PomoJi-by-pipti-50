<div align="center">

#  PomoJI

**A Productivity and Progress Monitoring System**

A Pomodoro-powered focus app with a built-in wellbeing check-in, made for students, freelancers, and professionals. Built with Expo and React Native.

![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS%20%7C%20Web-blue)

<!-- TODO: add a live demo link, e.g. [Live demo](https://your-app.web.app) -->

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Wellbeing Check-in](#-wellbeing-check-in-dass-21)
- [Deployment](#-deployment)
- [Firebase Security Rollout](#-firebase-security-rollout)
- [Team](#-team)
- [License](#-license)

---

## 📌 About

PomoJI combines a Pomodoro timer, structured task management, reminders, and productivity insights in one streamlined app. It is built for people who want to:

- Stay focused during work and study sessions
- Break large tasks into actionable chunks
- Avoid distractions with focus-mode protection
- Monitor streaks and session history
- Stay motivated through progress tracking and activity updates

This project was developed for **Software Engineering 1** by **Team PIPTI 50**.

## ✨ Features

| Area | What you get |
| --- | --- |
| ⏱️ **Focus timer** | Pomodoro timer with focus, short break, and long break modes |
| ✅ **Tasks** | Task categories and task selection inside focus sessions |
| 🔔 **Reminders** | Notification reminders and session-completion alerts |
| 🔥 **Streaks** | Weekly streak calendar and daily activity tracking |
| 🧠 **Wellbeing check-in** | Optional daily DASS-21 readiness check before your first focus session, with consent notice and offline support |
| 📊 **Analytics** | Dashboard with a productivity overview |
| 👥 **Social** | Progress feed of focus sessions, user search, and profile experience |
| 🔒 **Privacy controls** | Assessment records are private to you; review, export, or delete them from Profile → Privacy |
| 🔐 **Accounts** | Firebase Authentication with cloud data persistence |
| 🌐 **Cross-platform** | Runs on Android, iOS, and the web through Expo |

## 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| Framework | [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/) |
| Language | TypeScript |
| Routing | Expo Router |
| Backend | Firebase Authentication, Firestore, Storage, Hosting |
| State management | Zustand |
| Styling | NativeWind (Tailwind CSS) |
| Notifications | Expo Notifications |
| Tooling | ESLint, EAS Build, GitHub Actions |

## ✅ Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) (LTS version recommended) and npm
- A [Firebase project](https://console.firebase.google.com/) with **Authentication**, **Firestore**, and **Storage** enabled
- _(Optional)_ [Expo Go](https://expo.dev/go) on your phone, or an Android emulator / iOS simulator

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/weewsyur/software-engineering-1-PomoJi-by-pipti-50.git
cd software-engineering-1-PomoJi-by-pipti-50
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your Firebase values.

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (Command Prompt)
copy .env.example .env.local
```

Then edit `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> You can find these values in the Firebase Console under **Project settings → Your apps**.
> Never commit `.env.local`; it is already covered by `.gitignore`.

### 4. Run the app

```bash
npx expo start
```

From the Expo terminal you can open the app in:

- **Expo Go** on a physical device (scan the QR code)
- An **Android emulator** (press `a`)
- An **iOS simulator** (press `i`, macOS only)
- A **web browser** (press `w`)

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the Expo dev server |
| `npm run android` | Run on an Android device or emulator |
| `npm run ios` | Run on an iOS device or simulator |
| `npm run web` | Run in the browser |
| `npm run type-check` | Run the TypeScript compiler without emitting files |
| `npm run lint` | Lint the codebase with ESLint |
| `npm run build:web` | Create a production web build in `dist/` |
| `npm run deploy:web` | Build and deploy the web app to Firebase Hosting |

## 🗂 Project Structure

```
.
├── app/                  # Screens and routes (Expo Router)
│   ├── (auth)/           # Sign in / sign up / welcome flow
│   └── (tabs)/           # Home, timer, analytics, and profile screens
├── components/           # Reusable UI components
├── constants/            # App-wide constants
├── contexts/             # React context providers
├── hooks/                # Custom hooks (timer, tasks, reminders, notifications)
├── services/             # Firebase and notification services
├── store/                # Zustand state stores
├── utils/                # Helpers and productivity logic
├── wellness/             # Wellbeing features (DASS-21 readiness check)
├── web/                  # Web-specific files          <!-- TODO: confirm description -->
├── scripts/              # Project scripts
├── public/               # Static web assets
├── assets/               # Images and branding
├── .github/workflows/    # CI/CD workflows
├── app.json              # Expo app configuration
├── eas.json              # EAS Build configuration
├── firebase.config.ts    # Firebase initialization
├── firebase.json         # Firebase Hosting / rules configuration
├── firestore.rules       # Firestore security rules
├── storage.rules         # Storage security rules
└── .env.example          # Environment variable template
```

## 🧠 Wellbeing Check-in (DASS-21)

Before the first focus session of the day, users can take the short **DASS-21** self-report (21 questions, about 3 to 5 minutes).

- **Voluntary:** users must read and accept a consent notice, and can choose "Not now".
- **Private:** responses, calculated results, and completion time are saved to the user's private account. If completed offline, they are stored on the device until they can sync.
- **User control:** records can be reviewed, exported, or deleted in **Profile → Privacy**.
- **Frequency:** one assessment per day.
- **Not a diagnosis:** DASS-21 is a screening tool, not a clinical diagnosis or emergency assessment.

## 🚢 Deployment

### Web (Firebase Hosting)

```bash
npm run deploy:web
```

Run this from the project root. The script builds the Expo web export into `dist/` before deploying, and the build stops if the `index.html` entry point is missing.

### Android

An Android build helper is included (`build-android.sh`), and build profiles are defined in `eas.json`. See the [EAS Build docs](https://docs.expo.dev/build/introduction/) for details.

## 🔒 Firebase Security Rollout

**Privacy model**

- `users/{uid}` documents are **private to their owner**.
- Social features use `publicProfiles/{uid}`, which only contains the display name/username and profile image reference. Email and structured name fields stay private.
- Profile images are readable by authenticated users. Activity images are limited to the owner and mutual connections.

**Account migration**

- New accounts write both documents.
- Existing accounts get a public profile the next time they open their profile in the updated app. Until then, they will not appear in social search.

**Before deploying**

- Deploy the updated app and the Firestore rules **together**. Older app versions still read other users' `users/{uid}` documents and will lose social profile lookups under the stricter rules.
- The activity-image Storage rule checks Firestore follow documents, so verify that Storage-to-Firestore rule access is enabled for your Firebase project.

## 👥 Team

**Team PIPTI 50**, Software Engineering 1

<!-- TODO: add members, e.g.
| Name | Role | GitHub |
| --- | --- | --- |
| Your Name | Developer | [@username](https://github.com/username) |
-->

## 📄 License

This project is for educational and development use within the software engineering coursework context. See the repository for any additional license terms.

---

<div align="center">

Made with 🍅 and focus by Team PIPTI 50

</div>
