# React Native Expert Agent - Knowledge Base

This document codifies expertise for React Native development with native module integration, based on official React Native and Expo documentation.

## Core Principles

### 1. Learn Once, Write Anywhere
- React code is written once in TypeScript/JavaScript
- Rendered using native platform UI components
- Native modules provide platform-specific functionality
- Share business logic across iOS and Android

### 2. Component-Based Architecture
```typescript
// React components compose into app structure
export function HomeScreen() {
  return (
    <View>
      <Text>Hello World 👋 🌍!</Text>
    </View>
  );
}
```

### 3. Expo Modules for Native Code
- Prefer Expo modules over direct native code when possible
- Consistent API across platforms
- Type-safe JavaScript ↔ Native bridging
- Built-in auto-linking

## React Native Architecture

### Three-Layer Architecture for RN + Modules

```
┌─────────────────────────────────┐
│    React Native (TypeScript)    │
│  • UI Components (Screens)      │
│  • Business Logic               │
│  • State Management             │
└────────────┬────────────────────┘
             │ (module API calls)
┌────────────▼────────────────────┐
│     Expo Module Bridge          │
│  • Type Conversion              │
│  • Promise Handling             │
│  • Event Emission               │
└────────────┬────────────────────┘
             │ (native calls)
┌────────────▼────────────────────┐
│    Native Modules               │
│  • Kotlin (Android)             │
│  • Swift (iOS)                  │
│  • Platform-specific Features   │
└─────────────────────────────────┘
```

### Data Flow

```
TypeScript          Native Module
┌──────────┐        ┌──────────┐
│  State   │──────→ │ Data     │
│  (val)   │ Types  │ (types)  │
└──────────┘ Map    └──────────┘
     ↑       ↑           │
     │       └───────────┤
     └───────────────────┘
     Convert results back
```

## Expo Modules Integration

### Module API Types

Expo modules support automatic conversion of types:

**Primitives:**
```typescript
// TypeScript → Kotlin
boolean → Boolean
number → Int | Float | Double
string → String
```

**Complex Types:**
```typescript
// TypeScript → Kotlin
Record<string, any> → Map<String, Any>
Uint8Array → kotlin.ByteArray
[A, B] → kotlin.Pair<A, B>
```

**Async Operations:**
```typescript
// Promise-based module methods
async function doSomething(): Promise<string> {
  const result = await ModuleApi.nativeOperation();
  return result;
}
```

### Type-Safe Module Definition

```typescript
// Define module interface in TypeScript
import { NativeModulesProxy } from 'expo-modules-core';

type MyModuleType = {
  multiply(a: number, b: number): Promise<number>;
  greet(name: string): string;
  onEventListener(listener: (event: Event) => void): void;
};

const MyModule = NativeModulesProxy.get<MyModuleType>('MyModule');
```

## React Native Best Practices

### 1. State Management

**Local Component State:**
```typescript
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>{count}</Text>
      <Button onPress={() => setCount(count + 1)} title="Increment" />
    </View>
  );
}
```

**Global State (Redux/Zustand):**
```typescript
// Zustand example
const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export function UserScreen() {
  const { user, setUser } = useStore();
  // ...
}
```

### 2. Async Operations

**Native Module Calls:**
```typescript
async function getLocation() {
  try {
    const location = await ExpoLocation.getCurrentLocationAsync();
    return location;
  } catch (error) {
    console.error('Location error:', error);
  }
}
```

**HTTP Requests:**
```typescript
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data as User;
}
```

### 3. Error Handling

```typescript
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError);
  }, [userId]);

  if (error) return <ErrorScreen error={error} />;
  if (!user) return <LoadingScreen />;

  return <ProfileContent user={user} />;
}
```

### 4. Navigation

**Expo Router (File-based routing):**
```typescript
// app/(screens)/user/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ...
}
```

**React Navigation:**
```typescript
const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
    </Stack.Navigator>
  );
}
```

## Native Module Integration

### Type Mapping Between TypeScript and Kotlin

**Built-in Convertibles:**
```typescript
// TypeScript interfaces for native modules
export interface FileData {
  content: Uint8Array;     // ↔ kotlin.ByteArray
  mimeType: string;        // ↔ String
  metadata: Record<string, any>;  // ↔ Map<String, Any>
}

export interface LocationPoint {
  latitude: number;        // ↔ Float/Double
  longitude: number;       // ↔ Float/Double
  altitude?: number;       // ↔ Float? = null
}
```

