package com.mobile.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver for handling Stop/Snooze actions from alarm notification
 */
class AlarmActionReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      AlarmPlayerService.ACTION_STOP -> {
        val alarmId = intent.getStringExtra("alarmId")
        Log.d("AlarmActionReceiver", "🛑 Stop action for alarm: $alarmId")
        
        // CRITICAL: Stop the alarm sound/vibration FIRST before stopping service
        AlarmPlayerService.stopAlarm()
        
        // Stop the service to remove notification
        val stopIntent = Intent(context, AlarmPlayerService::class.java)
        context.stopService(stopIntent)
        
        // Notify React Native
        if (alarmId != null) {
          AlarmEventEmitter.sendStopEvent(alarmId)
        }
        
        Log.d("AlarmActionReceiver", "✅ Alarm stopped and service stopped")
      }
      AlarmPlayerService.ACTION_SNOOZE -> {
        val alarmId = intent.getStringExtra("alarmId")
        Log.d("AlarmActionReceiver", "😴 Snooze action for alarm: $alarmId")
        
        // CRITICAL: Stop the alarm sound/vibration FIRST before stopping service
        AlarmPlayerService.stopAlarm()
        
        // Stop the service to remove notification
        val stopIntent = Intent(context, AlarmPlayerService::class.java)
        context.stopService(stopIntent)
        
        // Send event to React Native for snooze handling
        if (alarmId != null) {
          AlarmEventEmitter.sendSnoozeEvent(alarmId)
        }
        
        Log.d("AlarmActionReceiver", "✅ Alarm snoozed (stopped) and service stopped")
      }
    }
  }
}
