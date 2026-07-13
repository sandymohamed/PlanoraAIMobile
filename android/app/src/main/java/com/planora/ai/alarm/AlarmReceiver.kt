package com.planora.ai.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.app.AlarmManager
import android.app.PendingIntent

/**
 * BroadcastReceiver that handles alarm firing from AlarmManager
 * This is called by Android OS even when the app is completely closed
 */
class AlarmReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    try {
      val alarmId = intent.getStringExtra("alarmId") ?: return
      val title = intent.getStringExtra("title") ?: "Alarm"
      val ringtoneUri = intent.getStringExtra("ringtoneUri")
      val recurrenceRule = intent.getStringExtra("recurrenceRule")

      Log.d("AlarmReceiver", "🔔 Alarm fired: $alarmId - $title")

      // Start AlarmPlayer service to play the alarm
      val alarmIntent = Intent(context, AlarmPlayerService::class.java).apply {
        putExtra("alarmId", alarmId)
        putExtra("title", title)
        putExtra("ringtoneUri", ringtoneUri)
        putExtra("recurrenceRule", recurrenceRule)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // Android 8.0+ - use startForegroundService
        context.startForegroundService(alarmIntent)
      } else {
        context.startService(alarmIntent)
      }

      // If recurring alarm, reschedule for next occurrence
      if (!recurrenceRule.isNullOrEmpty() && recurrenceRule != "none") {
        rescheduleRecurringAlarm(context, alarmId, title, ringtoneUri, recurrenceRule)
      }
    } catch (e: Exception) {
      Log.e("AlarmReceiver", "❌ Error handling alarm: ${e.message}", e)
    }
  }

  /**
   * Reschedule recurring alarm for next occurrence
   */
  private fun rescheduleRecurringAlarm(
    context: Context,
    alarmId: String,
    title: String,
    ringtoneUri: String?,
    recurrenceRule: String
  ) {
    try {
      // Calculate next occurrence based on recurrence rule
      val nextTimestamp = calculateNextOccurrence(recurrenceRule)
      
      if (nextTimestamp > System.currentTimeMillis()) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
          putExtra("alarmId", alarmId)
          putExtra("title", title)
          putExtra("ringtoneUri", ringtoneUri)
          putExtra("recurrenceRule", recurrenceRule)
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        } else {
          android.app.PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = android.app.PendingIntent.getBroadcast(
          context,
          alarmId.hashCode(),
          intent,
          pendingIntentFlags
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setExactAndAllowWhileIdle(
            android.app.AlarmManager.RTC_WAKEUP,
            nextTimestamp,
            pendingIntent
          )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
          alarmManager.setExact(android.app.AlarmManager.RTC_WAKEUP, nextTimestamp, pendingIntent)
        } else {
          alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, nextTimestamp, pendingIntent)
        }

        Log.d("AlarmReceiver", "✅ Recurring alarm rescheduled: $alarmId")
      }
    } catch (e: Exception) {
      Log.e("AlarmReceiver", "❌ Failed to reschedule recurring alarm: ${e.message}", e)
    }
  }

  /**
   * Calculate next occurrence timestamp based on recurrence rule
   */
  private fun calculateNextOccurrence(recurrenceRule: String): Long {
    val now = System.currentTimeMillis()
    val calendar = java.util.Calendar.getInstance().apply {
      timeInMillis = now
    }

    when {
      recurrenceRule.contains("FREQ=DAILY") || recurrenceRule == "daily" -> {
        calendar.add(java.util.Calendar.DAY_OF_YEAR, 1)
      }
      recurrenceRule.contains("FREQ=WEEKLY") || recurrenceRule == "weekly" -> {
        calendar.add(java.util.Calendar.WEEK_OF_YEAR, 1)
      }
      recurrenceRule.contains("FREQ=MONTHLY") || recurrenceRule == "monthly" -> {
        calendar.add(java.util.Calendar.MONTH, 1)
      }
      else -> {
        // Default to daily if unknown
        calendar.add(java.util.Calendar.DAY_OF_YEAR, 1)
      }
    }

    return calendar.timeInMillis
  }
}
