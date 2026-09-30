package app.abh.volume

import android.graphics.drawable.Icon
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.view.ContextThemeWrapper
import com.google.android.material.dialog.MaterialAlertDialogBuilder

/**
 * The Quick Settings tile. Tapping it opens every volume slider right on top of
 * the pulled-down shade, without leaving whatever app you're in.
 */
class VolumeTileService : TileService() {

    private val observer by lazy { VolumeObserver(this) { updateTile() } }

    override fun onStartListening() {
        super.onStartListening()
        observer.start()
        updateTile()
    }

    override fun onStopListening() {
        observer.stop()
        super.onStopListening()
    }

    override fun onClick() {
        if (isLocked) unlockAndRun(::showPanel) else showPanel()
    }

    private fun showPanel() {
        val themed = ContextThemeWrapper(this, R.style.Theme_VolumeBar)
        val dialog = MaterialAlertDialogBuilder(themed)
            .setTitle(R.string.app_name)
            .setView(VolumePanel(themed).apply {
                val pad = resources.getDimensionPixelSize(R.dimen.dialog_padding)
                setPadding(pad, pad / 2, pad, 0)
            })
            .setPositiveButton(R.string.done, null)
            .setNeutralButton(R.string.system_panel) { _, _ -> Volumes(this).showSystemPanel() }
            .create()
        showDialog(dialog)
    }

    private fun updateTile() {
        val tile = qsTile ?: return
        val volumes = Volumes(this)
        val muted = volumes.isMuted(Stream.MEDIA)
        tile.label = getString(R.string.tile_label)
        tile.icon = Icon.createWithResource(this, if (muted) R.drawable.ic_volume_off else R.drawable.ic_volume)
        tile.state = if (muted) Tile.STATE_INACTIVE else Tile.STATE_ACTIVE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.subtitle = getString(R.string.tile_subtitle, volumes.percent(Stream.MEDIA))
        }
        tile.updateTile()
    }
}
