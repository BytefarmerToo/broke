package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray
import java.util.Calendar

class AppBlockerService : AccessibilityService() {
    companion object {
        private const val PREFS_NAME = "AppBlockerPrefs"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_IS_BLOCKING = "is_blocking"
        private const val KEY_SCHEDULES = "schedules"
        private const val KEY_SCHEDULE_ENABLED = "schedule_enabled"
        private const val KEY_MANUAL_LOCK = "manual_lock"
        private const val KEY_BLOCKED_CATEGORIES = "blocked_categories"
        private const val KEY_BLOCKED_APP_NAMES = "blocked_app_names"

        @Volatile
        private var instance: AppBlockerService? = null

        fun getInstance(): AppBlockerService? = instance
    }

    data class Schedule(
        val id: String,
        val enabled: Boolean,
        val days: List<Int>,
        val startTime: String,
        val blockedPackages: List<String>,
        val blockedCategories: List<Int>,
        val blockedAppNames: List<String>
    )

    private lateinit var prefs: SharedPreferences
    private var blockedPackages: Set<String> = emptySet()
    private var blockedCategories: Set<Int> = emptySet()
    private var blockedAppNames: Set<String> = emptySet()
    private var isBlocking: Boolean = false
    private var schedules: List<Schedule> = emptyList()
    private var scheduleEnabled: Boolean = true
    private var manualLock: Boolean = false

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadSettings()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            // Check schedules if enabled and not manually locked
            if (scheduleEnabled && !manualLock) {
                checkAndApplySchedules()
            }

            // Block app if blocking is active
            if (isBlocking) {
                val packageName = event.packageName?.toString()
                if (packageName != null) {
                    // Check package name match
                    if (blockedPackages.contains(packageName)) {
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        return
                    }

                    // Check app name (label) match
                    val appLabel = getAppLabel(packageName)
                    if (appLabel != null && blockedAppNames.any { it.equals(appLabel, ignoreCase = true) }) {
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        return
                    }

                    // Check category match
                    val category = getAppCategory(packageName)
                    if (category != null && blockedCategories.contains(category)) {
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        return
                    }
                }
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
        scheduleEnabled = prefs.getBoolean(KEY_SCHEDULE_ENABLED, true)
        manualLock = prefs.getBoolean(KEY_MANUAL_LOCK, false)

        val categoriesSet = prefs.getStringSet(KEY_BLOCKED_CATEGORIES, null)
        blockedCategories = categoriesSet?.mapNotNull {
            try {
                it.toInt()
            } catch (e: Exception) {
                null
            }
        }?.toSet() ?: emptySet()

        blockedAppNames = prefs.getStringSet(KEY_BLOCKED_APP_NAMES, emptySet()) ?: emptySet()

        val schedulesJson = prefs.getString(KEY_SCHEDULES, null)
        if (schedulesJson != null) {
            schedules = parseSchedulesJson(schedulesJson)
        }
    }

