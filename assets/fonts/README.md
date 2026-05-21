Open Sans local fonts

This folder is intended to contain local font files for Open Sans. You can populate it automatically by running:

npm run fetch-fonts

The included script fetches the Google Fonts CSS for Open Sans and downloads linked woff2 files into this folder. After downloading, the web build will use the local woff2 files if you reference them in CSS, and you can load them in native with `expo-font` by registering the local files.

If you prefer manual download:

1. Visit https://fonts.google.com/specimen/Open+Sans
2. Select the weights (400, 600, 700) and download
3. Copy the .ttf or .woff2 files into this folder

To use local fonts in native (Expo), add loading code in `app/_layout.tsx` using `Font.loadAsync` or `expo-font` and reference the local files by path, e.g.:

import \* as Font from 'expo-font';
await Font.loadAsync({ 'OpenSans-Regular': require('../assets/fonts/OpenSans-Regular.ttf') });

Note: This project already uses `@expo-google-fonts/open-sans` which loads fonts automatically for both native and web. Local files are optional but allow offline/local builds without relying on remote font loading.
