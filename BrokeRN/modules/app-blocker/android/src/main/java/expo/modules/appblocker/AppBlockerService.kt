package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent

class AppBlockerService : AccessibilityService() {
    companion object {
        private const val PREFS_NAME = "AppBlockerPrefs"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_IS_BLOCKING = "is_blocking"

        @Volatile
        private var instance: AppBlockerService? = null

        fun getInstance(): AppBlockerService? = instance
    }

    private lateinit var prefs: SharedPreferences
    private var blockedPackages: Set<String> = emptySet()
    private var isBlocking: Boolean = false

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadSettings()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!isBlocking) return

        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString()
            if (packageName != null && blockedPackages.contains(packageName)) {
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
        }
    }

    override fun onInterrupt() {
        // Required override - no action needed
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        serviceInfo = info
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    private fun loadSettings() {
        blockedPackages = prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet()
        isBlocking = prefs.getBoolean(KEY_IS_BLOCKING, false)
    }

    fun setBlockedPackages(packages: Set<String>) {
        blockedPackages = packages
        prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, packages).apply()
    }

    fun setBlocking(blocking: Boolean) {
        isBlocking = blocking
        prefs.edit().putBoolean(KEY_IS_BLOCKING, blocking).apply()
    }

    fun getBlockedPackages(): Set<String> = blockedPackages.toSet()

    fun isCurrentlyBlocking(): Boolean = isBlocking
}
