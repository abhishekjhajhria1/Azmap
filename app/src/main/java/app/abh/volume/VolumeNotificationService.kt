package app.abh.volume

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Keeps the volume notification alive and in sync: when the volume changes from
 * the hardware keys or another app, the notification's levels update too.
 */
class VolumeNotificationService : Service() {

    private val observer by lazy { VolumeObserver(this) { VolumeNotification.refresh(this) } }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!Prefs(this).notificationEnabled) {
            stopSelf()
            return START_NOT_STICKY
        }
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        } else {
            0
        }
        ServiceCompat.startForeground(this, VolumeNotification.ID, VolumeNotification.build(this), type)
        observer.start()
        return START_STICKY
    }

    override fun onDestroy() {
        observer.stop()
        super.onDestroy()
    }

    companion object {
        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, VolumeNotificationService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, VolumeNotificationService::class.java))
        }
    }
}
