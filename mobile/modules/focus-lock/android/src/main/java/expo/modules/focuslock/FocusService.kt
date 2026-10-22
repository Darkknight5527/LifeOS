package expo.modules.focuslock

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.telecom.TelecomManager
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager

/**
 * During a Focus session: whenever an app that isn't allowed comes to the
 * front, bring LifeOS (the Focus screen) back on top. Only looks at which app
 * is in front — never at what's on the screen. Does nothing when Focus is off,
 * and ends the session (and Do Not Disturb) when the time is up.
 */
class FocusService : AccessibilityService() {
  companion object {
    @Volatile
    var instance: FocusService? = null

    // Calls, contacts, messages, Spotify, alarms, emergency, and the system UI
    // (status bar, lock screen, incoming-call screens).
    val ALWAYS = setOf(
      "android",
      "com.android.systemui",
      "com.android.phone",
      "com.android.server.telecom",
      "com.android.dialer",
      "com.google.android.dialer",
      "com.samsung.android.dialer",
      "com.android.incallui",
      "com.samsung.android.incallui",
      "com.android.contacts",
      "com.google.android.contacts",
      "com.samsung.android.app.contacts",
      "com.android.mms",
      "com.google.android.apps.messaging",
      "com.samsung.android.messaging",
      "com.spotify.music",
      "com.android.deskclock",
      "com.google.android.deskclock",
      "com.sec.android.app.clockpackage",
      "com.android.emergency",
      "com.google.android.apps.safetyhub",
      "com.android.permissioncontroller",
      "com.google.android.permissioncontroller"
    )
  }

  private val handler = Handler(Looper.getMainLooper())
  private val endCheck = Runnable { checkEnd() }
  private var lastBounce = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    scheduleEnd()
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    handler.removeCallbacks(endCheck)
    super.onDestroy()
  }

  override fun onInterrupt() {}

  /** Wake up at the end time (at least once a minute) to finish the session. */
  fun scheduleEnd() {
    handler.removeCallbacks(endCheck)
    if (!FocusState.isOn(this)) return
    val wait = FocusState.endsAt(this) - System.currentTimeMillis()
    handler.postDelayed(endCheck, maxOf(1000L, minOf(wait + 500L, 60_000L)))
  }

  private fun checkEnd() {
    if (FocusState.isOn(this) && !FocusState.isActive(this)) FocusState.stop(this) else scheduleEnd()
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    if (!FocusState.isOn(this)) return
    if (!FocusState.isActive(this)) {
      FocusState.stop(this)
      return
    }
    val pkg = event.packageName?.toString() ?: return
    if (allowed(pkg)) return
    bounce()
  }

  private fun allowed(pkg: String): Boolean {
    if (pkg == packageName || pkg in ALWAYS) return true
    if (pkg in FocusState.extraAllowed(this)) return true
    try {
      val tm = getSystemService(TELECOM_SERVICE) as TelecomManager
      if (tm.defaultDialerPackage == pkg) return true
    } catch (e: Exception) {}
    try {
      if (Telephony.Sms.getDefaultSmsPackage(this) == pkg) return true
    } catch (e: Exception) {}
    try {
      val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
      if (imm.enabledInputMethodList.any { it.packageName == pkg }) return true
    } catch (e: Exception) {}
    return false
  }

  /** Bring the LifeOS Focus screen to the front. */
  private fun bounce() {
    val now = System.currentTimeMillis()
    if (now - lastBounce < 400) return
    lastBounce = now
    val i = packageManager.getLaunchIntentForPackage(packageName)
    if (i == null) {
      performGlobalAction(GLOBAL_ACTION_BACK)
      return
    }
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    i.putExtra("lifeosFocus", true)
    try {
      startActivity(i)
    } catch (e: Exception) {
      performGlobalAction(GLOBAL_ACTION_BACK)
    }
  }
}
