package com.mobile.alarm

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Helper class to emit events from native to React Native
 * Note: Events are sent via AlarmModule instance
 */
object AlarmEventEmitter {
  
  private var reactContext: ReactApplicationContext? = null
  
  fun setReactContext(context: ReactApplicationContext) {
    reactContext = context
  }
  
  /**
   * Send snooze event to React Native
   */
  fun sendSnoozeEvent(alarmId: String) {
    try {
      val context = reactContext ?: return
      val params: WritableMap = Arguments.createMap().apply {
        putString("alarmId", alarmId)
        putString("action", "snooze")
      }
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AlarmSnooze", params)
    } catch (e: Exception) {
      android.util.Log.e("AlarmEventEmitter", "Error sending snooze event: ${e.message}", e)
    }
  }
  
  /**
   * Send alarm fired event to React Native (for UI updates)
   */
  fun sendAlarmFiredEvent(alarmId: String, title: String) {
    try {
      val context = reactContext ?: return
      val params: WritableMap = Arguments.createMap().apply {
        putString("alarmId", alarmId)
        putString("title", title)
        putString("action", "fired")
      }
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AlarmFired", params)
    } catch (e: Exception) {
      android.util.Log.e("AlarmEventEmitter", "Error sending alarm fired event: ${e.message}", e)
    }
  }
  
  /**
   * Send stop event to React Native
   */
  fun sendStopEvent(alarmId: String) {
    try {
      val context = reactContext ?: return
      val params: WritableMap = Arguments.createMap().apply {
        putString("alarmId", alarmId)
        putString("action", "stop")
      }
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AlarmStop", params)
    } catch (e: Exception) {
      android.util.Log.e("AlarmEventEmitter", "Error sending stop event: ${e.message}", e)
    }
  }
}
