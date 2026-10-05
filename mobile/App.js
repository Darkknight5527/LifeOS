// LifeOS for Android — first feature: water tracking with reminders.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { getAuth, signIn, signOut } from "./src/api";
import { addWater, getWater, refreshWater, setGlass } from "./src/water";
import {
  askPermission,
  fmtClock,
  fmtL,
  getReminderSettings,
  handleResponse,
  nextReminder,
  planReminders,
  saveReminderSettings,
  setupNotifications,
  testReminder,
} from "./src/reminders";

const extra = Constants.expoConfig?.extra || {};
const C = {
  bg: "#0b0b0d",
  card: "#18181d",
  tile: "#232329",
  input: "#121215",
  text: "#f4f4f5",
  muted: "#9b9ba5",
  faint: "#6b6b75",
  brand: "#ff7a1a",
  water: "#60a5fa",
  waterDeep: "#1d4ed8",
  danger: "#f87171",
};

export default function App() {
  const [auth, setAuth] = useState(undefined); // undefined = still loading
  useEffect(() => {
    getAuth().then((a) => setAuth(a || null));
  }, []);
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {auth === undefined ? (
        <ActivityIndicator color={C.brand} style={{ marginTop: 120 }} />
      ) : auth ? (
        <Home auth={auth} onSignOut={async () => (await signOut(), setAuth(null))} />
      ) : (
        <Login onDone={setAuth} />
      )}
    </View>
  );
}

