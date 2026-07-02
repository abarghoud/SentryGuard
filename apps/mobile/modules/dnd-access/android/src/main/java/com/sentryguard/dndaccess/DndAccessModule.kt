package com.sentryguard.dndaccess

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DndAccessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SentryGuardDndAccess")

    AsyncFunction("isNotificationPolicyAccessGranted") {
      notificationManager.isNotificationPolicyAccessGranted
    }

    AsyncFunction("ensureCriticalNotificationChannel") { channelId: String, channelName: String ->
      ensureCriticalNotificationChannel(channelId, channelName)
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val notificationManager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun ensureCriticalNotificationChannel(channelId: String, channelName: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return true
    }

    if (!notificationManager.isNotificationPolicyAccessGranted) {
      return false
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
    channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC

    notificationManager.createNotificationChannel(channel)
    return notificationManager.getNotificationChannel(channelId)?.canBypassDnd() == true
  }
}
