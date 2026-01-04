package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppBlockerModule : Module() {
    companion object {
        private const val PREFS_NAME = "AppBlockerPrefs"
        private const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val KEY_IS_BLOCKING = "is_blocking"
        private const val KEY_SCHEDULES = "schedules"
        private const val KEY_SCHEDULE_ENABLED = "schedule_enabled"
        private const val KEY_MANUAL_LOCK = "manual_lock"
    }

    private val context: Context
        get() = requireNotNull(appContext.reactContext)

    private val prefs: SharedPreferences
        get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        Function("isAccessibilityEnabled") {
            isAccessibilityServiceEnabled()
        }

        AsyncFunction("openAccessibilitySettings") {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        }

        AsyncFunction("setBlocking") { isBlocking: Boolean ->
            prefs.edit().putBoolean(KEY_IS_BLOCKING, isBlocking).apply()
            AppBlockerService.getInstance()?.setBlocking(isBlocking)
            true
        }

        Function("isBlocking") {
            prefs.getBoolean(KEY_IS_BLOCKING, false)
        }

        AsyncFunction("setBlockedPackages") { packages: List<String> ->
            val packageSet = packages.toSet()
            prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, packageSet).apply()
            AppBlockerService.getInstance()?.setBlockedPackages(packageSet)
            true
        }

        Function("getBlockedPackages") {
            prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet())?.toList() ?: emptyList<String>()
        }

        Function("getInstalledApps") {
            getInstalledAppsList()
        }

        AsyncFunction("setSchedules") { schedulesJson: String ->
            prefs.edit().putString(KEY_SCHEDULES, schedulesJson).apply()
            AppBlockerService.getInstance()?.setSchedules(schedulesJson)
            true
        }

        AsyncFunction("setScheduleEnabled") { enabled: Boolean ->
            prefs.edit().putBoolean(KEY_SCHEDULE_ENABLED, enabled).apply()
            AppBlockerService.getInstance()?.setScheduleEnabled(enabled)
            true
        }

        AsyncFunction("setManualLock") { manual: Boolean ->
            prefs.edit().putBoolean(KEY_MANUAL_LOCK, manual).apply()
            AppBlockerService.getInstance()?.setManualLock(manual)
            true
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val serviceName = "${context.packageName}/${AppBlockerService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        return enabledServices?.contains(serviceName) == true
    }

    private fun getInstalledAppsList(): List<Map<String, Any>> {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)

        return apps.mapNotNull { app ->
            if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                mapOf(
                    "packageName" to app.packageName,
                    "name" to pm.getApplicationLabel(app).toString(),
                    "isSystem" to ((app.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
                )
            } else {
                null
            }
        }
    }
}
