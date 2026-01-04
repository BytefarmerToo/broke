# Kotlin Expo Modules Expert Agent - Knowledge Base

This document codifies the expertise of the Kotlin Expo Modules Expert agent, focused on developing native modules for React Native/Expo applications.

## Context: Expo Modules, Not Full Android Apps

This agent specializes in **Expo native modules** - reusable Kotlin code that bridges to React Native TypeScript. It is NOT for:
- Full Android app architecture (that's `react-native-expert`)
- Android UI development (that's React Native)
- Android framework lifecycle management
- MVVM/Repository patterns (handled in React Native layer)

## Core Principles

### 1. Type-Safe Bridging
- **TypeScript-Kotlin Type Parity**: Types must align across boundary
- **Explicit Conversion**: Clear type mappings for all conversions
- **No Silent Failures**: Type system prevents incompatibilities
- **API Contracts**: JavaScript interfaces define module behavior

### 2. Kotlin Philosophy for Modules
- **Null Safety**: Use Kotlin's type system to prevent null pointer exceptions
- **Immutability**: Prefer `val` over `var`
- **Functional Concepts**: Use lambdas and extension functions for clarity
- **Conciseness**: Write expressive code with minimal boilerplate

### 3. Promise-Based Async
- **Non-Blocking Operations**: All async operations return Promises
- **Error Handling**: Proper error propagation to JavaScript layer
- **Cancellation Support**: Allow cancelling long-running operations
- **Timeout Management**: Prevent hanging operations

## Expo Module Architecture

### Module Components

```
TypeScript Interface (API Contract)
         ↓
    Expo Module Bridge
         ↓
  Kotlin Module Implementation
         ↓
  Android SDK / Platform APIs
```

### Type Mapping: TypeScript ↔ Kotlin

**Primitives:**
```typescript
// TypeScript → Kotlin
boolean     → Boolean
number      → Int | Float | Double
string      → String
void        → Unit
```

**Collections:**
```typescript
// TypeScript → Kotlin
string[]              → Array<String>
number[]              → IntArray | FloatArray
Record<string, any>   → Map<String, Any>
[A, B]                → Pair<A, B>
```

**Special Types:**
```typescript
// TypeScript → Kotlin
Uint8Array     → kotlin.ByteArray
Promise<T>     → Returns to JS automatically
Date           → Long (milliseconds)
null/undefined → Nullable types with ?
```

### Module Structure

```
src/main/java/expo/modules/mymodule/
├── MyModule.kt          # Module implementation
├── MyModulePackage.kt   # Package provider
└── types/
    ├── MyData.kt        # Data models
    └── Converters.kt    # Type converters
```

### Basic Module Implementation

```kotlin
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    // Synchronous function
    Function("greet") { name: String ->
      "Hello, $name!"
    }

    // Asynchronous function (returns Promise)
    AsyncFunction("fetchData") { userId: String ->
      // Async operation
      val data = fetchUserFromServer(userId)
      return@AsyncFunction data
    }

    // Emit events to JavaScript listeners
    Events("onDataChanged", "onError")

    // Event listener registration
    AsyncFunction("startListening") {
      startObservingData { data ->
        sendEvent("onDataChanged", mapOf("data" to data))
      }
    }
  }

  private fun fetchUserFromServer(userId: String): Map<String, Any> {
    // Implementation
    return mapOf("id" to userId, "name" to "John")
  }
}
```

### TypeScript Interface (API Contract)

```typescript
// Always define TypeScript interface for module
export interface MyModuleType {
  greet(name: string): string;
  fetchData(userId: string): Promise<UserData>;
  startListening(): Promise<void>;
  onDataChanged(callback: (event: DataEvent) => void): Subscription;
}

// Type-safe usage in React Native
import { MyModule } from 'expo-my-module';

const greeting = MyModule.greet("Alice");
const userData = await MyModule.fetchData("123");

MyModule.onDataChanged((event) => {
  // event is type-safe
  console.log(event.data);
});
```

## Module Patterns

### 1. Simple Data Operation

```kotlin
data class Location(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float
)

class LocationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Location")

    AsyncFunction("getCurrentLocation") { ->
      val location = getLocationFromAndroid()
      mapOf(
          "latitude" to location.latitude,
          "longitude" to location.longitude,
          "accuracy" to location.accuracy
      )
    }
  }
}
```

```typescript
// TypeScript usage
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const location = await Location.getCurrentLocation() as LocationData;
```

### 2. Event Emission

```kotlin
class SensorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Sensor")

    Events("onSensorData")

    AsyncFunction("startMonitoring") {
      val listener = SensorEventListener { event ->
        sendEvent("onSensorData", mapOf(
            "x" to event.x,
            "y" to event.y,
            "z" to event.z
        ))
      }
      registerListener(listener)
    }
  }
}
```

```typescript
// TypeScript listener
interface SensorEvent {
  x: number;
  y: number;
  z: number;
}

const subscription = SensorModule.addEventListener("onSensorData", (event: SensorEvent) => {
  console.log(`Sensor: ${event.x}, ${event.y}, ${event.z}`);
});

// Clean up
return () => subscription.remove();
```

### 3. Type-Safe Data Classes

```kotlin
// Kotlin data class
data class UserProfile(
    val id: String,
    val name: String,
    val email: String,
    val verified: Boolean
)

// Convert to Map for JavaScript
fun UserProfile.toMap(): Map<String, Any> = mapOf(
    "id" to id,
    "name" to name,
    "email" to email,
    "verified" to verified
)

// Usage in module
AsyncFunction("getUserProfile") { userId: String ->
    val profile = fetchProfileFromDatabase(userId)
    return@AsyncFunction profile.toMap()
}
```

```typescript
// TypeScript interface matches exactly
interface UserProfile {
  id: string;
  name: string;
  email: string;
  verified: boolean;
}

// Type-safe usage
const profile: UserProfile = await UserModule.getUserProfile("123");
```

### 4. Error Handling

```kotlin
AsyncFunction("riskyOperation") {
    try {
        val result = performRiskyTask()
        return@AsyncFunction mapOf("success" to true, "data" to result)
    } catch (e: IOException) {
        throw IllegalStateException("Network error: ${e.message}")
    } catch (e: Exception) {
        throw RuntimeException("Unexpected error: ${e.message}")
    }
}
```

```typescript
try {
  const result = await MyModule.riskyOperation();
  console.log("Success:", result.data);
} catch (error) {
  if (error instanceof Error) {
    console.error("Operation failed:", error.message);
  }
}
```

### 5. Asynchronous with Coroutines

```kotlin
import kotlinx.coroutines.launch

AsyncFunction("downloadFile") { url: String ->
    coroutineScope.launch {
        try {
            val file = downloadFromUrl(url)
            return@launch mapOf("path" to file.absolutePath)
        } catch (e: Exception) {
            throw DownloadException(e.message)
        }
    }
}
```

## Testing Kotlin Modules

### Unit Test for Module Function

```kotlin
import org.junit.Test
import com.google.common.truth.Truth.assertThat
import io.mockk.mockk

class MyModuleTest {
    private val module = MyModule()

    @Test
    fun `greet returns correct greeting`() {
        val result = module.greet("Alice")
        assertThat(result).isEqualTo("Hello, Alice!")
    }
}
```

### Async Function Testing

```kotlin
import kotlinx.coroutines.test.runTest
import io.mockk.*

class LocationModuleTest {
    @Test
    fun `getCurrentLocation returns valid data`() = runTest {
        val module = LocationModule()
        val location = module.getCurrentLocation()

        assertThat(location["latitude"]).isNotNull()
        assertThat(location["longitude"]).isNotNull()
    }
}
```

### Mock Event Emission

```kotlin
@Test
fun `onSensorData events emit correctly`() = runTest {
    val module = SensorModule()
    val events = mutableListOf<Map<String, Any>>()

    // Mock sendEvent
    module.testSendEvent = { name, data ->
        if (name == "onSensorData") {
            events.add(data)
        }
    }

    module.startMonitoring()
    // Simulate sensor data
    module.simulateSensorEvent(1.0f, 2.0f, 3.0f)

    assertThat(events).hasSize(1)
    assertThat(events[0]["x"]).isEqualTo(1.0f)
}
```

## Best Practices

### ✅ Type Safety Across Boundary

```kotlin
// GOOD - Explicit type mapping
data class User(val id: String, val name: String)

fun User.toJSMap(): Map<String, Any> = mapOf(
    "id" to id,
    "name" to name
)

AsyncFunction("getUser") { userId: String ->
    val user = fetchUser(userId)
    return@AsyncFunction user.toJSMap()
}
```

### ✅ Null Safety

```kotlin
// GOOD - Explicit null handling
AsyncFunction("getUserEmail") { userId: String ->
    val user = fetchUser(userId)
    return@AsyncFunction mapOf(
        "email" to (user?.email ?: ""),
        "exists" to (user != null)
    )
}
```

### ✅ Proper Error Propagation

```kotlin
AsyncFunction("operation") {
    try {
        val result = doOperation()
        return@AsyncFunction result
    } catch (e: OperationException) {
        throw OperationException("Operation failed: ${e.message}")
    }
}
```

### ❌ Avoid: Type Confusion

```kotlin
// WRONG - Loose typing
AsyncFunction("getData") {
    val data = fetchData()
    return@AsyncFunction data  // What type is this?
}
```

### ❌ Avoid: Silent Failures

```kotlin
// WRONG - No error handling
AsyncFunction("riskyOp") {
    val result = riskyOperation()  // Throws but doesn't propagate
    return@AsyncFunction result
}
```

### ❌ Avoid: Blocking Operations

```kotlin
// WRONG - Blocks event loop
AsyncFunction("getFile") { path: String ->
    val content = File(path).readBytes()  // Synchronous, blocks
    return@AsyncFunction content
}

// RIGHT - Use async
AsyncFunction("getFile") { path: String ->
    val content = withContext(Dispatchers.IO) {
        File(path).readBytes()  // Non-blocking
    }
    return@AsyncFunction content
}
```

## Android-Specific Patterns

### Accessibility Service for App Blocking

```kotlin
class AppBlockerService : AccessibilityService() {
    companion object {
        @Volatile
        var instance: AppBlockerService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return
            if (isPackageBlocked(packageName)) {
                // Return to home screen
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
        }
    }

    private fun isPackageBlocked(packageName: String): Boolean {
        // Use SharedPreferences for state (service runs in separate process)
        val prefs = getSharedPreferences("app_blocker", Context.MODE_PRIVATE)
        val blockedPackages = prefs.getStringSet("blocked_packages", emptySet()) ?: emptySet()
        return packageName in blockedPackages
    }
}
```

**Key Points:**
- Service runs in separate process from the app
- Must use SharedPreferences for state sharing (not in-memory variables)
- Companion object with `@Volatile` for instance reference
- Config XML required at `res/xml/accessibility_service_config.xml`

### Package Visibility (API 30+)

Android 11+ restricts which packages an app can query. To list all installed apps:

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

```kotlin
// Without QUERY_ALL_PACKAGES, this returns limited results
val packages = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
```

### Config Plugin for AndroidManifest

Don't edit `android/app/src/main/AndroidManifest.xml` directly. Use Expo config plugins:

```javascript
// plugins/withAppBlocker.js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAppBlocker(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    // Add permissions, services, etc.
    return config;
  });
};
```

Run `npx expo prebuild` to regenerate after changes.

## Common Mistakes

### ❌ Breaking Type Contract

```kotlin
// WRONG - TypeScript expects number, gets String
AsyncFunction("getCount") {
    return@AsyncFunction "5"  // Should be 5
}

// RIGHT - Match TypeScript interface
AsyncFunction("getCount") {
    return@AsyncFunction 5
}
```

### ❌ Forgetting to Handle Null

```kotlin
// WRONG - May crash if null
data class Result(val value: String)
AsyncFunction("process") { ->
    val result = findResult()!!  // Crash if null
    return@AsyncFunction result.value
}

// RIGHT - Explicit null handling
AsyncFunction("process") { ->
    val result = findResult()
    return@AsyncFunction mapOf(
        "value" to (result?.value ?: ""),
        "found" to (result != null)
    )
}
```

### ❌ Memory Leaks with Listeners

```kotlin
// WRONG - Listener never removed
AsyncFunction("startListening") {
    val listener = DataListener { data ->
        sendEvent("onData", data)
    }
    addListener(listener)
    // No way to remove listener!
}

// RIGHT - Allow removal
AsyncFunction("stopListening") {
    removeListener()
}
```

## Resources

- [Expo Modules Overview](https://docs.expo.dev/modules/overview/)
- [Expo Module API](https://docs.expo.dev/modules/module-api/)
- [Expo Get Started](https://docs.expo.dev/modules/get-started/)
- [Kotlin Documentation](https://kotlinlang.org/docs/)
- [Expo Modules Examples](https://github.com/expo/expo/tree/main/packages/expo-modules-core)
- [React Native Bridging](https://reactnative.dev/docs/native-modules-android)

## Sources

- [Expo Modules Documentation](https://docs.expo.dev/modules/)
- [Callstack: React Native Native Modules with Kotlin](https://www.callstack.com/blog/writing-a-native-module-for-react-native-using-kotlin)
- [React Native: Two-Way Bridging with Android Native Modules](https://dev.to/amitkumar13/react-native-079-new-architecture-bridging-with-android-native-modules-11ih)
