package com.redciudadana.stealth

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.view.KeyEvent
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Servicio nativo Android de emergencia encubierta (Foreground MediaSession).
 * Intercepta pulsaciones físicas de bajar volumen cuando el servicio en segundo plano está activo
 * y despacha directamente el payload SOS a /api/mobile/panic sin depender del hilo JS.
 *
 * Nota: Para empaquetarse automáticamente en builds EAS Managed, requiere registrarse
 * en AndroidManifest.xml mediante un Expo Config Plugin dedicado.
 */
class StealthEmergencyService : Service() {

    companion object {
        private const val PREFS_NAME = "rc_stealth_prefs"
        private const val KEY_API_URL = "api_url"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_LAST_LAT = "last_latitude"
        private const val KEY_LAST_LNG = "last_longitude"
        private const val MAX_SEQUENCE_WINDOW_MS = 2500L
        private const val REQUIRED_PRESSES = 3
    }

    private lateinit var mediaSession: MediaSessionCompat
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private var volumeDownCount = 0
    private var lastPressTime: Long = 0

    override fun onCreate() {
        super.onCreate()

        mediaSession = MediaSessionCompat(this, "StealthEmergency")
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        )
        mediaSession.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setState(PlaybackStateCompat.STATE_PLAYING, 0, 0f)
                .build()
        )

        mediaSession.setCallback(object : MediaSessionCompat.Callback() {
            override fun onMediaButtonEvent(mediaButtonEvent: Intent): Boolean {
                @Suppress("DEPRECATION")
                val keyEvent = mediaButtonEvent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT)
                if (keyEvent != null && keyEvent.action == KeyEvent.ACTION_DOWN) {
                    if (keyEvent.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                        handleVolumeDown()
                        return true
                    }
                }
                return super.onMediaButtonEvent(mediaButtonEvent)
            }
        })

        mediaSession.isActive = true
    }

    private fun handleVolumeDown() {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastPressTime > MAX_SEQUENCE_WINDOW_MS) {
            volumeDownCount = 0
        }

        lastPressTime = currentTime
        volumeDownCount++

        if (volumeDownCount >= REQUIRED_PRESSES) {
            volumeDownCount = 0
            triggerInvisibleEmergency()
        }
    }

    private fun triggerInvisibleEmergency() {
        @Suppress("DEPRECATION")
        val vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator
        if (vibrator != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 100, 180, 400), -1)
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(longArrayOf(0, 100, 180, 400), -1)
            }
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val apiBaseUrl = prefs.getString(KEY_API_URL, null)?.trimEnd('/') ?: return
        val authToken = prefs.getString(KEY_AUTH_TOKEN, null)
        val latitude = prefs.getFloat(KEY_LAST_LAT, 7.0653f).toDouble()
        val longitude = prefs.getFloat(KEY_LAST_LNG, -73.8547f).toDouble()

        ioExecutor.execute {
            var connection: HttpURLConnection? = null
            try {
                val endpoint = URL("$apiBaseUrl/api/mobile/panic")
                connection = (endpoint.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    if (!authToken.isNullOrBlank()) {
                        setRequestProperty("Authorization", "Bearer $authToken")
                    }
                }

                val payload = JSONObject().apply {
                    put("latitude", latitude)
                    put("longitude", longitude)
                    put("type", "emergency")
                    put("triggerType", "ghost_mode")
                    put("address", "Última ubicación registrada en segundo plano")
                    put("description", "PÁNICO SIGILOSO NATIVO: Detonado por botones físicos de volumen")
                }

                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }
                connection.responseCode
            } catch (_: Exception) {
                // Falla silenciosa sin exponer alertas visuales en pantalla
            } finally {
                connection?.disconnect()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        mediaSession.isActive = false
        mediaSession.release()
        ioExecutor.shutdownNow()
        super.onDestroy()
    }
}
