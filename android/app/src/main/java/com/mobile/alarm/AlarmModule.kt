package com.mobile.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class AlarmModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val prefs: SharedPreferences =
    reactContext.getSharedPreferences("alarm_prefs", Context.MODE_PRIVATE)
  
  private var ringtonePickerPromise: Promise? = null
  private val ringtonePickerListener = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: android.app.Activity,
      requestCode: Int,
      resultCode: Int,
      intent: Intent?
    ) {
      if (requestCode == RINGTONE_PICKER_REQUEST) {
        val promise = ringtonePickerPromise
        ringtonePickerPromise = null
        reactApplicationContext.removeActivityEventListener(this)
        
        if (promise == null) {
          android.util.Log.w("AlarmModule", "⚠️ No promise found for ringtone picker result")
          return
        }
        
        if (resultCode == android.app.Activity.RESULT_OK && intent != null) {
          @Suppress("DEPRECATION")
          val ringtoneUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra("android.intent.extra.ringtone.PICKED_URI", Uri::class.java)
          } else {
            intent.getParcelableExtra<Uri>("android.intent.extra.ringtone.PICKED_URI")
          }
          
          if (ringtoneUri != null) {
            promise.resolve(ringtoneUri.toString())
          } else {
            promise.reject("NO_URI", "No ringtone URI returned")
          }
        } else {
          promise.reject("CANCELLED", "Ringtone picker was cancelled")
        }
      }
    }
  }

  init {
    // Set react context for event emitter
    AlarmEventEmitter.setReactContext(reactContext)
    // Add activity event listener for ringtone picker
    reactApplicationContext.addActivityEventListener(ringtonePickerListener)
  }

  override fun getName(): String = "AlarmModule"

  /** Required for React Native NativeEventEmitter (RN 0.65+). */
  @ReactMethod
  fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}

  @ReactMethod
  fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}

  /**
   * Schedule an alarm using Android AlarmManager
   * @param alarmId Unique alarm identifier
   * @param timestamp Unix timestamp in milliseconds
   * @param title Alarm title
   * @param ringtoneUri Optional ringtone URI (system default if null)
   * @param recurrenceRule Optional recurrence rule (FREQ=DAILY, FREQ=WEEKLY, etc.)
   */
  @ReactMethod
  fun scheduleAlarm(
    alarmId: String,
    timestamp: Double,
    title: String,
    ringtoneUri: String?,
    recurrenceRule: String?,
    promise: Promise
  ) {
    try {
      val alarmManager =
        reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

      // Create intent for AlarmReceiver
      val intent = Intent(reactApplicationContext, AlarmReceiver::class.java).apply {
        putExtra("alarmId", alarmId)
        putExtra("title", title)
        putExtra("ringtoneUri", ringtoneUri ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM).toString())
        putExtra("recurrenceRule", recurrenceRule)
      }

      // Create pending intent
      val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }

      val pendingIntent = PendingIntent.getBroadcast(
        reactApplicationContext,
        alarmId.hashCode(),
        intent,
        pendingIntentFlags
      )

      // Android 12+ requires user-granted exact alarm permission for setExact*
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
        android.util.Log.e("AlarmModule", "❌ Exact alarm permission not granted")
        promise.reject(
          "EXACT_ALARM_PERMISSION",
          "Schedule exact alarms is disabled. Open Settings and allow exact alarms for Planora."
        )
        return
      }

      // Schedule alarm using AlarmManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        // Android 6.0+ - use setExactAndAllowWhileIdle for better reliability
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          timestamp.toLong(),
          pendingIntent
        )
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        // Android 4.4+ - use setExact
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp.toLong(), pendingIntent)
      } else {
        // Older Android - use set
        alarmManager.set(AlarmManager.RTC_WAKEUP, timestamp.toLong(), pendingIntent)
      }

      // Store alarm info in SharedPreferences for reboot recovery
      saveAlarmToPrefs(alarmId, timestamp.toLong(), title, ringtoneUri, recurrenceRule)

      android.util.Log.d("AlarmModule", "✅ Alarm scheduled: $alarmId at ${Date(timestamp.toLong())}")
      promise.resolve(true)
    } catch (e: Exception) {
      android.util.Log.e("AlarmModule", "❌ Failed to schedule alarm: ${e.message}", e)
      promise.reject("ALARM_ERROR", "Failed to schedule alarm: ${e.message}", e)
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    try {
      val alarmManager =
        reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

      val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
      val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }

      val pendingIntent = PendingIntent.getBroadcast(
        reactApplicationContext,
        alarmId.hashCode(),
        intent,
        pendingIntentFlags
      )

      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()

      // Remove from SharedPreferences
      removeAlarmFromPrefs(alarmId)

      android.util.Log.d("AlarmModule", "✅ Alarm canceled: $alarmId")
      promise.resolve(true)
    } catch (e: Exception) {
      android.util.Log.e("AlarmModule", "❌ Failed to cancel alarm: ${e.message}", e)
      promise.reject("ALARM_ERROR", "Failed to cancel alarm: ${e.message}", e)
    }
  }

  /**
   * Open system ringtone picker
   */
  @ReactMethod
  fun pickRingtone(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No current activity available")
        return
      }

      // Store promise for later resolution
      if (ringtonePickerPromise != null) {
        ringtonePickerPromise?.reject("CANCELLED", "Previous ringtone picker cancelled")
      }
      ringtonePickerPromise = promise

      val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
        putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
        putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
        putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, true)
        putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Select Alarm Sound")
      }

      android.util.Log.d("AlarmModule", "🔔 Opening ringtone picker...")
      
      @Suppress("DEPRECATION")
      activity.startActivityForResult(intent, RINGTONE_PICKER_REQUEST)
    } catch (e: Exception) {
      ringtonePickerPromise = null
      android.util.Log.e("AlarmModule", "❌ Failed to open ringtone picker: ${e.message}", e)
      promise.reject("RINGTONE_ERROR", "Failed to open ringtone picker: ${e.message}", e)
    }
  }

  /**
   * Get default alarm ringtone URI
   */
  @ReactMethod
  fun getDefaultRingtoneUri(promise: Promise) {
    try {
      val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      promise.resolve(defaultUri.toString())
    } catch (e: Exception) {
      promise.reject("RINGTONE_ERROR", "Failed to get default ringtone: ${e.message}", e)
    }
  }

  /**
   * Get ringtone title/name from URI
   */
  @ReactMethod
  fun getRingtoneTitle(uriString: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val ringtone = RingtoneManager.getRingtone(reactApplicationContext, uri)
      val title = if (ringtone != null) {
        ringtone.getTitle(reactApplicationContext)
      } else {
        "Unknown Ringtone"
      }
      promise.resolve(title)
    } catch (e: Exception) {
      android.util.Log.e("AlarmModule", "❌ Failed to get ringtone title: ${e.message}", e)
      promise.reject("RINGTONE_ERROR", "Failed to get ringtone title: ${e.message}", e)
    }
  }

  @ReactMethod
  fun getAndClearNeedsReschedule(promise: Promise) {
    try {
      val needs = prefs.getBoolean("needs_reschedule", false)
      prefs.edit().putBoolean("needs_reschedule", false).apply()
      promise.resolve(needs)
    } catch (e: Exception) {
      promise.reject("ALARM_ERROR", "Failed to read reschedule flag: ${e.message}", e)
    }
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val alarmManager =
          reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(alarmManager.canScheduleExactAlarms())
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.reject("ALARM_ERROR", "Failed to check exact alarm permission: ${e.message}", e)
    }
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${reactApplicationContext.packageName}")
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${reactApplicationContext.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ALARM_ERROR", "Failed to open alarm settings: ${e.message}", e)
    }
  }

  /**
   * Stop currently playing alarm (if any)
   * This stops the AlarmPlayerService sound and vibration
   */
  @ReactMethod
  fun stopPlayingAlarm(promise: Promise) {
    try {
      android.util.Log.d("AlarmModule", "🛑 Stopping currently playing alarm")
      AlarmPlayerService.stopAlarm()
      promise.resolve(true)
      android.util.Log.d("AlarmModule", "✅ Alarm stopped successfully")
    } catch (e: Exception) {
      android.util.Log.e("AlarmModule", "❌ Failed to stop alarm: ${e.message}", e)
      promise.reject("ALARM_ERROR", "Failed to stop alarm: ${e.message}", e)
    }
  }

  /**
   * Save alarm to SharedPreferences for reboot recovery
   */
  private fun saveAlarmToPrefs(
    alarmId: String,
    timestamp: Long,
    title: String,
    ringtoneUri: String?,
    recurrenceRule: String?
  ) {
    val alarmData = JSONObject().apply {
      put("alarmId", alarmId)
      put("timestamp", timestamp)
      put("title", title)
      put("ringtoneUri", ringtoneUri ?: "")
      put("recurrenceRule", recurrenceRule ?: "")
    }
    prefs.edit().putString("alarm_$alarmId", alarmData.toString()).apply()
  }

  /**
   * Remove alarm from SharedPreferences
   */
  private fun removeAlarmFromPrefs(alarmId: String) {
    prefs.edit().remove("alarm_$alarmId").apply()
  }

  /**
   * Get all stored alarms (for reboot recovery)
   */
  fun getAllStoredAlarms(): List<JSONObject> {
    val alarms = mutableListOf<JSONObject>()
    val allEntries = prefs.all
    for ((key, value) in allEntries) {
      if (key.startsWith("alarm_")) {
        try {
          alarms.add(JSONObject(value as String))
        } catch (e: Exception) {
          android.util.Log.e("AlarmModule", "Error parsing stored alarm: ${e.message}")
        }
      }
    }
    return alarms
  }

  companion object {
    const val RINGTONE_PICKER_REQUEST = 999
  }
}
