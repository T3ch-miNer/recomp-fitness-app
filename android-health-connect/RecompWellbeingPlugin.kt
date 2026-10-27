package com.recomp.health

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.max
import kotlin.math.min

// Requires user-granted Usage Access, not a normal runtime permission.
// Raw app-usage records are NEVER returned to JavaScript or sent to the cloud.
@CapacitorPlugin(name = "RecompWellbeing")
class RecompWellbeingPlugin : Plugin() {
    private fun hasUsageAccess(): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
    }

    @PluginMethod
    fun openUsageSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .setData(Uri.parse("package:" + context.packageName))
            try { context.startActivity(intent) }
            catch (_: Exception) {
                context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Couldn't open Android Usage Access settings.")
        }
    }

    @PluginMethod
    fun readDay(call: PluginCall) {
        val day = try { LocalDate.parse(call.getString("date") ?: "") }
            catch (_: Exception) { call.reject("Invalid date."); return }
        val now = LocalDate.now(ZoneId.systemDefault())
        if (day.isAfter(now) || day.isBefore(now.minusDays(6))) {
            call.reject("Android only retains recent usage events. Choose a day from the last 7 days."); return
        }
        if (!hasUsageAccess()) {
            call.reject("Grant Recomp Usage Access in Android Settings, then tap Refresh usage."); return
        }

        try {
            val zone = ZoneId.systemDefault()
            val start = day.atStartOfDay(zone).toInstant().toEpochMilli()
            val end = min(day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), System.currentTimeMillis())
            val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            // Look back a day to detect a screen session that crosses midnight.
            val events = usage.queryEvents(start - 86_400_000L, end)
                ?: run { call.reject("Android did not provide usage events."); return }
            val event = UsageEvents.Event()
            var interactive = false
            var activeSince = start
            var activeMillis = 0L
            var unlocks = 0
            var screenEvents = 0
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val t = event.timeStamp
                when (event.eventType) {
                    UsageEvents.Event.SCREEN_INTERACTIVE -> {
                        if (t >= start) screenEvents++
                        if (!interactive) {
                            interactive = true
                            activeSince = max(t, start)
                        }
                    }
                    UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
                        if (t >= start) screenEvents++
                        if (interactive) {
                            activeMillis += max(0L, min(t, end) - max(activeSince, start))
                            interactive = false
                        }
                    }
                    UsageEvents.Event.KEYGUARD_HIDDEN -> {
                        if (t in start until end) unlocks++
                    }
                }
            }
            if (interactive) activeMillis += max(0L, end - max(activeSince, start))
            if (screenEvents == 0 && unlocks == 0) {
                call.reject("Android supplied no recent usage events. Check Usage Access and try again."); return
            }
            val result = JSObject().apply {
                put("date", day.toString())
                put("screenMinutes", (activeMillis / 60_000.0).coerceIn(0.0, 1440.0))
                put("unlocks", unlocks)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Unable to read Android usage statistics: " + (e.message ?: "unknown error"))
        }
    }
}