    private fun checkAndApplySchedules() {
        val activeSchedule = findActiveSchedule()
        if (activeSchedule != null && !isBlocking) {
            // Schedule started - enable blocking with schedule's packages, categories, and app names
            blockedPackages = activeSchedule.blockedPackages.toSet()
            blockedCategories = activeSchedule.blockedCategories.toSet()
            blockedAppNames = activeSchedule.blockedAppNames.toSet()
            isBlocking = true
            prefs.edit()
                .putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages)
                .putStringSet(KEY_BLOCKED_CATEGORIES, blockedCategories.map { it.toString() }.toSet())
                .putStringSet(KEY_BLOCKED_APP_NAMES, blockedAppNames)
                .putBoolean(KEY_IS_BLOCKING, true)
                .apply()
        }
    }

    private fun findActiveSchedule(): Schedule? {
        val calendar = Calendar.getInstance()
        // Calendar.DAY_OF_WEEK: Sunday=1, Saturday=7
        // Our format: Sunday=0, Saturday=6
        val currentDay = calendar.get(Calendar.DAY_OF_WEEK) - 1
        val currentMinutes = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE)

        return schedules
            .filter { it.enabled && it.days.contains(currentDay) }
            .filter { parseTimeToMinutes(it.startTime) <= currentMinutes }
            .maxByOrNull { parseTimeToMinutes(it.startTime) }
    }

    private fun parseTimeToMinutes(time: String): Int {
        val parts = time.split(":")
        return parts[0].toInt() * 60 + parts[1].toInt()
    }

    private fun parseSchedulesJson(json: String): List<Schedule> {
        val result = mutableListOf<Schedule>()
        try {
            val jsonArray = JSONArray(json)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val daysArray = obj.optJSONArray("days") ?: JSONArray()
                val days = mutableListOf<Int>()
                for (j in 0 until daysArray.length()) {
                    days.add(daysArray.getInt(j))
                }
                val packagesArray = obj.optJSONArray("blockedPackages") ?: JSONArray()
                val packages = mutableListOf<String>()
                for (j in 0 until packagesArray.length()) {
                    packages.add(packagesArray.getString(j))
                }
                val categoriesArray = obj.optJSONArray("blockedCategories") ?: JSONArray()
                val categories = mutableListOf<Int>()
                for (j in 0 until categoriesArray.length()) {
                    try {
                        categories.add(categoriesArray.getInt(j))
                    } catch (e: Exception) {
                        try {
                            categories.add(categoriesArray.getString(j).toInt())
                        } catch (e2: Exception) {
                            // ignore invalid entries
                        }
                    }
                }
                val appNamesArray = obj.optJSONArray("blockedAppNames") ?: JSONArray()
                val appNames = mutableListOf<String>()
                for (j in 0 until appNamesArray.length()) {
                    appNames.add(appNamesArray.getString(j))
                }
                result.add(
                    Schedule(
                        id = obj.getString("id"),
                        enabled = obj.getBoolean("enabled"),
                        days = days,
                        startTime = obj.getString("startTime"),
                        blockedPackages = packages,
                        blockedCategories = categories,
                        blockedAppNames = appNames
                    )
                )
            }
        } catch (e: Exception) {
            // Log error but don't crash
            e.printStackTrace()
        }
        return result
    }

    fun setSchedules(schedulesJson: String) {
        schedules = parseSchedulesJson(schedulesJson)
        prefs.edit().putString(KEY_SCHEDULES, schedulesJson).apply()
    }

    fun setScheduleEnabled(enabled: Boolean) {
        scheduleEnabled = enabled
        prefs.edit().putBoolean(KEY_SCHEDULE_ENABLED, enabled).apply()
    }

    fun setManualLock(manual: Boolean) {
        manualLock = manual
        prefs.edit().putBoolean(KEY_MANUAL_LOCK, manual).apply()
    }

    fun setBlockedPackages(packages: Set<String>) {
        blockedPackages = packages
        prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, packages).apply()
    }

    fun setBlockedCategories(categories: Set<Int>) {
        blockedCategories = categories
        prefs.edit().putStringSet(KEY_BLOCKED_CATEGORIES, categories.map { it.toString() }.toSet()).apply()
    }

    fun setBlockedAppNames(names: Set<String>) {
        blockedAppNames = names
        prefs.edit().putStringSet(KEY_BLOCKED_APP_NAMES, names).apply()
    }

    fun setBlocking(blocking: Boolean) {
        isBlocking = blocking
        prefs.edit().putBoolean(KEY_IS_BLOCKING, blocking).apply()
    }

    fun getBlockedPackages(): Set<String> = blockedPackages.toSet()

    fun getBlockedCategories(): Set<Int> = blockedCategories.toSet()

    fun getBlockedAppNames(): Set<String> = blockedAppNames.toSet()

    fun isCurrentlyBlocking(): Boolean = isBlocking

    private fun getAppLabel(packageName: String): String? {
        return try {
            val pm = packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(ai)?.toString()
        } catch (e: Exception) {
            null
        }
    }

    private fun getAppCategory(packageName: String): Int? {
        return try {
            val pm = packageManager
            val ai = pm.getApplicationInfo(packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ai.category
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
