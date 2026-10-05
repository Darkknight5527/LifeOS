// LifeOS for Android: the full LifeOS website (every domain) in an app.
// The site loads from Render, so every website update appears here without
// installing a new APK. Sign-in, data and the phone layout are the website's own.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import { saveIncomingFile } from "./src/saveFile";
import { commitSync, healthStatus, openHealthSettings, readWeighIns } from "./src/health";

const SITE = Constants.expoConfig?.extra?.webUrl || "https://lifeos-web-qjrj.onrender.com";
const hostOf = (url) => (String(url).match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i) || [])[1] || "";
const HOST = hostOf(SITE);
const DARK = "#0b0b0d";

// Runs inside the page: reports the colour at the top and bottom edges so the
// phone's status bar and navigation bar can match whatever page is showing.
const PROBE = `
(function () {
  if (window.__lifeosProbe) return; window.__lifeosProbe = true;
  document.documentElement.classList.add('in-app');
  function bgAt(y) {
    var el = document.elementFromPoint(window.innerWidth / 2, y);
    while (el) {
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\\(.*,\\s*0\\)$/.test(c)) return c;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }
  var last = '';
  function report() {
    var msg = JSON.stringify({ top: bgAt(2), bottom: bgAt(window.innerHeight - 2) });
    if (msg !== last) { last = msg; window.ReactNativeWebView.postMessage(msg); }
  }
  setInterval(report, 400);
  report();
})();
true;
`;

function luminance(rgb) {
  const m = String(rgb).match(/\d+(\.\d+)?/g);
  if (!m) return 0;
  const [r, g, b] = m.map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const web = useRef(null);
  const canGoBack = useRef(false);
  const [bars, setBars] = useState({ top: DARK, bottom: DARK });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(DARK).catch(() => {});
  }, []);

  // ---- Talking to the website ----
  // Events go in as window "lifeos:native" CustomEvents.
  const toWeb = useCallback((type, detail = {}) => {
    const js = `window.dispatchEvent(new CustomEvent("lifeos:native",{detail:${JSON.stringify({ type, ...detail })}}));true;`;
    web.current?.injectJavaScript(js);
  }, []);
  const pendingSync = useRef(null);
  const lastAuto = useRef(0);
  const syncHealth = useCallback(
    async (interactive) => {
      try {
        const res = await readWeighIns({ interactive });
        pendingSync.current = res.pending || null;
        const { pending, ...rest } = res;
        toWeb("health", rest);
      } catch (e) {
        toWeb("health", { status: "error", error: String(e?.message || e) });
      }
    },
    [toWeb]
  );
  // Quietly pick up new weigh-ins when the app opens or comes back (at most every 10 min).
  const autoSync = useCallback(async () => {
    if (Date.now() - lastAuto.current < 10 * 60 * 1000) return;
    lastAuto.current = Date.now();
    const st = await healthStatus();
    if (st.status === "connected") syncHealth(false);
  }, [syncHealth]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && autoSync());
    return () => sub.remove();
  }, [autoSync]);

  // Android back button goes back inside LifeOS before leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && web.current) {
        web.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Links to other sites (YouTube tutorials, Google Calendar, news) open in
  // the phone's browser / apps instead of replacing LifeOS.
  const openOutside = useCallback((url) => {
    if (!url || url.startsWith("blob:") || url.startsWith("about:")) return;
    Linking.openURL(url).catch(() => {});
  }, []);
  const shouldLoad = useCallback(
    (req) => {
      const url = req.url || "";
      if (url.startsWith("about:") || url.startsWith("blob:") || url.startsWith("data:")) return true;
      if (!/^https?:/i.test(url)) {
        openOutside(url); // tel:, mailto:, intent: …
        return false;
      }
      if (hostOf(url) === HOST) return true;
      if (req.isTopFrame === false) return true; // embedded frames (e.g. videos) stay in the page
      openOutside(url);
      return false;
    },
    [openOutside]
  );

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setKey((k) => k + 1);
  };

  const topLight = luminance(bars.top) > 0.6;

  return (
    <View style={[s.root, { backgroundColor: bars.top }]}>
      <StatusBar style={topLight ? "dark" : "light"} />
      <View style={{ height: insets.top, backgroundColor: bars.top }} />
      <View style={{ flex: 1 }}>
        {!failed && (
          <WebView
            key={key}
            ref={web}
            source={{ uri: SITE }}
            style={{ flex: 1, backgroundColor: DARK }}
            containerStyle={{ backgroundColor: DARK }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled // keeps you signed in (the site stores its login in localStorage)
            cacheEnabled
            allowFileAccess
            allowsBackForwardNavigationGestures
            textZoom={100}
            overScrollMode="never"
            setSupportMultipleWindows
            applicationNameForUserAgent="LifeOSApp/1.0"
            injectedJavaScript={PROBE}
            onShouldStartLoadWithRequest={shouldLoad}
            onOpenWindow={(e) => {
              const url = e.nativeEvent.targetUrl;
              if (hostOf(url) === HOST) return web.current?.injectJavaScript(`location.href=${JSON.stringify(url)};true;`);
              openOutside(url);
            }}
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
            }}
            onLoadEnd={() => {
              setLoading(false);
              setTimeout(autoSync, 1500);
            }}
            onError={() => setFailed(true)}
            onRenderProcessGone={() => retry()}
            onMessage={(e) => {
              try {
                const m = JSON.parse(e.nativeEvent.data);
                if (m.type === "save-file") saveIncomingFile(m);
                else if (m.type === "health-status") healthStatus().then((st) => toWeb("health-status", st));
                else if (m.type === "health-connect") syncHealth(true);
                else if (m.type === "health-sync") syncHealth(false);
                else if (m.type === "health-settings") openHealthSettings();
                else if (m.type === "health-saved") {
                  commitSync(pendingSync.current);
                  pendingSync.current = null;
                }
                else if (m.top && m.bottom) setBars({ top: m.top, bottom: m.bottom });
              } catch {
                /* ignore */
              }
            }}
          />
        )}
        {loading && !failed && (
          <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: DARK }]}>
            <Logo />
            <ActivityIndicator color="#ff7a1a" style={{ marginTop: 22 }} />
          </View>
        )}
        {failed && (
          <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: DARK, padding: 28 }]}>
            <Logo />
            <Text style={s.title}>Can't reach LifeOS</Text>
            <Text style={s.body}>Check your internet connection and try again.</Text>
            <Pressable onPress={retry} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
              <Text style={s.btnText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
      <View style={{ height: insets.bottom, backgroundColor: bars.bottom }} />
    </View>
  );
}

function Logo() {
  return (
    <View style={s.logo}>
      <Text style={s.logoText}>L</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#ff7a1a", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  title: { color: "#f4f4f5", fontSize: 20, fontWeight: "800", marginTop: 22 },
  body: { color: "#9b9ba5", fontSize: 14, marginTop: 6, textAlign: "center" },
  btn: { marginTop: 22, backgroundColor: "#ff7a1a", borderRadius: 16, paddingVertical: 13, paddingHorizontal: 28 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
