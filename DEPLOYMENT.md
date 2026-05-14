# PomoJI Deployment Checklist

## Pre-Deployment Checklist

### Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in Firebase configuration values in `.env.local`
- [ ] Ensure all environment variables use `EXPO_PUBLIC_` prefix for client-side access
- [ ] Verify Firebase project is properly configured
- [ ] Test Firebase Authentication flow
- [ ] Test Firestore database operations
- [ ] Test Firebase Storage uploads

### Code Quality
- [ ] Run `npm run type-check` - ensure no TypeScript errors
- [ ] Run `npm run lint` - ensure no critical linting errors
- [ ] Test profile photo upload on web
- [ ] Test profile photo upload on mobile (if applicable)
- [ ] Verify all core features work:
  - [ ] User authentication (sign up, sign in, sign out)
  - [ ] Profile management
  - [ ] Task creation and management
  - [ ] Pomodoro timer
  - [ ] Statistics and analytics
  - [ ] Social features (follow/unfollow)

### Firebase Configuration
- [ ] Review Firebase Security Rules
- [ ] Enable Firebase Authentication providers
- [ ] Configure Firestore indexes for common queries
- [ ] Set up Firebase Storage rules for profile images
- [ ] Verify Firebase project is in production mode (not test mode)

## Deployment Options

### Option 1: Expo Web (Vercel/Netlify)
1. Build the web app:
   ```bash
   npm run build:web
   ```
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables in hosting provider
4. Set up custom domain (optional)

### Option 2: Expo Application Store (EAS Build)
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure EAS:
   ```bash
   eas build:configure
   ```
3. Build for iOS:
   ```bash
   npm run build:ios
   ```
4. Build for Android:
   ```bash
   npm run build:android
   ```
5. Submit to app stores through EAS Submit

### Option 3: Expo Go (Development)
1. Start development server:
   ```bash
   npm start
   ```
2. Scan QR code with Expo Go app
3. Test on physical device

## Post-Deployment Checklist

### Monitoring
- [ ] Set up Firebase Analytics
- [ ] Configure crash reporting (Crashlytics)
- [ ] Set up performance monitoring
- [ ] Enable Firebase Remote Config for feature flags

### Security
- [ ] Review Firebase Security Rules in production
- [ ] Enable App Check if needed
- [ ] Set up rate limiting on API endpoints
- [ ] Review and rotate API keys if necessary

### Maintenance
- [ ] Document deployment process
- [ ] Set up automated backups for Firestore
- [ ] Create rollback plan
- [ ] Schedule regular security audits

## Environment Variables Reference

Required environment variables for `.env.local`:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Troubleshooting

### Build Issues
- If TypeScript errors occur: Run `npm run type-check` to identify issues
- If linting errors occur: Run `npm run lint:fix` to auto-fix minor issues
- If Firebase connection fails: Verify environment variables are set correctly

### Runtime Issues
- If authentication fails: Check Firebase Auth configuration
- If data doesn't load: Verify Firestore rules and indexes
- If image upload fails: Check Firebase Storage rules and CORS policy

### Performance Issues
- Monitor bundle size with Expo's build analyzer
- Optimize images before upload
- Implement lazy loading for large components
- Use memoization for expensive computations

## Support Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
