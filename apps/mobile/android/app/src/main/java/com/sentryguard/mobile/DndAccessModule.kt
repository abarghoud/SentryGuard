package com.sentryguard.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DndAccessModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "SentryGuardDndAccess"

  @ReactMethod
  fun isNotificationPolicyAccessGranted(promise: Promise) {
    val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(notificationManager.isNotificationPolicyAccessGranted)
  }

  @ReactMethod
  fun ensureCriticalNotificationChannel(channelId: String, channelName: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(true)
      return
    }

    val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (!notificationManager.isNotificationPolicyAccessGranted) {
      promise.resolve(false)
      return
    }

    val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH)
    val audioAttributes = AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_ALARM)
      .build()

    channel.setBypassDnd(true)
    channel.setSound(Settings.System.DEFAULT_ALARM_ALERT_URI, audioAttributes)
    channel.enableVibration(true)
    channel.vibrationPattern = longArrayOf(0, 250, 150, 250, 150, 500)
    channel.lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC

    notificationManager.createNotificationChannel(channel)
    promise.resolve(notificationManager.getNotificationChannel(channelId)?.canBypassDnd() == true)
  }
}
