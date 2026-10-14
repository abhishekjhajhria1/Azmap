package app.abh.volume

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Handles the −, + and mute buttons tapped in the notification. */
class VolumeActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val stream = intent.getStringExtra(EXTRA_STREAM)
            ?.let { name -> Stream.entries.firstOrNull { it.name == name } }
            ?: return
        val volumes = Volumes(context)
        when (intent.action) {
            ACTION_RAISE -> volumes.raise(stream)
            ACTION_LOWER -> volumes.lower(stream)
            ACTION_MUTE -> volumes.toggleMute(stream)
        }
        VolumeNotification.refresh(context)
    }

    companion object {
        const val ACTION_RAISE = "app.abh.volume.RAISE"
        const val ACTION_LOWER = "app.abh.volume.LOWER"
        const val ACTION_MUTE = "app.abh.volume.MUTE"
        const val EXTRA_STREAM = "stream"
    }
}
