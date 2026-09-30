package app.abh.volume

import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.material.slider.Slider

/**
 * A slider per stream, live-bound to the device volume. Used by the app screen
 * and by the dialog the Quick Settings tile opens over the drop-down shade.
 */
class VolumePanel @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : LinearLayout(context, attrs) {

    private val volumes = Volumes(context)
    private val observer = VolumeObserver(context) { sync() }
    private val rows = mutableListOf<Row>()

    private class Row(val stream: Stream, val icon: ImageButton, val slider: Slider, val value: TextView)

    init {
        orientation = VERTICAL
        val inflater = LayoutInflater.from(context)
        for (stream in Stream.entries) {
            val view = inflater.inflate(R.layout.panel_row, this, false)
            val row = Row(
                stream,
                view.findViewById(R.id.icon),
                view.findViewById(R.id.slider),
                view.findViewById(R.id.value),
            )
            view.findViewById<TextView>(R.id.label).setText(stream.label)
            row.icon.contentDescription = context.getString(R.string.cd_mute, context.getString(stream.label))
            row.icon.setOnClickListener {
                volumes.toggleMute(stream)
                sync()
            }
            row.slider.addOnChangeListener { _, value, fromUser ->
                if (!fromUser) return@addOnChangeListener
                volumes.set(stream, value.toInt())
                render(row)
            }
            addView(view)
            rows += row
        }
        sync()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        observer.start()
        sync()
    }

    override fun onDetachedFromWindow() {
        observer.stop()
        super.onDetachedFromWindow()
    }

    private fun sync() = rows.forEach(::render)

    private fun render(row: Row) {
        val stream = row.stream
        val min = volumes.min(stream)
        val max = volumes.max(stream).coerceAtLeast(min + 1)
        row.slider.valueFrom = min.toFloat()
        row.slider.valueTo = max.toFloat()
        row.slider.stepSize = 1f
        if (!row.slider.isPressed) {
            row.slider.value = volumes.current(stream).coerceIn(min, max).toFloat()
        }
        row.icon.setImageResource(if (volumes.isMuted(stream)) R.drawable.ic_volume_off else stream.icon)
        row.value.text = context.getString(R.string.percent, volumes.percent(stream))
    }
}
