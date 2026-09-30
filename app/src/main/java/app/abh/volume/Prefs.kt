package app.abh.volume

import android.content.Context

class Prefs(context: Context) {

    private val sp = context.getSharedPreferences("volume_bar", Context.MODE_PRIVATE)

    var notificationEnabled: Boolean
        get() = sp.getBoolean(KEY_ENABLED, false)
        set(value) = sp.edit().putBoolean(KEY_ENABLED, value).apply()

    /** Streams shown in the notification, in [Stream] order. */
    var notificationStreams: List<Stream>
        get() {
            val saved = sp.getStringSet(KEY_STREAMS, null)
                ?: return Stream.entries.filter { it in Stream.DEFAULT_IN_NOTIFICATION }
            return Stream.entries.filter { it.name in saved }
        }
        set(value) = sp.edit().putStringSet(KEY_STREAMS, value.map { it.name }.toSet()).apply()

    private companion object {
        const val KEY_ENABLED = "notification_enabled"
        const val KEY_STREAMS = "notification_streams"
    }
}
