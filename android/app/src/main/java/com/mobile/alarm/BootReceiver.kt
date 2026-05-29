package com.mobile.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver for BOOT_COMPLETED - reschedules all alarms after device reboot
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action
    val isBoot =
      action == Intent.ACTION_BOOT_COMPLETED ||
      action == Intent.ACTION_MY_PACKAGE_REPLACED ||
      action == "android.intent.action.QUICKBOOT_POWERON" ||
      action == "com.htc.intent.action.QUICKBOOT_POWERON"

    if (isBoot) {
      Log.d("BootReceiver", "📱 Device booted, marking alarms for rescheduling...")

      try {
        // Note: We can't directly call scheduleAlarm from here since we need ReactApplicationContext
        // Instead, we'll store a flag that the app should reschedule alarms on next launch
        val prefs = context.getSharedPreferences("alarm_prefs", Context.MODE_PRIVATE)
        val alarmKeys = prefs.all.keys.filter { it.startsWith("alarm_") }
        prefs.edit().putBoolean("needs_reschedule", true).apply()

        Log.d("BootReceiver", "✅ Marked ${alarmKeys.size} alarms for rescheduling on next app launch")
      } catch (e: Exception) {
        Log.e("BootReceiver", "❌ Error in boot receiver: ${e.message}", e)
      }
    }
  }
}
