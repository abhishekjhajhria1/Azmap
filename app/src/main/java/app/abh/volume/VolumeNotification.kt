package app.abh.volume

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Builds the ongoing notification: one row per stream with mute, −, level and +. */
object VolumeNotification {

    const val ID = 1
    private const val CHANNEL = "volume_controls"

    fun ensureChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL,
            context.getString(R.string.channel_name),
            // Low importance: shows in the shade with no sound, vibration or heads-up.
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = context.getString(R.string.channel_description)
            setShowBadge(false)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun build(context: Context): Notification {
        ensureChannel(context)
        val streams = Prefs(context).notificationStreams.ifEmpty { listOf(Stream.MEDIA) }
        val volumes = Volumes(context)

        val collapsed = RemoteViews(context.packageName, R.layout.notification_volume).apply {
            removeAllViews(R.id.rows)
            addView(R.id.rows, row(context, volumes, streams.first()))
        }
        val expanded = RemoteViews(context.packageName, R.layout.notification_volume).apply {
            removeAllViews(R.id.rows)
            streams.forEach { addView(R.id.rows, row(context, volumes, it)) }
        }

        val openApp = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_volume)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    /** Re-renders the notification in place, if it is turned on. */
    fun refresh(context: Context) {
        if (!Prefs(context).notificationEnabled) return
        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return
        try {
            nm.notify(ID, build(context))
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS was revoked; nothing to update.
        }
    }

    private fun row(context: Context, volumes: Volumes, stream: Stream): RemoteViews {
        val muted = volumes.isMuted(stream)
        return RemoteViews(context.packageName, R.layout.notification_row).apply {
            setImageViewResource(R.id.icon, if (muted) R.drawable.ic_volume_off else stream.icon)
            setTextViewText(R.id.label, context.getString(stream.label))
            setTextViewText(R.id.value, "${volumes.percent(stream)}%")
            setProgressBar(R.id.level, volumes.max(stream), volumes.current(stream), false)
            setOnClickPendingIntent(R.id.icon, action(context, VolumeActionReceiver.ACTION_MUTE, stream))
            setOnClickPendingIntent(R.id.minus, action(context, VolumeActionReceiver.ACTION_LOWER, stream))
            setOnClickPendingIntent(R.id.plus, action(context, VolumeActionReceiver.ACTION_RAISE, stream))
            setContentDescription(R.id.icon, context.getString(R.string.cd_mute, context.getString(stream.label)))
            setContentDescription(R.id.minus, context.getString(R.string.cd_lower, context.getString(stream.label)))
            setContentDescription(R.id.plus, context.getString(R.string.cd_raise, context.getString(stream.label)))
        }
    }

    private fun action(context: Context, action: String, stream: Stream): PendingIntent {
        val intent = Intent(context, VolumeActionReceiver::class.java)
            .setAction(action)
            .putExtra(VolumeActionReceiver.EXTRA_STREAM, stream.name)
        // Distinct request code per (action, stream) so the PendingIntents don't collapse.
        val requestCode = action.hashCode() * 31 + stream.ordinal
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
