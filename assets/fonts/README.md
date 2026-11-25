# Fonts

PomoJI uses **Bricolage Grotesque** as its only font family.

- **Native (iOS/Android):** weights 400/500/600/700/800 are loaded in
  `app/_layout.tsx` via `@expo-google-fonts/bricolage-grotesque` and
  `expo-font`.
- **Web / PWA:** locally hosted variable WOFF2 files live in
  `public/fonts/` and are declared via `@font-face` in `global.css`
  (copied to `dist/fonts/` during `npm run build:web`). They are also
  precached by `public/service-worker.js` so the installed PWA renders
  the correct font offline.
