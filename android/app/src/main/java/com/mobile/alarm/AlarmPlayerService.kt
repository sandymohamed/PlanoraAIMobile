package com.mobile.alarm

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat
import com.mobile.MainActivity

/**
 * Foreground service that plays the alarm sound and vibration
 * This ensures the alarm continues ringing even if the app is in background
 */
class AlarmPlayerService : Service() {

  companion object {
    const val NOTIFICATION_ID = 1001
    const val ACTION_STOP = "com.mobile.alarm.STOP"
    const val ACTION_SNOOZE = "com.mobile.alarm.SNOOZE"
    
    private var instance: AlarmPlayerService? = null
    
    fun stopAlarm() {
      instance?.stopAlarmInternal()
    }
  }

  private var ringtone: Ringtone? = null
  private var vibrator: Vibrator? = null
  private var isRinging = false
  private var alarmId: String? = null
  private var alarmTitle: String? = null

  override fun onCreate() {
    super.onCreate()
    vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    instance = this
    alarmId = intent?.getStringExtra("alarmId")
    alarmTitle = intent?.getStringExtra("title") ?: "Alarm"
    val ringtoneUriStr = intent?.getStringExtra("ringtoneUri")

    Log.d("AlarmPlayerService", "🔔 Starting alarm playback: $alarmId")

    // Start as foreground service
    startForeground(NOTIFICATION_ID, createNotification())

    // Play alarm
    startAlarm(ringtoneUriStr)

    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  /**
   * Start playing the alarm sound and vibration
   */
  private fun startAlarm(ringtoneUriStr: String?) {
    if (isRinging) {
      Log.w("AlarmPlayerService", "⚠️ Alarm already ringing")
      return
    }

    isRinging = true

    try {
      // Play ringtone
      val ringtoneUri = if (!ringtoneUriStr.isNullOrEmpty()) {
        Uri.parse(ringtoneUriStr)
      } else {
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      }

      ringtone = RingtoneManager.getRingtone(applicationContext, ringtoneUri)?.apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          // Android 9.0+ - set audio attributes for alarm usage
          audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
          isLooping = true
        }
        play()
      }

      // Start vibration pattern
      startVibration()

      Log.d("AlarmPlayerService", "✅ Alarm playing: $alarmTitle")
      
      // Notify React Native that alarm fired (for UI updates)
      val currentAlarmId = alarmId
      val currentAlarmTitle = alarmTitle
      if (currentAlarmId != null && currentAlarmTitle != null) {
        AlarmEventEmitter.sendAlarmFiredEvent(currentAlarmId, currentAlarmTitle)
      }
    } catch (e: Exception) {
      Log.e("AlarmPlayerService", "❌ Error playing alarm: ${e.message}", e)
      stopSelf()
    }
  }

  /**
   * Start vibration pattern
   */
  private fun startVibration() {
    try {
      val pattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // Android 8.0+ - use VibrationEffect
        val vibrationEffect = VibrationEffect.createWaveform(pattern, 0) // 0 = repeat from index 0
        vibrator?.vibrate(vibrationEffect)
      } else {
        @Suppress("DEPRECATION")
        vibrator?.vibrate(pattern, 0) // 0 = repeat
      }
    } catch (e: Exception) {
      Log.e("AlarmPlayerService", "❌ Error starting vibration: ${e.message}", e)
    }
  }

  /**
   * Stop the alarm (internal method)
   */
  private fun stopAlarmInternal() {
    if (!isRinging) {
      Log.w("AlarmPlayerService", "⚠️ stopAlarmInternal called but alarm is not ringing")
      return
    }
    
    Log.d("AlarmPlayerService", "🛑 Stopping alarm sound and vibration")
    isRinging = false

    try {
      // Stop ringtone playback
      ringtone?.stop()
      ringtone = null
      Log.d("AlarmPlayerService", "✅ Ringtone stopped")
    } catch (e: Exception) {
      Log.e("AlarmPlayerService", "❌ Error stopping ringtone: ${e.message}", e)
    }

    try {
      // Stop vibration
      vibrator?.cancel()
      Log.d("AlarmPlayerService", "✅ Vibration stopped")
    } catch (e: Exception) {
      Log.e("AlarmPlayerService", "❌ Error stopping vibration: ${e.message}", e)
    }

    // Stop foreground service and remove notification
    try {
      stopForeground(true)
      stopSelf()
      Log.d("AlarmPlayerService", "✅ Service stopped")
    } catch (e: Exception) {
      Log.e("AlarmPlayerService", "❌ Error stopping service: ${e.message}", e)
    }
  }

  /**
   * Create foreground service notification with Stop/Snooze actions
   */
  private fun createNotification(): Notification {
    val channelId = "alarm_channel"
    createNotificationChannel(channelId)

    val stopIntent = Intent(this, AlarmActionReceiver::class.java).apply {
      action = ACTION_STOP
      if (alarmId != null) {
        putExtra("alarmId", alarmId)
      }
    }

    val snoozeIntent = Intent(this, AlarmActionReceiver::class.java).apply {
      action = ACTION_SNOOZE
      if (alarmId != null) {
        putExtra("alarmId", alarmId)
      }
    }

    val pendingStopFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    val stopPendingIntent = PendingIntent.getBroadcast(this, 0, stopIntent, pendingStopFlags)
    val snoozePendingIntent = PendingIntent.getBroadcast(this, 1, snoozeIntent, pendingStopFlags)

    val openAppIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val openAppPendingIntent = PendingIntent.getActivity(
      this,
      0,
      openAppIntent,
      pendingStopFlags
    )

    val builder = NotificationCompat.Builder(this, channelId)
      .setContentTitle("⏰ $alarmTitle")
      .setContentText("Alarm is ringing")
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setFullScreenIntent(openAppPendingIntent, true)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(openAppPendingIntent)
      .setSound(null) // We play sound via ringtone
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_MAX) // Use MAX priority for alarms
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setStyle(NotificationCompat.BigTextStyle()
        .bigText("Alarm is ringing. Tap Stop to dismiss or Snooze to delay 5 minutes."))
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
      .addAction(android.R.drawable.ic_menu_revert, "Snooze", snoozePendingIntent)
    
    // For Android 7.0+, use MessagingStyle or BigTextStyle to ensure actions are visible
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      builder.setStyle(NotificationCompat.BigTextStyle()
        .bigText("Alarm is ringing. Tap Stop to dismiss or Snooze to delay 5 minutes.")
        .setSummaryText("Use buttons below to control alarm"))
    }
    
    // Make sure actions are always visible - use big text style which shows actions
    Log.d("AlarmPlayerService", "✅ Notification created with Stop and Snooze actions")
    
    return builder.build()
  }

  /**
   * Create notification channel (required for Android 8.0+)
   */
  private fun createNotificationChannel(channelId: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        "Alarms",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Alarm notifications"
        enableVibration(true)
        enableLights(true)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC // Show on lock screen
        setBypassDnd(true) // Allow bypassing Do Not Disturb for alarms
        // Ensure actions are visible on lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          setAllowBubbles(false) // Don't allow bubbles for alarms
        }
      }
      val notificationManager = getSystemService(NotificationManager::class.java)
      notificationManager.createNotificationChannel(channel)
      Log.d("AlarmPlayerService", "✅ Notification channel created with lock screen visibility")
    }
  }
  
  override fun onDestroy() {
    super.onDestroy()
    if (instance == this) {
      instance = null
    }
  }
}
