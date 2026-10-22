// Focus mode, phone side. While a session runs this screen covers LifeOS:
// a countdown, shortcuts to Phone, Messages and Spotify, and an emergency
// exit that needs a code emailed to you. The native FocusLock part sends you
// back here from any other app and keeps Do Not Disturb on (calls only).
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import FocusLock from "../modules/focus-lock";
import { readPrefs, writePrefs } from "./prefs";

export const focusSupported = Boolean(FocusLock);

export function focusStatus() {
  if (!FocusLock) return { supported: false };
  try {
    return FocusLock.status();
  } catch (e) {
    return { supported: false, error: String(e?.message || e) };
  }
}

/** Start a session the website created: { id, ticket, endsAt }. */
export function startFocus({ id, ticket, endsAt }, api) {
  if (!FocusLock) return { supported: false };
  const st = FocusLock.start(Number(endsAt), []);
  if (st.active) writePrefs({ focus: { id, ticket, endsAt: Number(endsAt), api } });
  return st;
}

export function focusSetup(what) {
  if (!FocusLock) return;
  if (what === "accessibility") FocusLock.openAccessibilitySettings();
  else if (what === "dnd") FocusLock.openDndSettings();
  else if (what === "app-info") FocusLock.openAppInfo();
}

const pad = (n) => String(n).padStart(2, "0");
const left = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * Covers the whole app while Focus is on. `onEnd(how)` runs when it ends
 * ("time" or "code"). Polls the native state every second.
 */
