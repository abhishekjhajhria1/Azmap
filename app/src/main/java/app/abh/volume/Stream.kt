package app.abh.volume

import android.media.AudioManager
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes

/** The audio streams the app can control, in display order. */
enum class Stream(
    val type: Int,
    @StringRes val label: Int,
    @DrawableRes val icon: Int,
) {
    MEDIA(AudioManager.STREAM_MUSIC, R.string.stream_media, R.drawable.ic_music),
    RING(AudioManager.STREAM_RING, R.string.stream_ring, R.drawable.ic_ring),
    NOTIFICATION(AudioManager.STREAM_NOTIFICATION, R.string.stream_notification, R.drawable.ic_bell),
    ALARM(AudioManager.STREAM_ALARM, R.string.stream_alarm, R.drawable.ic_alarm),
    CALL(AudioManager.STREAM_VOICE_CALL, R.string.stream_call, R.drawable.ic_call);

    companion object {
        val DEFAULT_IN_NOTIFICATION = setOf(MEDIA, RING, ALARM)
    }
}
