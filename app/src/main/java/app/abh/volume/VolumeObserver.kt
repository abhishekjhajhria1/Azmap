package app.abh.volume

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.ContentObserver
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Calls [onChange] whenever any stream volume or the ringer mode changes, from
 * this app or anywhere else (hardware keys, other apps, the system panel).
 */
class VolumeObserver(private val context: Context, private val onChange: () -> Unit) {

    private val handler = Handler(Looper.getMainLooper())

    private val settingsObserver = object : ContentObserver(handler) {
        override fun onChange(selfChange: Boolean) = onChange()
    }

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) = onChange()
    }

    private var registered = false

    fun start() {
        if (registered) return
        registered = true
        context.contentResolver.registerContentObserver(Settings.System.CONTENT_URI, true, settingsObserver)
        val filter = IntentFilter().apply {
            addAction(VOLUME_CHANGED_ACTION)
            addAction(AudioManager.RINGER_MODE_CHANGED_ACTION)
        }
        ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_EXPORTED)
    }

    fun stop() {
        if (!registered) return
        registered = false
        context.contentResolver.unregisterContentObserver(settingsObserver)
        context.unregisterReceiver(receiver)
    }

    private companion object {
        // Sent by AudioService on every stream volume change; not part of the public SDK.
        const val VOLUME_CHANGED_ACTION = "android.media.VOLUME_CHANGED_ACTION"
    }
}