export function FocusOverlay({ onChange }) {
  const [st, setSt] = useState(() => focusStatus());
  const [now, setNow] = useState(Date.now());
  const [exit, setExit] = useState(null); // null | { step: "ask" | "code", sentTo, code, busy, error }
  const wasActive = useRef(st.active);

  const refresh = useCallback(() => {
    const next = focusStatus();
    setSt(next);
    setNow(Date.now());
    if (wasActive.current && !next.active) {
      // Ended by time: tell the server (best effort) and forget the session.
      const f = readPrefs().focus;
      if (f?.id && f?.ticket && Date.now() >= f.endsAt - 5000) post(`${f.api}/api/focus-exit/${f.id}/done`, { ticket: f.ticket }).catch(() => {});
      writePrefs({ focus: null });
      setExit(null);
      onChange?.(next, "time");
    }
    wasActive.current = Boolean(next.active);
  }, [onChange]);

  useEffect(() => {
    if (!FocusLock) return;
    const t = setInterval(refresh, 1000);
    const sub = AppState.addEventListener("change", (a) => a === "active" && refresh());
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [refresh]);

  // While Focus is on, Back does nothing here (the app can't be left that way).
  useEffect(() => {
    if (!st.active) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (exit) setExit(null);
      return true;
    });
    return () => sub.remove();
  }, [st.active, exit]);

  if (!st.active) return null;
  const f = readPrefs().focus;

  const askCode = async () => {
    if (!f?.id) return setExit({ step: "ask", error: "This session's details are missing on the phone. It ends by itself when the time is up." });
    setExit((x) => ({ ...(x || {}), step: x?.step || "ask", busy: true, error: "" }));
    try {
      const r = await post(`${f.api}/api/focus-exit/${f.id}/code`, { ticket: f.ticket });
      if (r.ended) return finish();
      setExit({ step: "code", sentTo: r.sentTo, code: "", busy: false, error: "" });
    } catch (e) {
      setExit((x) => ({ ...(x || {}), step: x?.step || "ask", busy: false, error: e.message || "No connection — try again." }));
    }
  };
  const verify = async () => {
    setExit((x) => ({ ...x, busy: true, error: "" }));
    try {
      await post(`${f.api}/api/focus-exit/${f.id}/verify`, { ticket: f.ticket, code: exit.code });
      finish("code");
    } catch (e) {
      setExit((x) => ({ ...x, busy: false, error: e.message || "No connection — try again." }));
    }
  };
  const finish = (how = "time") => {
    let next = st;
    try {
      next = FocusLock.stop();
    } catch {
      /* ignore */
    }
    writePrefs({ focus: null });
    wasActive.current = false;
    setExit(null);
    setSt(next);
    onChange?.(next, how);
  };

  const ms = (st.endsAt || 0) - now;
  return (
    <View style={[StyleSheet.absoluteFill, s.wrap]}>
      <Text style={s.kicker}>FOCUS MODE</Text>
      <Text style={s.time}>{left(ms)}</Text>
      <Text style={s.sub}>
        until {new Date(st.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · only calls ring
      </Text>

      {!exit ? (
        <>
          <View style={s.row}>
            <Big label="Phone" sub="Call" onPress={() => FocusLock.launch("dialer")} />
            <Big label="Messages" sub="SMS" onPress={() => FocusLock.launch("sms")} />
            {st.spotify && <Big label="Spotify" sub="Music" onPress={() => FocusLock.launch("spotify")} />}
          </View>
          <Text style={s.note}>Everything else is paused. Put the phone down — you've got this.</Text>
          <Pressable onPress={() => setExit({ step: "ask" })} style={s.exitLink} hitSlop={10}>
            <Text style={s.exitText}>Emergency exit</Text>
          </Pressable>
        </>
      ) : (
        <View style={s.card}>
          {exit.step === "ask" ? (
            <>
              <Text style={s.cardTitle}>Leave Focus early?</Text>
              <Text style={s.cardBody}>A 6-digit code will be emailed to you. Read it on your laptop and type it here. Only for real emergencies.</Text>
              <View style={s.btnRow}>
                <Pressable onPress={() => setExit(null)} style={[s.btn, s.btnGhost]}><Text style={s.btnText}>Stay focused</Text></Pressable>
                <Pressable onPress={askCode} disabled={exit.busy} style={[s.btn, s.btnMain]}>{exit.busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Email me a code</Text>}</Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={s.cardTitle}>Enter the code</Text>
              <Text style={s.cardBody}>Sent to {exit.sentTo}. It works for 10 minutes.</Text>
              <TextInput
                value={exit.code}
                onChangeText={(t) => setExit((x) => ({ ...x, code: t.replace(/\D/g, "").slice(0, 6) }))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#55555f"
                style={s.input}
                autoFocus
              />
              <View style={s.btnRow}>
                <Pressable onPress={() => setExit(null)} style={[s.btn, s.btnGhost]}><Text style={s.btnText}>Stay focused</Text></Pressable>
                <Pressable onPress={verify} disabled={exit.busy || exit.code.length !== 6} style={[s.btn, s.btnMain, (exit.busy || exit.code.length !== 6) && { opacity: 0.5 }]}>
                  {exit.busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>End Focus</Text>}
                </Pressable>
              </View>
              <Pressable onPress={askCode} disabled={exit.busy} hitSlop={8} style={{ marginTop: 14, alignSelf: "center" }}>
                <Text style={s.exitText}>Send a new code</Text>
              </Pressable>
            </>
          )}
          {!!exit.error && <Text style={s.error}>{exit.error}</Text>}
        </View>
      )}
    </View>
  );
}

function Big({ label, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.big, pressed && { opacity: 0.75 }]}>
      <Text style={s.bigLabel}>{label}</Text>
      <Text style={s.bigSub}>{sub}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: "#0b0b0d", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50, elevation: 50 },
  kicker: { color: "#a78bfa", fontSize: 13, fontWeight: "800", letterSpacing: 2 },
  time: { color: "#fff", fontSize: 64, fontWeight: "800", marginTop: 8, fontVariant: ["tabular-nums"] },
  sub: { color: "#9b9ba5", fontSize: 14, marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginTop: 40 },
  big: { width: 96, height: 96, borderRadius: 24, backgroundColor: "#1c1c22", alignItems: "center", justifyContent: "center" },
  bigLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  bigSub: { color: "#9b9ba5", fontSize: 12, marginTop: 3 },
  note: { color: "#6f6f78", fontSize: 13, marginTop: 28, textAlign: "center", maxWidth: 280 },
  exitLink: { position: "absolute", bottom: 36 },
  exitText: { color: "#7c7c86", fontSize: 13.5, fontWeight: "700", textDecorationLine: "underline" },
  card: { marginTop: 36, width: "100%", maxWidth: 360, backgroundColor: "#17171c", borderRadius: 24, padding: 20 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardBody: { color: "#9b9ba5", fontSize: 14, marginTop: 6, lineHeight: 20 },
  input: { marginTop: 16, backgroundColor: "#0f0f13", color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 10, textAlign: "center", borderRadius: 16, paddingVertical: 12 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: "#26262d" },
  btnMain: { backgroundColor: "#7c5cf2" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  error: { color: "#f87171", fontSize: 13.5, marginTop: 12 },
});
