package expo.modules.focuslock

import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * Focus mode's saved state (survives restarts) and Do Not Disturb handling.
 * While a session runs, Do Not Disturb lets only calls (and alarms) through;
 * the phone's previous Do Not Disturb setup is put back when it ends.
 */
object FocusState {
  private const val PREFS = "lifeos_focus"
  const val MAX_MS = 12 * 60 * 60_000L + 5 * 60_000L

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun endsAt(ctx: Context): Long = prefs(ctx).getLong("endsAt", 0L)
  fun isOn(ctx: Context): Boolean = prefs(ctx).getBoolean("active", false)
  fun isActive(ctx: Context): Boolean = isOn(ctx) && System.currentTimeMillis() < endsAt(ctx)
  fun extraAllowed(ctx: Context): Set<String> = prefs(ctx).getStringSet("allow", null) ?: emptySet()

  fun start(ctx: Context, endsAt: Long, allow: List<String>) {
    val end = minOf(endsAt, System.currentTimeMillis() + MAX_MS)
    prefs(ctx).edit()
      .putBoolean("active", true)
      .putLong("endsAt", end)
      .putStringSet("allow", allow.toSet())
      .apply()
    quiet(ctx)
    FocusService.instance?.scheduleEnd()
  }

  /** After an app update / restart mid-session: re-apply the current Do Not Disturb rules. */
  fun reapply(ctx: Context) {
    if (isActive(ctx)) quiet(ctx)
  }

  fun stop(ctx: Context) {
    prefs(ctx).edit().putBoolean("active", false).apply()
    restore(ctx)
  }

  private fun nm(ctx: Context) = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  fun dndAllowed(ctx: Context): Boolean = try { nm(ctx).isNotificationPolicyAccessGranted } catch (e: Exception) { false }

  /** Do Not Disturb: calls (anyone, and repeat callers), alarms and music play; no other notification sounds or shows. */
  private fun quiet(ctx: Context) {
    val nm = nm(ctx)
    if (!dndAllowed(ctx)) return
    try {
      val p = prefs(ctx)
      if (!p.getBoolean("dndSaved", false)) {
        val old = nm.notificationPolicy
        val e = p.edit()
          .putBoolean("dndSaved", true)
          .putInt("oldFilter", nm.currentInterruptionFilter)
          .putInt("oldCats", old.priorityCategories)
          .putInt("oldCalls", old.priorityCallSenders)
          .putInt("oldMsgs", old.priorityMessageSenders)
          .putInt("oldVisual", old.suppressedVisualEffects)
        if (Build.VERSION.SDK_INT >= 30) e.putInt("oldConv", old.priorityConversationSenders)
        e.apply()
      }
      var cats = NotificationManager.Policy.PRIORITY_CATEGORY_CALLS or NotificationManager.Policy.PRIORITY_CATEGORY_REPEAT_CALLERS
      // Alarms and media (Spotify) keep their sound; only notifications are silenced.
      if (Build.VERSION.SDK_INT >= 28) cats = cats or NotificationManager.Policy.PRIORITY_CATEGORY_ALARMS or NotificationManager.Policy.PRIORITY_CATEGORY_MEDIA
      val visual = if (Build.VERSION.SDK_INT >= 28) {
        NotificationManager.Policy.SUPPRESSED_EFFECT_PEEK or
          NotificationManager.Policy.SUPPRESSED_EFFECT_STATUS_BAR or
          NotificationManager.Policy.SUPPRESSED_EFFECT_BADGE or
          NotificationManager.Policy.SUPPRESSED_EFFECT_AMBIENT or
          NotificationManager.Policy.SUPPRESSED_EFFECT_NOTIFICATION_LIST or
          NotificationManager.Policy.SUPPRESSED_EFFECT_LIGHTS or
          NotificationManager.Policy.SUPPRESSED_EFFECT_FULL_SCREEN_INTENT
      } else {
        @Suppress("DEPRECATION")
        NotificationManager.Policy.SUPPRESSED_EFFECT_SCREEN_ON or NotificationManager.Policy.SUPPRESSED_EFFECT_SCREEN_OFF
      }
      nm.notificationPolicy = NotificationManager.Policy(
        cats,
        NotificationManager.Policy.PRIORITY_SENDERS_ANY,
        NotificationManager.Policy.PRIORITY_SENDERS_ANY,
        visual
      )
      nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
    } catch (e: Exception) {
      // Not critical: the app lock still works without Do Not Disturb.
    }
  }

  /** Put the phone's own Do Not Disturb setup back. */
  private fun restore(ctx: Context) {
    val p = prefs(ctx)
    if (!p.getBoolean("dndSaved", false)) return
    val nm = nm(ctx)
    if (dndAllowed(ctx)) {
      try {
        val cats = p.getInt("oldCats", 0)
        val calls = p.getInt("oldCalls", 0)
        val msgs = p.getInt("oldMsgs", 0)
        val visual = p.getInt("oldVisual", 0)
        nm.notificationPolicy = if (Build.VERSION.SDK_INT >= 30) {
          NotificationManager.Policy(cats, calls, msgs, visual, p.getInt("oldConv", NotificationManager.Policy.CONVERSATION_SENDERS_NONE))
        } else {
          NotificationManager.Policy(cats, calls, msgs, visual)
        }
        val f = p.getInt("oldFilter", NotificationManager.INTERRUPTION_FILTER_ALL)
        nm.setInterruptionFilter(if (f <= 0) NotificationManager.INTERRUPTION_FILTER_ALL else f)
      } catch (e: Exception) {
        try { nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL) } catch (e2: Exception) {}
      }
    }
    p.edit().putBoolean("dndSaved", false).apply()
  }
}
