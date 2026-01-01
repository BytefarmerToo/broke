package com.broke.app.appblocker;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.accessibility.AccessibilityEvent;
import java.util.HashSet;
import java.util.Set;

public class AppBlockerService extends AccessibilityService {
    private static final String PREFS_NAME = "AppBlockerPrefs";
    private static final String KEY_BLOCKED_PACKAGES = "blocked_packages";
    private static final String KEY_IS_BLOCKING = "is_blocking";

    private static AppBlockerService instance;
    private SharedPreferences prefs;
    private Set<String> blockedPackages = new HashSet<>();
    private boolean isBlocking = false;

    public static AppBlockerService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        loadBlockedPackages();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!isBlocking) return;

        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageName = event.getPackageName();
            if (packageName != null && blockedPackages.contains(packageName.toString())) {
                performGlobalAction(GLOBAL_ACTION_HOME);
            }
        }
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        setServiceInfo(info);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    private void loadBlockedPackages() {
        Set<String> saved = prefs.getStringSet(KEY_BLOCKED_PACKAGES, new HashSet<>());
        blockedPackages = new HashSet<>(saved);
        isBlocking = prefs.getBoolean(KEY_IS_BLOCKING, false);
    }

    public void setBlockedPackages(Set<String> packages) {
        blockedPackages = new HashSet<>(packages);
        prefs.edit()
            .putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages)
            .apply();
    }

    public void setBlocking(boolean blocking) {
        isBlocking = blocking;
        prefs.edit()
            .putBoolean(KEY_IS_BLOCKING, blocking)
            .apply();
    }

    public boolean isBlocking() {
        return isBlocking;
    }

    public Set<String> getBlockedPackages() {
        return new HashSet<>(blockedPackages);
    }
}
