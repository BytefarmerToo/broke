package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
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

        @Volatile
        private var instance: AppBlockerService? = null

        fun getInstance(): AppBlockerService? = instance
    }

    data class Schedule(
        val id: String,
        val enabled: Boolean,
        val days: List<Int>,
        val startTime: String,
        val blockedPackages: List<String>
    )

    private lateinit var prefs: SharedPreferences
    private var blockedPackages: Set<String> = emptySet()
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
                if (packageName != null && blockedPackages.contains(packageName)) {
                    performGlobalAction(GLOBAL_ACTION_HOME)
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
        val schedulesJson = prefs.getString(KEY_SCHEDULES, null)
        if (schedulesJson != null) {
            schedules = parseSchedulesJson(schedulesJson)
        }
    }

    private fun checkAndApplySchedules() {
        val activeSchedule = findActiveSchedule()
        if (activeSchedule != null && !isBlocking) {
            // Schedule started - enable blocking with schedule's packages
            blockedPackages = activeSchedule.blockedPackages.toSet()
            isBlocking = true
            prefs.edit()
                .putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages)
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
                val daysArray = obj.getJSONArray("days")
                val days = mutableListOf<Int>()
                for (j in 0 until daysArray.length()) {
                    days.add(daysArray.getInt(j))
                }
                val packagesArray = obj.getJSONArray("blockedPackages")
                val packages = mutableListOf<String>()
                for (j in 0 until packagesArray.length()) {
                    packages.add(packagesArray.getString(j))
                }
                result.add(
                    Schedule(
                        id = obj.getString("id"),
                        enabled = obj.getBoolean("enabled"),
                        days = days,
                        startTime = obj.getString("startTime"),
                        blockedPackages = packages
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

    fun setBlocking(blocking: Boolean) {
        isBlocking = blocking
        prefs.edit().putBoolean(KEY_IS_BLOCKING, blocking).apply()
    }

    fun getBlockedPackages(): Set<String> = blockedPackages.toSet()

    fun isCurrentlyBlocking(): Boolean = isBlocking
}
