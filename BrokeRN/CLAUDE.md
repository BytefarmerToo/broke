# Claude Code Instructions for BrokeRN

## Project Overview

This is a React Native Expo app that blocks distracting apps using NFC tags. It's a port of an iOS Swift app.

## Key Architecture Decisions

### Native Modules
- Use **Expo Modules API** (not React Native bridge) for native code
- Write native Android code in **Kotlin** (not Java)
- Native module lives in `modules/app-blocker/`
- Module structure: `modules/<name>/android/src/main/java/expo/modules/<name>/`
- Config plugin in `plugins/withAppBlocker.js` handles AndroidManifest changes

### State Management
- Global state in `src/context/AppContext.tsx`
- Uses React Context + AsyncStorage for persistence
- No external state libraries (Redux, etc.)
- Load settings in parallel with `Promise.all([AsyncStorage.getItem(...), ...])`
- Use `useCallback` for all context functions to prevent unnecessary rerenders
- Store durations as integers (seconds), not strings

### Android App Blocking
- Uses **Accessibility Service** to detect foreground app changes
- When a blocked app opens, performs `GLOBAL_ACTION_HOME` to return to launcher
- Requires `QUERY_ALL_PACKAGES` permission to list installed apps
- Blocked packages stored in SharedPreferences for service access

## Common Tasks

### Adding a New Setting
1. Add storage key to `STORAGE_KEYS` in `AppContext.tsx`
2. Add state and setter to `AppContextType` interface
3. Add `useState` in `AppProvider`
4. Load from AsyncStorage in `loadData()`
5. Create setter function with `useCallback`
6. Add to provider value object
7. Add UI in `SettingsModal.tsx`

### Adding a New Native Function
1. Add function to `AppBlockerModule.kt` in `definition()` block
2. Export from `modules/app-blocker/index.ts`
3. Add wrapper in `src/utils/appBlocker.ts`

### Modifying AndroidManifest
- Don't edit `android/app/src/main/AndroidManifest.xml` directly
- Use `plugins/withAppBlocker.js` config plugin
- Run `npx expo prebuild` to regenerate

## Build Commands

```bash
# TypeScript check
npx tsc --noEmit

# Regenerate native projects (after config changes)
npx expo prebuild

# Clean regenerate (removes android/ios folders first)
npx expo prebuild --clean

# Build and run Android
npx expo run:android

# Build without installing
npx expo run:android --no-install
```

## Important Files

| File | Purpose |
|------|---------|
| `src/context/AppContext.tsx` | Global state, blocking logic, schedule checking |
| `src/screens/BrockerView.tsx` | Main UI, hold-to-toggle logic |
| `modules/app-blocker/android/.../AppBlockerModule.kt` | Native module (Expo Modules API) |
| `modules/app-blocker/android/.../AppBlockerService.kt` | Accessibility service |
| `plugins/withAppBlocker.js` | AndroidManifest modifications |

## Gotchas & Learnings

### Expo Modules vs React Native Bridge
- Expo Modules use `requireNativeModule` from `expo-modules-core`
- Module config in `expo-module.config.json` specifies the module class
- No need to manually register packages in MainApplication.kt

### Android Package Visibility (API 30+)
- Android 11+ restricts which packages an app can see
- Must add `QUERY_ALL_PACKAGES` permission to list all installed apps
- Without it, `getInstalledApplications()` returns limited results

### Accessibility Service Persistence
- Service runs in separate process
- Must use SharedPreferences for state (not in-memory variables)
- Service has its own lifecycle independent of the app
- Service class needs companion object with `@Volatile` instance reference
- Config XML required at `res/xml/accessibility_service_config.xml`

### Schedule Checking
- Uses 60-second interval to check active schedules
- `isScheduleActive()` handles overnight schedules (start > end time)
- Auto-activates profile and enables blocking when schedule starts

### Hold-to-Toggle UI
- Uses `Pressable` with `onPressIn`/`onPressOut` (not TouchableOpacity)
- Interval updates progress every 50ms for smooth animation
- Must clear interval on release AND on component unmount
- Store start time in ref, calculate progress as `(Date.now() - startTime) / duration`
- Show countdown: `Math.ceil(duration * (1 - progress))`

### SVG in React Native
- Use `react-native-svg` for custom graphics
- Circle progress: `strokeDasharray={circumference}` and `strokeDashoffset={circumference * (1 - progress)}`
- Rotate -90 degrees to start from top: `rotation="-90" origin="center"`
- Use `strokeLinecap="round"` for rounded ends

## Testing on Android

1. Build with `npx expo run:android`
2. Enable Accessibility Service in Settings
3. Create a Broke NFC tag (optional, works without NFC)
4. Select apps to block in a profile
5. Hold the lock button to activate blocking
6. Try opening a blocked app - should return to home

## Don't

- Don't use Java for new native code (use Kotlin)
- Don't edit generated files in `android/` directly (use config plugins)
- Don't use `NativeModules` from react-native (use Expo Modules)
- Don't forget to run `npx expo prebuild` after changing native code structure
- Don't forget `QUERY_ALL_PACKAGES` permission when listing installed apps
- Don't forget to handle overnight schedules in time comparisons (start > end)
- Don't forget to clean up intervals on component unmount
