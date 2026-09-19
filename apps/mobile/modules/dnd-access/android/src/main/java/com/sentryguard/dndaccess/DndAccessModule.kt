package com.sentryguard.dndaccess

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
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

    AsyncFunction("ensureCriticalNotificationChannel") { channelId: String, channelName: String, soundName: String? ->
      ensureCriticalNotificationChannel(channelId, channelName, soundName)
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val notificationManager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun ensureCriticalNotificationChannel(channelId: String, channelName: String, soundName: String?): Boolean {
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
    channel.setSound(resolveSoundUri(soundName), audioAttributes)
    channel.enableVibration(true)
    channel.vibrationPattern = longArrayOf(0, 250, 150, 250, 150, 500)
    channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC

    notificationManager.createNotificationChannel(channel)
    return notificationManager.getNotificationChannel(channelId)?.canBypassDnd() == true
  }

  private fun resolveSoundUri(soundName: String?): Uri {
    if (soundName.isNullOrEmpty()) {
      return Settings.System.DEFAULT_ALARM_ALERT_URI
    }

    val resourceName = soundName.substringBeforeLast('.')
    val resourceId = context.resources.getIdentifier(resourceName, "raw", context.packageName)

    if (resourceId == 0) {
      return Settings.System.DEFAULT_ALARM_ALERT_URI
    }

    return Uri.Builder()
      .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
      .authority(context.packageName)
      .appendPath("raw")
      .appendPath(resourceName)
      .build()
  }
}
