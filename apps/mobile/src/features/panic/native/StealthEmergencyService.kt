package com.redciudadana.stealth

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.view.KeyEvent
import android.os.VibrationEffect
import android.os.Vibrator

/**
 * 🚨 NATIVE ROOT SERVICE (ANDROID)
 * Bypass the React Native Bridge to intercept physical volume buttons globally
 * while the app is killed or running in the background.
 * Requires: <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 */
class StealthEmergencyService : Service() {

    private lateinit var mediaSession: MediaSessionCompat
    private var volumeDownCount = 0
    private var lastPressTime: Long = 0

    override fun onCreate() {
        super.onCreate()
         
        // The "Silent Audio" Trick: Tricks Android into routing physical media keys to our invisible service.
        mediaSession = MediaSessionCompat(this, "StealthEmergency")
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
        mediaSession.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setState(PlaybackStateCompat.STATE_PLAYING, 0, 0f) 
                .build()
        )

        mediaSession.setCallback(object : MediaSessionCompat.Callback() {
            override fun onMediaButtonEvent(mediaButtonEvent: Intent): Boolean {
                val keyEvent = mediaButtonEvent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT)
                if (keyEvent != null && keyEvent.action == KeyEvent.ACTION_DOWN) {
                    if (keyEvent.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                        handleVolumeDown()
                        return true // Consume event
                    }
                }
                return super.onMediaButtonEvent(mediaButtonEvent)
            }
        })

        mediaSession.isActive = true
    }

    private fun handleVolumeDown() {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastPressTime > 3000) {
            volumeDownCount = 0 // Reset sequence if too slow
        }
        
        lastPressTime = currentTime
        volumeDownCount++

        if (volumeDownCount >= 4) {
            volumeDownCount = 0
            triggerInvisibleEmergency()
        }
    }

    private fun triggerInvisibleEmergency() {
        // 1. Give Tactical Feedback (1 short, 1 long vibration) safely bypassing screen
        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 200, 500), -1))
        } else {
            vibrator.vibrate(longArrayOf(0, 100, 200, 500), -1)
        }

        // 2. Here: OkHttp Call directly to Google Cloud Run bypassing React Native entirely
        // ... Send HTTP Request ...
        
        // 3. Optional: Sync back to JS thread using DeviceEventEmitter to wake TurboModule
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        mediaSession.isActive = false
        mediaSession.release()
        super.onDestroy()
    }
}