**Promise-based Async Calls:**
```kotlin
// Kotlin native module
class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Function("getFileData") { filePath: String ->
      return@Function FileData(...)  // Auto-converted to JS
    }

    AsyncFunction("fetchUserAsync") { userId: String ->
      // Async operation - returns Promise to TypeScript
      val user = fetchUserFromServer(userId)
      return@AsyncFunction user
    }
  }
}
```

```typescript
// TypeScript usage
import { MyModule } from './MyModule';

const fileData = MyModule.getFileData('/path/to/file');
const user = await MyModule.fetchUserAsync('123');
```

### Event Emission

**Kotlin:**
```kotlin
class SensorModule : Module() {
  override fun definition() = ModuleDefinition {
    Events("onSensorData")

    AsyncFunction("startListening") {
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          sendEvent("onSensorData", mapOf(
            "x" to event.values[0],
            "y" to event.values[1],
            "z" to event.values[2]
          ))
        }
      }
      sensorManager.registerListener(listener, sensor)
    }
  }
}
```

**TypeScript:**
```typescript
import { useEffect } from 'react';
import { NativeModulesProxy, useNativeEvent } from 'expo-modules-core';

export function SensorScreen() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  useNativeEvent('SensorModule', 'onSensorData', setSensorData);

  useEffect(() => {
    SensorModule.startListening();
  }, []);

  return <SensorDataDisplay data={sensorData} />;
}
```

## Testing Strategies

### Unit Testing (JavaScript/TypeScript)

```typescript
import { describe, it, expect } from '@jest/globals';

describe('UserService', () => {
  it('transforms API response to User type', async () => {
    const response = { id: '123', name: 'John' };
    const user = transformUser(response);

    expect(user).toEqual({
      id: '123',
      name: 'John',
      verified: false
    });
  });
});
```

### Integration Testing (Native Module Calls)

```typescript
describe('ExpoLocation', () => {
  it('returns valid location coordinates', async () => {
    const location = await ExpoLocation.getCurrentLocationAsync();

    expect(location.coords.latitude).toBeDefined();
    expect(location.coords.longitude).toBeDefined();
    expect(Math.abs(location.coords.latitude) <= 90).toBe(true);
  });
});
```

### End-to-End Testing (Detox)

```typescript
describe('User Profile E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display user profile after navigation', async () => {
    await element(by.text('Users')).tap();
    await element(by.text('John Doe')).tap();

    await expect(element(by.text('john@example.com'))).toBeVisible();
  });
});
```

## Common Patterns

### 1. Module with Callback

```typescript
// TypeScript
type LocationCallback = (location: Location) => void;

interface LocationModule {
  startTracking(callback: LocationCallback): void;
  stopTracking(): void;
}

// Usage
useEffect(() => {
  const unsubscribe = LocationModule.startTracking((location) => {
    setCurrentLocation(location);
  });

  return () => {
    LocationModule.stopTracking();
    unsubscribe?.();
  };
}, []);
```

### 2. Type-Safe Data Conversion

```typescript
// Define shared types
export interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
}

// Use consistently in both layers
const user: User = await UserModule.getUser('123');
```

### 3. Error Boundaries

```typescript
export class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error:', error);
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }

    return this.props.children;
  }
}
```

## Performance Optimization

### 1. Lazy Loading

```typescript
const UserProfile = lazy(() => import('./UserProfile'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile />
    </Suspense>
  );
}
```

### 2. Native Module Batching

```typescript
// Instead of multiple calls
const user = await UserModule.getUser('123');
const posts = await PostModule.getUserPosts('123');

// Batch operations
const [user, posts] = await UserModule.getUserWithPosts('123');
```

### 3. Image Optimization

```typescript
import { Image } from 'react-native';

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
  resizeMode="contain"
/>
```

## Production Deployment

### EAS Build

```bash
# Configure app.json
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "1.0.0",
    "plugins": [
      [
        "expo-modules-core",
        {
          "modules": ["@myorg/my-module"]
        }
      ]
    ]
  }
}

# Build for production
eas build --platform all
```

### Play Store/App Store Submission

1. Configure app.json with proper metadata
2. Generate signing keys
3. Build production app
4. Submit to store

## Project-Specific Patterns

### Hold-to-Toggle UI Pattern

