# Quick Fix Commands - Copy & Paste

## 1️⃣ CLEAN ENVIRONMENT

```bash
cd c:/Users/2060/Desktop/SoftwareEngineering/PomoJI
rm -rf .expo
npm cache clean --force
npm install
```

## 2️⃣ VERIFY SETUP

```bash
npm run type-check
npm run lint
```

## 3️⃣ BUILD APK (Choose One)

### Option A: Development Build (Recommended First)

```bash
eas build --platform android --profile development
```

### Option B: Production Build

```bash
eas build --platform android --profile production
```

## 4️⃣ AFTER DOWNLOAD - INSTALL APK

### List Connected Devices

```bash
adb devices
```

### Remove Old Installation

```bash
adb uninstall com.pomoji.app
```

### Install New APK

```bash
adb install -r path/to/PomoJI.apk
```

### Launch App

```bash
adb shell am start -n com.pomoji.app/.MainActivity
```

### View Logs

```bash
adb logcat | grep pomoji
```

## 5️⃣ TROUBLESHOOTING

### Check Device Specs

```bash
adb shell getprop ro.build.version.release    # Android version
adb shell getprop ro.product.cpu.abi          # CPU architecture
```

### Force Clear App Cache

```bash
adb shell pm clear com.pomoji.app
```

### Check Device Storage

```bash
adb shell df
```

### Verify APK File

```bash
# On PC
unzip -t PomoJI.apk
```

---

## Expected Results

✅ **Success Signs**:

- APK installs without errors
- App launches on device
- No "App not installed" error

❌ **Common Issues & Solutions**:

| Error               | Solution                                                 |
| ------------------- | -------------------------------------------------------- |
| "App not installed" | Run: `adb uninstall com.pomoji.app` then retry           |
| Device not found    | Enable USB debugging, check drivers                      |
| APK corrupted       | Re-download from EAS Build dashboard                     |
| Low storage         | Clear device cache: `adb shell rm -rf /data/local/tmp/*` |
| Wrong architecture  | Check device CPU: `adb shell getprop ro.product.cpu.abi` |

---

## Build Status

Check progress at: https://expo.dev/dashboard

Need help? See `ANDROID_FIX.md` for detailed troubleshooting.
