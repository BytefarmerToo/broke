# Broke RN

A React Native Expo app for blocking distracting apps using NFC tags. Port of the original iOS Swift "Broke" app.

## Features

- **NFC Tag Authentication**: Use physical NFC tags to lock/unlock app blocking
- **Hold to Toggle**: Press and hold the button to lock/unlock (configurable 3-60 seconds)
- **Profile Management**: Create multiple blocking profiles with different app selections
- **Scheduled Blocking**: Auto-activate profiles based on time of day and day of week
- **Android App Blocking**: Uses Accessibility Service to block apps on Android

## Requirements

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- Physical Android device with NFC (for full functionality)

## Installation

```bash
# Install dependencies
npm install

# Generate native projects
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Project Structure

```
src/
├── components/
│   ├── CircularProgress.tsx    # SVG circular progress ring for hold-to-toggle
│   ├── ProfileForm.tsx         # Create/edit blocking profiles
│   ├── ProfilePicker.tsx       # Profile selection UI
│   ├── ScheduleForm.tsx        # Schedule creation/editing
│   └── SettingsModal.tsx       # App settings (hold durations, etc.)
├── context/
│   └── AppContext.tsx          # Global state management
├── screens/
│   └── BrockerView.tsx         # Main app screen
├── types/
│   └── Profile.ts              # TypeScript interfaces and helpers
└── utils/
    ├── appBlocker.ts           # Android app blocking wrapper
    └── nfc.ts                  # NFC read/write utilities

modules/
└── app-blocker/                # Expo native module for Android
    ├── android/
    │   └── src/main/java/expo/modules/appblocker/
    │       ├── AppBlockerModule.kt    # Expo module implementation
    │       └── AppBlockerService.kt   # Accessibility service
    ├── index.ts                # TypeScript exports
    └── expo-module.config.json

plugins/
└── withAppBlocker.js           # Config plugin for AndroidManifest
```

## Android Setup

The app requires the Accessibility Service permission to block apps:

1. Build and install the app
2. Tap the settings icon or the warning banner
3. Find "Broke" in the Accessibility settings
4. Enable the service

The app uses `QUERY_ALL_PACKAGES` permission to list installed apps.

## NFC Tags

To create a Broke NFC tag:
1. Tap the "+" button in the header
2. Hold an NFC tag near the device
3. The tag will be written with the Broke signature

To toggle blocking:
1. Hold the main button until the ring fills
2. Scan a valid Broke NFC tag

## Configuration

### Hold Durations
- **Lock duration**: How long to hold to enable blocking (default: 15s)
- **Unlock duration**: How long to hold to disable blocking (default: 15s)
- Configurable from 3-60 seconds in Settings

### Schedules
Profiles can have multiple schedules that auto-activate blocking:
- Select days of the week
- Set start and end times
- Supports overnight schedules (e.g., 10 PM - 6 AM)

## Tech Stack

- **Expo SDK 54** with expo-dev-client
- **React Native 0.81**
- **TypeScript**
- **Expo Modules API** (Kotlin) for native Android code
- **react-native-nfc-manager** for NFC
- **react-native-svg** for circular progress
- **AsyncStorage** for persistence

## License

MIT
