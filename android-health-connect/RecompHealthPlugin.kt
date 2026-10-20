// Optional native Android source for a future Capacitor wrapper.
// Not compiled by the PWA GitHub Pages build. Android Studio device testing required.
// Register RecompHealthPlugin in your Capacitor BridgeActivity and add the Health Connect SDK.
// Read-only; uses aggregated steps to avoid double counting devices.
package com.recomp.health

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "RecompHealth")
class RecompHealthPlugin : Plugin() {
    private val io = CoroutineScope(Dispatchers.IO)
    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
    )

    @PluginMethod
    fun readDailyActivity(call: PluginCall) {
        val date = try { LocalDate.parse(call.getString("date") ?: "") }
            catch (_: Exception) { call.reject("Choose a valid date."); return }
        val now = LocalDate.now(ZoneId.systemDefault())
        if (date.isAfter(now) || date.isBefore(now.minusDays(29))) {
            call.reject("Select a date within the last 30 days."); return
        }
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is unavailable. Install or update it on this phone."); return
        }
        io.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(requiredPermissions)) {
                    withContext(Dispatchers.Main) {
                        val contract = PermissionController.createRequestPermissionResultContract()
                        val intent: Intent = contract.createIntent(context, requiredPermissions)
                        startActivityForResult(call, intent, "permissionsResult")
                    }
                } else {
                    readAggregate(call, client, date)
                }
            } catch (e: Exception) {
                call.reject("Health Connect could not open: " + (e.message ?: "unknown error"))
            }
        }
    }

    @ActivityCallback
    private fun permissionsResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val granted = PermissionController.createRequestPermissionResultContract()
            .parseResult(result.resultCode, result.data)
        if (!granted.containsAll(requiredPermissions)) {
            call.reject("Step and active-calorie read permissions were not granted."); return
        }
        // The user has explicitly approved both read permissions.
        val date = try { LocalDate.parse(call.getString("date") ?: "") }
            catch (_: Exception) { call.reject("Invalid date."); return }
        io.launch {
            try { readAggregate(call, HealthConnectClient.getOrCreate(context), date) }
            catch (e: Exception) { call.reject("Unable to read Health Connect activity: " + (e.message ?: "unknown error")) }
        }
    }

    private suspend fun readAggregate(call: PluginCall, client: HealthConnectClient, date: LocalDate) {
        try {
            val zone = ZoneId.systemDefault()
            val from = date.atStartOfDay(zone).toInstant()
            val to = date.plusDays(1).atStartOfDay(zone).toInstant()
            val response = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL, ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(from, to)
                )
            )
            val steps = response[StepsRecord.COUNT_TOTAL] ?: 0L
            val calories = response[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
            val result = JSObject().apply {
                put("date", date.toString());put("steps", steps)
                put("activeCalories", calories)
            }
            withContext(Dispatchers.Main) { call.resolve(result) }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) { call.reject("Unable to read Health Connect activity: " + (e.message ?: "unknown error")) }
        }
    }
}
