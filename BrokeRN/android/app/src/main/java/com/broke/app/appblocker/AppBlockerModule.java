package com.broke.app.appblocker;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import android.content.Intent;

public class AppBlockerModule extends ReactContextBaseJavaModule {
    private static final String PREFS_NAME = "AppBlockerPrefs";
    private static final String KEY_BLOCKED_PACKAGES = "blocked_packages";
    private static final String KEY_IS_BLOCKING = "is_blocking";

    private final ReactApplicationContext reactContext;

    public AppBlockerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "AppBlocker";
    }

    @ReactMethod
    public void isAccessibilityEnabled(Promise promise) {
        try {
            String serviceName = reactContext.getPackageName() + "/" +
                AppBlockerService.class.getCanonicalName();

            String enabledServices = Settings.Secure.getString(
                reactContext.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );

            boolean isEnabled = enabledServices != null &&
                enabledServices.contains(serviceName);
            promise.resolve(isEnabled);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openAccessibilitySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setBlocking(boolean isBlocking, Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putBoolean(KEY_IS_BLOCKING, isBlocking).apply();

            AppBlockerService service = AppBlockerService.getInstance();
            if (service != null) {
                service.setBlocking(isBlocking);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isBlocking(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isBlocking = prefs.getBoolean(KEY_IS_BLOCKING, false);
            promise.resolve(isBlocking);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void setBlockedPackages(ReadableArray packages, Promise promise) {
        try {
            Set<String> packageSet = new HashSet<>();
            for (int i = 0; i < packages.size(); i++) {
                packageSet.add(packages.getString(i));
            }

            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, packageSet).apply();

            AppBlockerService service = AppBlockerService.getInstance();
            if (service != null) {
                service.setBlockedPackages(packageSet);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getBlockedPackages(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> packages = prefs.getStringSet(KEY_BLOCKED_PACKAGES, new HashSet<>());

            WritableArray result = Arguments.createArray();
            for (String pkg : packages) {
                result.pushString(pkg);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getInstalledApps(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);

            WritableArray result = Arguments.createArray();
            for (ApplicationInfo app : apps) {
                if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                    WritableMap appInfo = Arguments.createMap();
                    appInfo.putString("packageName", app.packageName);
                    appInfo.putString("name", pm.getApplicationLabel(app).toString());
                    appInfo.putBoolean("isSystem", (app.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
                    result.pushMap(appInfo);
                }
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