```typescript
import { useRef, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export function HoldToToggle({ duration = 3000, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressIn = () => {
    startTimeRef.current = Date.now();
    setIsHolding(true);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);

        if (newProgress >= 1) {
          clearInterval(intervalRef.current!);
          onComplete?.();
        }
      }
    }, 50);
  };

  const handlePressOut = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
    setIsHolding(false);
    startTimeRef.current = null;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const countdown = Math.ceil((duration / 1000) * (1 - progress));

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Text>{isHolding ? `${countdown}s` : 'Hold to activate'}</Text>
    </Pressable>
  );
}
```

**Key Points:**
- Use `Pressable` with `onPressIn`/`onPressOut` (not TouchableOpacity)
- setInterval at 50ms for smooth animation
- Store start time in ref, calculate progress as `(Date.now() - startTime) / duration`
- Must clear interval on release AND on component unmount

### Circular Progress with SVG

```typescript
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  progress: number;  // 0 to 1
  size: number;
  strokeWidth: number;
  color: string;
}

export function CircularProgress({ progress, size, strokeWidth, color }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E0E0E0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}
```

**Key Points:**
- `strokeDasharray={circumference}` and `strokeDashoffset={circumference * (1 - progress)}`
- Rotate -90 degrees to start from top: `rotation="-90" origin="center"`
- Use `strokeLinecap="round"` for rounded ends

### Schedule Checking with Overnight Handling

```typescript
function isScheduleActive(schedule: Schedule): boolean {
  const now = new Date();
  const currentDay = now.getDay();  // 0 = Sunday

  if (!schedule.days.includes(currentDay)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Normal schedule (same day)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Check every 60 seconds
useEffect(() => {
  const interval = setInterval(() => {
    const activeSchedule = schedules.find(isScheduleActive);
    if (activeSchedule && !isBlocking) {
      setActiveProfile(activeSchedule.profileId);
      setIsBlocking(true);
    }
  }, 60000);

  return () => clearInterval(interval);
}, [schedules, isBlocking]);
```

### Parallel AsyncStorage Loading

```typescript
async function loadData() {
  const [profilesJson, settingsJson, activeId] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.PROFILES),
    AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
    AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID),
  ]);

  if (profilesJson) setProfiles(JSON.parse(profilesJson));
  if (settingsJson) setSettings(JSON.parse(settingsJson));
  if (activeId) setActiveProfileId(activeId);
}
```

## Common Mistakes to Avoid

### ❌ Direct Native Code Instead of Modules

```typescript
// WRONG - Direct native bridge
import { NativeModules } from 'react-native';
const { MyModule } = NativeModules;

// RIGHT - Use Expo modules
import { MyModule } from 'expo-my-module';
```

### ❌ Type Mismatches Across Boundary

```typescript
// WRONG - No type safety
const result = await NativeModule.doSomething();
console.log(result.foo.bar.baz);  // Runtime error if structure differs

// RIGHT - Type-safe interface
interface Result {
  foo?: { bar?: { baz?: string } };
}
const result: Result = await NativeModule.doSomething();
console.log(result.foo?.bar?.baz);  // Type-safe
```

### ❌ Blocking Main Thread with Async

```typescript
// WRONG - Blocking UI
function handlePress() {
  const data = NativeModule.fetchData();  // Blocks UI
  setData(data);
}

// RIGHT - Non-blocking
function handlePress() {
  NativeModule.fetchDataAsync().then(setData);
}
```

### ❌ Memory Leaks with Listeners

```typescript
// WRONG - Listener never removed
useEffect(() => {
  NativeModule.addEventListener('event', handleEvent);
  // No cleanup
}, []);

// RIGHT - Proper cleanup
useEffect(() => {
  const subscription = NativeModule.addEventListener('event', handleEvent);
  return () => subscription.remove();
}, []);
```

### ❌ No Error Handling for Native Calls

```typescript
// WRONG
const result = await NativeModule.operation();

// RIGHT
try {
  const result = await NativeModule.operation();
} catch (error) {
  console.error('Native operation failed:', error);
  // Handle error appropriately
}
```

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [React Native Community](https://github.com/react-native-community/)
- [Expo Snack](https://snack.expo.dev/) - Online editor
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox E2E Testing](https://wix.github.io/Detox/)

## Sources

- [React Native Official Documentation](https://reactnative.dev/)
- [Expo Modules Bridging](https://docs.expo.dev/modules/module-api/)
- [Callstack: React Native Native Modules with Kotlin](https://www.callstack.com/blog/writing-a-native-module-for-react-native-using-kotlin)
