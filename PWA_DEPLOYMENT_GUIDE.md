# PomoJI PWA Deployment Guide

Complete guide for deploying PomoJI as a production-ready Progressive Web App.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [PWA Features Implemented](#pwa-features-implemented)
4. [Local Development](#local-development)
5. [Building for Production](#building-for-production)
6. [Firebase Hosting Setup](#firebase-hosting-setup)
7. [Deployment Steps](#deployment-steps)
8. [Testing PWA Features](#testing-pwa-features)
9. [Browser Limitations](#browser-limitations)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created
- Expo CLI installed: `npm install -g expo-cli`

---

## Project Structure

```
PomoJI/
├── app/
│   ├── _layout.tsx                    # Service worker registration
│   ├── components/
│   │   ├── PWAInstallPrompt.tsx       # Install prompt UI
│   │   ├── OfflineIndicator.tsx       # Offline status banner
│   │   └── SyncingIndicator.tsx       # Firestore sync status
│   └── (tabs)/
│       └── timer.tsx                   # Timer screen
├── hooks/
│   ├── useTimerPersistence.ts         # Timer state persistence
│   └── useStrictFocusMode.ts          # Focus mode enforcement
├── services/
│   ├── firebase.ts                    # Firebase config with offline persistence
│   ├── notificationService.ts         # Expo notifications (mobile)
│   └── webNotificationService.ts      # Web notifications (PWA)
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── service-worker.js              # Service worker with Workbox
│   ├── offline.html                   # Offline fallback page
│   ├── robots.txt                     # SEO robots file
│   └── icon-*.png                     # PWA icons
├── app.json                           # Expo config with PWA settings
├── firebase.json                      # Firebase hosting config
├── web-build.js                       # Post-build optimization script
└── package.json
```

---

## PWA Features Implemented

### Core PWA Features
- ✅ **Manifest.json** - App metadata, icons, shortcuts
- ✅ **Service Worker** - Offline caching with Workbox strategies
- ✅ **Install Prompt** - Native install banner for Chrome/Edge
- ✅ **Offline Support** - Offline page and cached assets
- ✅ **App Icons** - Multiple sizes for different devices
- ✅ **Standalone Mode** - Full-screen app experience

### Timer Persistence
- ✅ **AsyncStorage/localStorage** - Cross-platform timer state
- ✅ **Timestamp-based** - Accurate time calculation across refreshes
- ✅ **Auto-restore** - Timer continues after app close/reopen
- ✅ **Pause tracking** - Handles paused time accumulation

### Notifications
- ✅ **Web Notifications API** - Browser notifications for PWA
- ✅ **Expo Notifications** - Native notifications for mobile
- ✅ **Session completion** - Alerts when Pomodoro ends
- ✅ **Break reminders** - Notifications for breaks
- ✅ **Focus alerts** - Session start notifications

### Strict Focus Mode
- ✅ **Page Visibility API** - Detects tab switching
- ✅ **Window blur/focus** - Detects browser minimize
- ✅ **Visibility change** - Invalidates session on tab leave
- ✅ **Warning threshold** - Configurable grace period
- ✅ **Violation tracking** - Records focus violations

### Offline Support
- ✅ **Firestore offline persistence** - IndexedDB caching
- ✅ **Service worker caching** - Static assets and API responses
- ✅ **Offline indicator** - Visual status banner
- ✅ **Syncing indicator** - Firestore sync status
- ✅ **Offline page** - Fallback when offline

### Performance Optimization
- ✅ **Firebase Hosting headers** - Proper cache control
- ✅ **Immutable caching** - Long-term cache for static assets
- ✅ **Service worker strategies** - NetworkFirst, CacheFirst, StaleWhileRevalidate
- ✅ **Bundle optimization** - Code splitting ready
- ✅ **Image optimization** - WebP support

---

## Local Development

### Start Development Server

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# For web development specifically
npm run web
```

### Testing PWA Features Locally

1. **Service Worker**: Requires HTTPS or localhost
2. **Notifications**: Test in Chrome/Edge (Firefox has limited support)
3. **Install Prompt**: Chrome will show after multiple visits
4. **Offline Mode**: Use Chrome DevTools Network tab → Offline

---

## Building for Production

### Build Steps

```bash
# 1. Export the web build
expo export --platform web

# 2. Run post-build optimization
node web-build.js

# 3. The optimized build is now in /dist
```

### What web-build.js Does

- Copies PWA assets (manifest, service-worker, icons) to dist
- Adds service worker registration to index.html
- Adds manifest link to index.html
- Adds theme-color meta tag
- Ensures all PWA files are in the build output

---

## Firebase Hosting Setup

### Initial Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Hosting: Configure files for Firebase Hosting
# - Use existing project: software-engineering1-pomoji
# - Public directory: dist
# - Configure as single-page app: Yes
# - Overwrite index.html: No
```

### Firebase Configuration

Your `firebase.json` is already configured with:
- SPA rewrites for client-side routing
- Optimized cache headers for different file types
- Service Worker and Manifest headers
- CORS headers for fonts and images

---

## Deployment Steps

### Deploy to Firebase Hosting

```bash
# Build and deploy in one command
npm run deploy:web

# Or manually:
npm run build:web
firebase deploy --only hosting
```

### Deployment Checklist

- [ ] Run `expo export --platform web`
- [ ] Run `node web-build.js`
- [ ] Verify dist folder contains all PWA files
- [ ] Run `firebase deploy --only hosting`
- [ ] Test deployed app at Firebase URL
- [ ] Test install prompt on Chrome/Edge
- [ ] Test offline functionality
- [ ] Test notifications
- [ ] Test timer persistence
- [ ] Run Lighthouse audit

---

## Testing PWA Features

### Lighthouse Audit

1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Run audit

**Target Scores:**
- PWA: 90+
- Performance: 80+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 80+

### Install Testing

**Chrome/Edge (Desktop):**
1. Visit app multiple times (3+ visits)
2. Look for install icon in address bar
3. Click install and test standalone mode

**Chrome (Android):**
1. Visit app in Chrome
2. Tap "Add to Home Screen" menu
3. Test as installed app

**Safari (iOS):**
1. Visit app in Safari
2. Tap Share → "Add to Home Screen"
3. Test as installed app

### Offline Testing

1. Open Chrome DevTools
2. Go to Network tab
3. Select "Offline" throttling
4. Refresh page
5. Verify offline page shows
6. Test timer functionality
7. Go back online
8. Verify sync indicator shows

### Notification Testing

1. Request notification permission
2. Start a focus session
3. Wait for completion
4. Verify notification appears
5. Test click behavior

### Timer Persistence Testing

1. Start a timer
2. Close browser tab
3. Reopen tab
4. Verify timer continues with correct time
5. Test with page refresh
6. Test with browser close/reopen

---

## Browser Limitations

### Strict Focus Mode Limitations

**Browser Limitations:**
- **Tab Detection**: Page Visibility API works in all modern browsers
- **Minimize Detection**: Window resize detection is unreliable
- **Background Execution**: Timers may be throttled in background tabs
- **iOS Safari**: Limited visibility change detection
- **Firefox**: Different visibility behavior

**Workarounds:**
- Use timestamp-based timer (implemented)
- Store state in localStorage (implemented)
- Show warnings for potential violations
- Don't rely solely on visibility for critical features

### iOS Safari PWA Limitations

**Known Limitations:**
- No push notifications (use local notifications)
- No background sync
- Limited service worker support
- No install prompt (manual add to home screen)
- No badge API
- Limited storage quota

**Best Practices:**
- Provide manual install instructions
- Use localStorage for persistence
- Implement graceful degradation
- Test thoroughly on iOS

### Background Timer Limitations

**Browser Throttling:**
- Chrome: Throttles timers in background tabs after 5 minutes
- Firefox: Throttles timers after 1 minute
- Safari: Aggressive throttling in background

**Solution Implemented:**
- Timestamp-based calculation instead of interval-only
- State persistence in localStorage
- Accurate time restoration on foreground

### Notification Permission Handling

**Browser Requirements:**
- Must be triggered by user gesture
- HTTPS required (except localhost)
- Permission can be denied/revoked
- Different APIs per platform

**Implementation:**
- Request on user action (button click)
- Handle permission denial gracefully
- Fallback to in-app alerts
- Platform-specific service (Expo vs Web)

---

## Performance Optimization

### Cache Strategy

**Service Worker Caching:**
- HTML: NetworkFirst (always fresh)
- API: NetworkFirst with 3s timeout
- Images: CacheFirst with 30-day expiration
- Fonts: CacheFirst with 1-year expiration
- JS/CSS: StaleWhileRevalidate

**Firebase Hosting Headers:**
- Static assets: 1-year immutable cache
- HTML/Manifest: No-cache (always fresh)
- Service Worker: No-cache (updates immediately)

### Bundle Optimization

**Recommendations:**
- Use dynamic imports for code splitting
- Lazy load route components
- Optimize images (WebP format)
- Minify CSS/JS
- Remove unused dependencies

### Memory Optimization

**Best Practices:**
- Clean up event listeners
- Use refs for expensive calculations
- Virtualize long lists
- Debounce/throttle handlers
- Avoid memory leaks in useEffect

---

## Troubleshooting

### Service Worker Not Registering

**Symptoms:**
- Service worker not found in DevTools
- Offline mode not working
- Console errors about SW

**Solutions:**
1. Ensure service-worker.js is in public/ and dist/
2. Check file path in registration code
3. Verify HTTPS (required for SW)
4. Check browser console for errors
5. Clear site data and retry

### Install Prompt Not Showing

**Symptoms:**
- No install icon in address bar
- PWAInstallPrompt component not showing

**Solutions:**
1. Visit site multiple times (Chrome requires 3+ visits)
2. Check manifest.json is valid
3. Verify all required icons exist
4. Check browser console for errors
5. Ensure site is served over HTTPS
6. Check if already installed (clear if needed)

### Timer Not Persisting

**Symptoms:**
- Timer resets on refresh
- State not saved

**Solutions:**
1. Check useTimerPersistence hook integration
2. Verify AsyncStorage/localStorage is working
3. Check browser console for storage errors
4. Ensure storage key is unique
5. Check if storage quota exceeded

### Notifications Not Working

**Symptoms:**
- No notifications appear
- Permission denied

**Solutions:**
1. Check notification permission status
2. Request permission on user gesture
3. Verify HTTPS (required for notifications)
4. Check browser notification settings
5. Test in Chrome/Edge (best support)
6. Check console for errors

### Offline Page Not Showing

**Symptoms:**
- Browser shows default offline page
- Service worker not caching properly

**Solutions:**
1. Verify offline.html exists in dist/
2. Check service worker fetch handler
3. Ensure offline.html is cached
4. Test with DevTools offline mode
5. Check service worker scope

### Firebase Sync Issues

**Symptoms:**
- Data not syncing
- Syncing indicator always showing

**Solutions:**
1. Check Firestore offline persistence
2. Verify Firebase configuration
3. Check network connection
4. Verify Firestore rules
5. Check browser console for errors
6. Clear IndexedDB and retry

---

## Production Checklist

### Pre-Deployment

- [ ] Test all features locally
- [ ] Run Lighthouse audit (target: 90+ PWA score)
- [ ] Test on multiple browsers (Chrome, Edge, Safari, Firefox)
- [ ] Test on mobile devices
- [ ] Test offline functionality
- [ ] Test timer persistence
- [ ] Test notifications
- [ ] Verify Firebase configuration
- [ ] Check environment variables
- [ ] Update version number in app.json

### Post-Deployment

- [ ] Verify deployment URL works
- [ ] Test install prompt
- [ ] Test offline mode
- [ ] Test all user flows
- [ ] Monitor Firebase console for errors
- [ ] Check Analytics (if implemented)
- [ ] Test on real devices
- [ ] Get user feedback

---

## Additional Resources

- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Expo Web Documentation](https://docs.expo.dev/guides/web/)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

## Support

For issues or questions:
1. Check this guide first
2. Review browser console for errors
3. Check Firebase console
4. Review Expo documentation
5. Open an issue in the project repository

---

**Last Updated:** May 2026
**Version:** 1.0.0
