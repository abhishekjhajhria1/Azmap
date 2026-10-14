package app.abh.volume

import android.Manifest
import android.app.StatusBarManager
import android.content.ComponentName
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.checkbox.MaterialCheckBox
import com.google.android.material.materialswitch.MaterialSwitch

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: Prefs
    private lateinit var notificationSwitch: MaterialSwitch

    private val requestNotifications =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                enableNotification()
            } else {
                notificationSwitch.isChecked = false
                Toast.makeText(this, R.string.need_notification_permission, Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)

        notificationSwitch = findViewById(R.id.notification_switch)
        notificationSwitch.isChecked = prefs.notificationEnabled
        notificationSwitch.setOnCheckedChangeListener { _, checked ->
            if (checked) requestAndEnable() else disableNotification()
        }

        bindStreamChoices(findViewById(R.id.stream_choices))

        val addTile = findViewById<Button>(R.id.add_tile)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            addTile.setOnClickListener { requestAddTile() }
        } else {
            addTile.visibility = View.GONE
        }
        findViewById<Button>(R.id.system_panel).setOnClickListener { Volumes(this).showSystemPanel() }

        // Re-post the notification if it was swiped away or the app was just updated.
        if (prefs.notificationEnabled && hasNotificationPermission()) VolumeNotificationService.start(this)
    }

    private fun bindStreamChoices(container: LinearLayout) {
        val selected = prefs.notificationStreams.toMutableSet()
        for (stream in Stream.entries) {
            val box = MaterialCheckBox(this).apply {
                setText(stream.label)
                isChecked = stream in selected
                setOnCheckedChangeListener { view, checked ->
                    if (checked) selected += stream else selected -= stream
                    if (selected.isEmpty()) {
                        // Keep at least one row so the notification is never empty.
                        selected += stream
                        view.isChecked = true
                        return@setOnCheckedChangeListener
                    }
                    prefs.notificationStreams = Stream.entries.filter { it in selected }
                    VolumeNotification.refresh(this@MainActivity)
                }
            }
            container.addView(box)
        }
    }

    private fun hasNotificationPermission() =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    private fun requestAndEnable() {
        if (hasNotificationPermission()) {
            enableNotification()
        } else {
            requestNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun enableNotification() {
        prefs.notificationEnabled = true
        VolumeNotificationService.start(this)
    }

    private fun disableNotification() {
        prefs.notificationEnabled = false
        VolumeNotificationService.stop(this)
    }

    private fun requestAddTile() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        getSystemService(StatusBarManager::class.java).requestAddTileService(
            ComponentName(this, VolumeTileService::class.java),
            getString(R.string.tile_label),
            Icon.createWithResource(this, R.drawable.ic_volume),
            mainExecutor,
        ) { result ->
            val message = when (result) {
                StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> R.string.tile_added
                StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> R.string.tile_already_added
                else -> null
            }
            message?.let { Toast.makeText(this, it, Toast.LENGTH_SHORT).show() }
        }
    }
}
