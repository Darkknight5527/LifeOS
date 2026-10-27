package expo.modules.focuslock

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.provider.Telephony
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** What the LifeOS app (JavaScript) can ask Focus mode to do. */
class FocusLockModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocusLock")

    Function("status") { status() }

    Function("start") { endsAt: Double, allow: List<String> ->
      if (!serviceOn()) {
        mapOf("error" to "accessibility") + status()
      } else {
        FocusState.start(ctx, endsAt.toLong(), allow)
        status()
      }
    }

    Function("stop") {
      FocusState.stop(ctx)
      status()
    }

    Function("openAccessibilitySettings") { open(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
    Function("openDndSettings") { open(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)) }
    Function("openAppInfo") { open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.packageName))) }

    Function("launch") { what: String -> launch(what) }
  }

  private fun status(): Map<String, Any?> {
    val c = ctx
    if (FocusState.isOn(c) && !FocusState.isActive(c)) FocusState.stop(c)
    return mapOf(
      "supported" to true,
      "active" to FocusState.isActive(c),
      "endsAt" to FocusState.endsAt(c).toDouble(),
      "accessibility" to serviceOn(),
      "dnd" to FocusState.dndAllowed(c),
      "spotify" to (c.packageManager.getLaunchIntentForPackage("com.spotify.music") != null),
      "whatsapp" to (c.packageManager.getLaunchIntentForPackage("com.whatsapp") != null || c.packageManager.getLaunchIntentForPackage("com.whatsapp.w4b") != null)
    )
  }

  private fun serviceOn(): Boolean {
    val c = ctx
    val flat = Settings.Secure.getString(c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
    val me = ComponentName(c, FocusService::class.java)
    return flat.split(':').any { ComponentName.unflattenFromString(it) == me }
  }

  private fun launch(what: String): Boolean {
    val c = ctx
    val i: Intent = when (what) {
      "dialer" -> Intent(Intent.ACTION_DIAL)
      "sms" -> {
        val pkg = try { Telephony.Sms.getDefaultSmsPackage(c) } catch (e: Exception) { null }
        (pkg?.let { c.packageManager.getLaunchIntentForPackage(it) }) ?: Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"))
      }
      "spotify" -> c.packageManager.getLaunchIntentForPackage("com.spotify.music") ?: return false
      "whatsapp" -> c.packageManager.getLaunchIntentForPackage("com.whatsapp")
        ?: c.packageManager.getLaunchIntentForPackage("com.whatsapp.w4b") ?: return false
      else -> return false
    }
    return open(i)
  }

  private fun open(i: Intent): Boolean =
    try {
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(i)
      true
    } catch (e: Exception) {
      false
    }
}