/* ---------------- sign in ---------------- */
function Login({ onDone }) {
  const [server, setServer] = useState(extra.apiUrl || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      onDone(await signIn(server, email.trim(), password));
    } catch (e) {
      setErr(e.name === "AbortError" ? "The server took too long — it may be waking up. Try again." : e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.loginWrap} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoText}>L</Text>
        </View>
        <Text style={s.h1}>LifeOS</Text>
        <Text style={[s.muted, { marginBottom: 28 }]}>Sign in with your LifeOS account</Text>
        {!extra.apiUrl && (
          <Field label="Server address" value={server} onChangeText={setServer} placeholder="your-backend.onrender.com" autoCapitalize="none" keyboardType="url" />
        )}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete="password" onSubmitEditing={go} />
        {!!err && <Text style={s.error}>{err}</Text>}
        <Pressable onPress={go} disabled={busy || !email || !password} style={({ pressed }) => [s.primary, (busy || !email || !password) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Sign in</Text>}
        </Pressable>
        {busy && <Text style={[s.faint, { marginTop: 12, textAlign: "center" }]}>First sign-in can take up to a minute while the server wakes up.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={C.faint} style={s.input} />
    </View>
  );
}

/* ---------------- home: water ---------------- */
function Home({ auth, onSignOut }) {
  const [w, setW] = useState(null);
  const [rem, setRem] = useState(null);
  const [next, setNext] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [perm, setPerm] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const say = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const replan = useCallback(async () => {
    setNext(await planReminders());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      setW(await refreshWater());
      setOffline(false);
    } catch (e) {
      setOffline(true);
      if (e.status === 401) onSignOut();
    } finally {
      setSyncing(false);
      await replan();
    }
  }, [onSignOut, replan]);

  useEffect(() => {
    (async () => {
      setW(await getWater());
      setRem(await getReminderSettings());
      setNext(await nextReminder());
      await setupNotifications();
      setPerm(await askPermission());
      // Opened by tapping a notification button?
      const last = Notifications.getLastNotificationResponse();
      if (last && (await handleResponse(last))) Notifications.clearLastNotificationResponse();
      sync();
    })();
    const sub = Notifications.addNotificationResponseReceivedListener(async (r) => {
      if (await handleResponse(r)) {
        setW(await getWater());
        setNext(await nextReminder());
      }
    });
    const app = AppState.addEventListener("change", (st) => st === "active" && sync());
    return () => {
      sub.remove();
      app.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drink = async (ml) => {
    const n = await addWater(ml);
    setW(n);
    say(ml > 0 ? `+${ml} ml logged` : `${ml} ml removed`);
    await replan();
  };
  const updateRem = async (patch) => {
    const n = await saveReminderSettings(patch);
    setRem(n);
    setNext(await nextReminder());
  };
  const changeGlass = async (ml) => {
    setW(await setGlass(ml));
    await setupNotifications(); // relabel the "+ml" button
    await replan();
  };

  if (!w || !rem) return <ActivityIndicator color={C.brand} style={{ marginTop: 120 }} />;
  const pct = Math.min(1, w.ml / (w.target || 1));
  const left = Math.max(0, w.target - w.ml);
  const glass = w.glass || 250;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} tintColor={C.water} colors={[C.water]} progressBackgroundColor={C.card} />}
      >
        <View style={s.header}>
          <View style={[s.logo, { width: 40, height: 40, borderRadius: 12, marginBottom: 0 }]}>
            <Text style={[s.logoText, { fontSize: 20 }]}>L</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.h2}>LifeOS</Text>
            <Text style={s.muted}>{today}</Text>
          </View>
          <Text style={[s.faint, { fontSize: 12 }]}>{syncing ? "Syncing…" : offline ? "Offline · saved on phone" : "Synced"}</Text>
        </View>

        {/* Water hero */}
        <View style={s.hero}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroKicker}>WATER TODAY</Text>
            <Text style={s.heroBig}>{fmtL(w.ml)}</Text>
            <Text style={s.heroSub}>of {fmtL(w.target)} · {left ? `${fmtL(left)} to go` : "target reached 🎉"}</Text>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={[s.heroSub, { marginTop: 10 }]}>
              {rem.enabled ? (next ? `Next reminder ${sameDay(next) ? "at" : "on"} ${fmtWhen(next)}` : "No more reminders today") : "Reminders are off"}
            </Text>
          </View>
          <Glass pct={pct} />
        </View>

        <View style={s.row}>
          <Big onPress={() => drink(glass)} label={`+${glass} ml`} sub="a glass" primary />
          <Big onPress={() => drink(glass * 2)} label={`+${glass * 2} ml`} sub="a bottle" />
          <Big onPress={() => w.ml > 0 && drink(-Math.min(glass, w.ml))} label={`−${glass}`} sub="undo" />
        </View>

        {!perm && (
          <Card title="Notifications are off">
            <Text style={s.body}>Allow notifications so LifeOS can remind you to drink water.</Text>
            <Pressable onPress={() => Linking.openSettings()} style={[s.ghost, { marginTop: 10 }]}>
              <Text style={s.ghostText}>Open settings</Text>
            </Pressable>
          </Card>
        )}

        {/* Reminder settings */}
        <Card
          title="Water reminders"
          right={<Switch value={rem.enabled} onValueChange={(v) => updateRem({ enabled: v })} trackColor={{ true: C.water, false: C.tile }} thumbColor="#fff" />}
        >
          <Text style={s.label}>Remind me every</Text>
          <Chips value={rem.everyMin} onChange={(v) => updateRem({ everyMin: v })} options={[[60, "1 h"], [90, "1.5 h"], [120, "2 h"], [180, "3 h"]]} />
          <Text style={[s.label, { marginTop: 14 }]}>Between</Text>
          <View style={s.row}>
            <Stepper value={rem.start} onChange={(v) => updateRem({ start: Math.min(v, rem.end - 60) })} />
            <Text style={[s.muted, { alignSelf: "center" }]}>and</Text>
            <Stepper value={rem.end} onChange={(v) => updateRem({ end: Math.max(v, rem.start + 60) })} />
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Glass size</Text>
          <Chips value={glass} onChange={changeGlass} options={[[150, "150"], [200, "200"], [250, "250"], [300, "300"], [500, "500"]]} />
          <Text style={[s.faint, { marginTop: 12, lineHeight: 18 }]}>
            Reminders skip if you drank recently and stop for the day once you hit your target. Tap “+{glass} ml” on a notification to log without opening the app.
          </Text>
          <Pressable
            onPress={async () => {
              await testReminder();
              say("Test reminder in 5 seconds");
            }}
            style={[s.ghost, { marginTop: 12 }]}
          >
            <Text style={s.ghostText}>Send a test reminder</Text>
          </Pressable>
        </Card>

        <Card title="If reminders arrive late">
          <Text style={s.body}>
            Some phones pause apps to save battery. Open settings → Battery → choose “Unrestricted” / “Don’t optimise”, and allow “Alarms & reminders” if you see it.
          </Text>
          <Pressable onPress={() => Linking.openSettings()} style={[s.ghost, { marginTop: 10 }]}>
            <Text style={s.ghostText}>Open LifeOS settings</Text>
          </Pressable>
        </Card>

        <Card title="Everything else">
          <Text style={s.body}>Finances, grooming, fitness, calisthenics and the Morning Paper are on the website for now — they’ll come to the app section by section.</Text>
          {!!extra.webUrl && (
            <Pressable onPress={() => Linking.openURL(extra.webUrl)} style={[s.ghost, { marginTop: 10 }]}>
              <Text style={s.ghostText}>Open LifeOS website</Text>
            </Pressable>
          )}
        </Card>

        <Pressable onPress={onSignOut} style={{ alignSelf: "center", padding: 14 }}>
          <Text style={[s.faint, { fontSize: 13 }]}>Sign out of {auth.email || "LifeOS"}</Text>
        </Pressable>
      </ScrollView>
      {!!toast && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const sameDay = (d) => new Date().toDateString() === d.toDateString();
const fmtWhen = (d) =>
  sameDay(d) ? fmtClock(d.getHours() * 60 + d.getMinutes()) : `${d.toLocaleDateString("en-IN", { weekday: "short" })} ${fmtClock(d.getHours() * 60 + d.getMinutes())}`;

/* ---------------- pieces ---------------- */
function Glass({ pct }) {
  return (
    <View style={s.glass}>
      <View style={[s.glassFill, { height: `${Math.max(4, pct * 100)}%` }]} />
      <Text style={s.glassPct}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

function Big({ label, sub, onPress, primary }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.big, primary && { backgroundColor: C.water }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <Text style={[s.bigText, primary && { color: "#06142e" }]}>{label}</Text>
      <Text style={[s.faint, { fontSize: 12 }, primary && { color: "#0b2a5c" }]}>{sub}</Text>
    </Pressable>
  );
}

function Card({ title, right, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title.toUpperCase()}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Chips({ value, onChange, options }) {
  return (
    <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[s.chip, value === v && s.chipOn]}>
          <Text style={[s.chipText, value === v && { color: C.water }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stepper({ value, onChange }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(Math.max(0, value - 30))} style={s.stepBtn} hitSlop={8}>
        <Text style={s.stepSign}>−</Text>
      </Pressable>
      <Text style={s.stepVal}>{fmtClock(value)}</Text>
      <Pressable onPress={() => onChange(Math.min(23 * 60 + 30, value + 30))} style={s.stepBtn} hitSlop={8}>
        <Text style={s.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === "android" ? 36 : 54 },
  loginWrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  h1: { color: C.text, fontSize: 30, fontWeight: "800" },
  h2: { color: C.text, fontSize: 20, fontWeight: "800" },
  muted: { color: C.muted, fontSize: 14 },
  faint: { color: C.faint, fontSize: 13 },
  body: { color: "#d4d4d8", fontSize: 14, lineHeight: 20 },
  label: { color: C.muted, fontSize: 13, marginBottom: 8, fontWeight: "600" },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  error: { color: C.danger, marginBottom: 10, fontSize: 14 },
  primary: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  page: { padding: 16, paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  hero: { flexDirection: "row", gap: 16, backgroundColor: "#1e3a8a", borderRadius: 26, padding: 20, overflow: "hidden" },
  heroKicker: { color: "#bfdbfe", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroBig: { color: "#fff", fontSize: 44, fontWeight: "800", marginTop: 2 },
  heroSub: { color: "#dbeafe", fontSize: 14 },
  bar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: "#93c5fd" },
  glass: { width: 64, borderRadius: 14, borderWidth: 3, borderColor: "rgba(255,255,255,0.55)", justifyContent: "flex-end", overflow: "hidden", alignItems: "center" },
  glassFill: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.water },
  glassPct: { color: "#fff", fontWeight: "800", fontSize: 14, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  big: { flex: 1, backgroundColor: C.card, borderRadius: 18, paddingVertical: 16, alignItems: "center" },
  bigText: { color: C.text, fontSize: 18, fontWeight: "800" },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 16 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { color: C.muted, fontSize: 12.5, fontWeight: "700", letterSpacing: 1 },
  chip: { backgroundColor: C.tile, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: "rgba(96,165,250,0.15)", borderWidth: 1, borderColor: "rgba(96,165,250,0.6)" },
  chipText: { color: C.text, fontWeight: "700", fontSize: 14 },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.input, borderRadius: 14, paddingHorizontal: 6, paddingVertical: 6 },
  stepBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.tile, alignItems: "center", justifyContent: "center" },
  stepSign: { color: C.text, fontSize: 18, fontWeight: "800" },
  stepVal: { color: C.text, fontSize: 15, fontWeight: "700" },
  ghost: { backgroundColor: C.tile, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  ghostText: { color: C.text, fontWeight: "700", fontSize: 14 },
  toast: { position: "absolute", bottom: 28, alignSelf: "center", backgroundColor: "#2e2e36", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  toastText: { color: C.text, fontWeight: "700" },
});
