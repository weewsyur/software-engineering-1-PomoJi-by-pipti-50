# Icon Generation Guide

This guide explains how to generate all required app icons (PWA, native iOS/Android, splash screens, favicons) from a single source image.

## Setup

### 1. Prepare Your Source Image

Create a **high-resolution icon** (1024×1024 or larger) and place it at:

```
assets/images/icon-source.png
```

**Requirements:**

- Format: PNG, JPG, or other image format supported by Sharp
- Size: **1024×1024 or larger** (recommended 1024×1024, can be up to 2048×2048)
- Content: Your app icon/logo (should look good at small sizes like 192×192)
  - For **maskable icons** (adaptive Android icons), ensure your icon has some padding around the safe zone; the system will use the center ~80% of the image

### 2. Install Dependencies

Run:

```bash
npm install
npm install --save-dev sharp
```

Or if you already have `sharp` in `package.json`:

```bash
npm install
```

### 3. Generate Icons

Generate all icon sizes with:

```bash
npm run generate-icons
```

**Output:**
The script will create:

| Output                             | Size      | Purpose                      |
| ---------------------------------- | --------- | ---------------------------- |
| `public/icon-192x192.png`          | 192×192   | PWA icon (regular)           |
| `public/icon-512x512.png`          | 512×512   | PWA icon (regular)           |
| `public/icon-maskable-192x192.png` | 192×192   | PWA icon (maskable/adaptive) |
| `public/icon-maskable-512x512.png` | 512×512   | PWA icon (maskable/adaptive) |
| `assets/images/icon-192x192.png`   | 192×192   | Native app icon (backup)     |
| `assets/images/icon-512x512.png`   | 512×512   | Native app icon              |
| `assets/images/icon-1024x1024.png` | 1024×1024 | Native app icon (high-res)   |
| `assets/images/splash.png`         | 1200×1200 | Splash screen                |
| `assets/images/POMOJI.png`         | 512×512   | Main app icon (app.json)     |

### 4. (Optional) Use Custom Source

If your source image is in a different location, specify it:

```bash
npm run generate-icons -- --source=path/to/your/icon.png
```

## Configuration Files

### `app.json` (Expo)

The icon generation updates these references:

```json
{
  "expo": {
    "icon": "./assets/images/POMOJI.png",
    "splash": {
      "image": "./assets/images/splash.png"
    },
    "ios": {},
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/POMOJI.png",
        "backgroundImage": "./assets/images/POMOJI.png"
      }
    },
    "web": {
      "favicon": "./assets/images/POMOJI.png"
    }
  }
}
```

### `public/manifest.json` (PWA)

The PWA manifest automatically references the generated icons:

```json
{
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Testing

### Test on Web (PWA)

```bash
npm run build:web
npm run start -- --web
```

Open DevTools → Application → Manifest to verify icons are correctly referenced.

### Test on Native

```bash
npm run start -- --ios   # iOS simulator
npm run start -- --android  # Android simulator
```

### Test Adaptive Icons (Android Only)

Android uses maskable icons for adaptive icon support. Your icon will be clipped to a circle or other shape based on the OEM's device-icon mask. Ensure your icon looks good when the edges are clipped.

## Troubleshooting

### "sharp is not installed"

Run:

```bash
npm install --save-dev sharp
```

### "Source image not found"

Place your source icon at `assets/images/icon-source.png` or specify the path:

```bash
npm run generate-icons -- --source=your-path.png
```

### Icons look stretched/distorted

Ensure your source image is:

- **Square** (same width and height)
- **1024×1024 or larger** for best quality

### Maskable icons don't display correctly on Android

For maskable icons to work well, your icon should have:

- Visible content in the center 80% of the image
- Padding/safe zone around the edges
- A transparent background (if applicable)

## Next Steps

1. Place your source icon at `assets/images/icon-source.png`
2. Run `npm run generate-icons`
3. Review the generated icons in `public/` and `assets/images/`
4. Test on web and native platforms
5. Deploy with `npm run deploy:web` or `eas build`

---

For more info on PWA icons, see [MDN: Web App Manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)

For Expo/native icons, see [Expo: App Icon](https://docs.expo.dev/develop/user-interface/app-icon/)
