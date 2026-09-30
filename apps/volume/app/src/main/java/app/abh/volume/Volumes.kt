package app.abh.volume

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.provider.Settings
import android.widget.Toast

/** Thin wrapper over [AudioManager] that never throws at the caller. */
class Volumes(private val context: Context) {

    private val audio = context.getSystemService(AudioManager::class.java)

    fun current(stream: Stream): Int = audio.getStreamVolume(stream.type)

    fun max(stream: Stream): Int = audio.getStreamMaxVolume(stream.type)

    fun min(stream: Stream): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) audio.getStreamMinVolume(stream.type) else 0

    fun isMuted(stream: Stream): Boolean = audio.isStreamMute(stream.type) || current(stream) == 0

    fun percent(stream: Stream): Int {
        val max = max(stream)
        return if (max == 0) 0 else current(stream) * 100 / max
    }

    fun set(stream: Stream, value: Int) = guarded {
        audio.setStreamVolume(stream.type, value.coerceIn(min(stream), max(stream)), 0)
    }

    fun raise(stream: Stream) = guarded {
        audio.adjustStreamVolume(stream.type, AudioManager.ADJUST_RAISE, 0)
    }

    fun lower(stream: Stream) = guarded {
        audio.adjustStreamVolume(stream.type, AudioManager.ADJUST_LOWER, 0)
    }

    fun toggleMute(stream: Stream) = guarded {
        audio.adjustStreamVolume(stream.type, AudioManager.ADJUST_TOGGLE_MUTE, 0)
    }

    /** Opens the system volume panel on top of whatever is showing. */
    fun showSystemPanel() {
        audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_SAME, AudioManager.FLAG_SHOW_UI)
    }

    /**
     * Ring and notification volume can't be changed to or from silent while Do Not
     * Disturb is on unless the app has notification-policy access; ask for it then.
     */
    private inline fun guarded(block: () -> Unit) {
        try {
            block()
        } catch (e: SecurityException) {
            val nm = context.getSystemService(NotificationManager::class.java)
            if (!nm.isNotificationPolicyAccessGranted) {
                Toast.makeText(context, R.string.need_dnd_access, Toast.LENGTH_LONG).show()
                context.startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
    }
}
