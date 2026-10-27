// Mind › Focus › Phone lock: locks the phone for a set time (Android app).
// Only Phone, Messages and Spotify work; notifications are silenced except
// calls. Leaving early needs a code emailed to you. The website starts the
// session; the app enforces it.
import { useEffect, useState } from "react";
import { api } from "../../../api";
import { IN_APP, appVersionBelow, onAppMessage, sendToApp } from "../../../lib/inApp.js";
import { FinCard, Icon, PrimaryButton } from "../../finances/fin-ui.jsx";
import { useToast } from "../../../components/Toast.jsx";

const LENGTHS = [30, 60, 90, 120, 180, 240];
const label = (m) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m / 60} h`);
const NEEDS = "1.10.0";

export function PhoneLock() {
  const toast = useToast();
  const [hist, setHist] = useState(null); // { sessions, emailReady }
  const [phone, setPhone] = useState(null); // native status from the app
  const [len, setLen] = useState(120);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipDnd, setSkipDnd] = useState(false);
  const old = IN_APP && appVersionBelow(NEEDS);

  useEffect(() => {
    api.focusSessions().then(setHist).catch(() => setHist({ sessions: [], emailReady: true }));
  }, []);
  useEffect(() => {
    if (!IN_APP || old) return;
    const off = onAppMessage((m) => {
      if (m.type !== "focus-state") return;
      setPhone(m);
      if (m.ended) api.focusSessions().then(setHist).catch(() => {});
    });
    sendToApp("focus-status");
    return off;
  }, [old]);

  const start = async () => {
    setBusy(true);
    try {
      const s = await api.focusStart(len);
      sendToApp("focus-start", { id: s.id, ticket: s.ticket, endsAt: s.endsAt });
      setSure(false);
      api.focusSessions().then(setHist).catch(() => {});
    } catch (e) {
      toast(e.message || "Couldn't start", true);
    } finally {
      setBusy(false);
    }
  };

  // This week, from Monday.
  const monday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  })();
  const week = (hist?.sessions || []).filter((x) => x.startedAt >= monday);
  const mins = week.reduce((a, x) => a + Math.max(0, Math.round(((x.endedAt || Math.min(Date.now(), x.endsAt)) - x.startedAt) / 60000)), 0);
  const early = week.filter((x) => x.endedBy === "code").length;
  const ready = phone?.supported && phone.accessibility;
  const btn = "rounded-xl bg-fin-tile px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:text-white";

  return (
    <FinCard title={<span className="flex items-center gap-2"><Icon name="lock" size={15} /> Phone lock</span>}>
      <p className="text-[13.5px] leading-relaxed text-fin-muted">Locks your phone for a set time: only calls, messages, WhatsApp and Spotify work, and only calls ring. Leaving early needs a code sent to your email.</p>

      {!IN_APP ? (
        <div className="mt-3 rounded-2xl bg-fin-input px-3.5 py-3 text-[13.5px] text-white/80">Start it from the LifeOS app on your phone (Mind › Focus).</div>
      ) : old || (phone && !phone.supported) ? (
        <div className="mt-3 rounded-2xl bg-amber-400/10 px-3.5 py-3 text-[13.5px] text-amber-200">Needs the latest LifeOS app ({NEEDS}) from the download link.</div>
      ) : hist && !hist.emailReady ? (
        <div className="mt-3 rounded-2xl bg-amber-400/10 px-3.5 py-3 text-[13.5px] text-amber-200">Email isn't set up on the server yet, so an emergency code couldn't be sent. Set it up first (RESEND_API_KEY on Render).</div>
      ) : !phone ? (
        <div className="mt-3 h-10 animate-pulse rounded-2xl bg-fin-input" />
      ) : !ready || (!phone.dnd && !skipDnd) ? (
        <div className="mt-3 space-y-2">
          <Step done={phone.accessibility} n={1} title='Turn on "LifeOS Focus mode"' sub="Settings › Accessibility › Installed apps. It only checks which app is open during a session.">
            <button onClick={() => sendToApp("focus-setup", { what: "accessibility" })} className={btn}>Open</button>
          </Step>
          {!phone.accessibility && (
            <div className="pl-9 text-[12px] leading-relaxed text-fin-faint">
              Greyed out ("restricted setting")? Open App info › ⋮ menu › <b className="text-white/70">Allow restricted settings</b>, then try again.{" "}
              <button onClick={() => sendToApp("focus-setup", { what: "app-info" })} className="font-semibold text-fin-accent">App info</button>
            </div>
          )}
          <Step done={phone.dnd} n={2} title="Allow Do Not Disturb" sub="So only calls ring during a session.">
            <button onClick={() => sendToApp("focus-setup", { what: "dnd" })} className={btn}>Open</button>
          </Step>
          {ready && !phone.dnd && (
            <button onClick={() => setSkipDnd(true)} className="text-[12.5px] text-fin-muted underline">Skip — lock apps only</button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-1.5">
            {LENGTHS.map((m) => (
              <button key={m} onClick={() => (setLen(m), setSure(false))} className={`rounded-xl py-2 text-[14px] font-semibold transition ${len === m ? "bg-fin-accent text-white" : "bg-fin-input text-white/75 hover:bg-fin-tile"}`}>{label(m)}</button>
            ))}
          </div>
          {sure ? (
            <div className="mt-3 rounded-2xl bg-fin-accent/10 p-3.5 ring-1 ring-fin-accent/30">
              <div className="text-[14px] font-semibold">Lock the phone for {label(len)}?</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-fin-muted">Until {new Date(Date.now() + len * 60000).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. You can't leave without the emailed code.</div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setSure(false)} className="flex-1 rounded-xl bg-fin-tile py-2.5 text-[14px] font-semibold">Not now</button>
                <button onClick={start} disabled={busy} className="flex-1 rounded-xl bg-fin-accent py-2.5 text-[14px] font-bold text-white disabled:opacity-50">{busy ? "Starting…" : "Lock now"}</button>
              </div>
            </div>
          ) : (
            <PrimaryButton className="mt-3 w-full !py-2.5 !text-[15px]" onClick={() => setSure(true)}>Lock phone · {label(len)}</PrimaryButton>
          )}
        </div>
      )}

      {week.length > 0 && (
        <div className="mt-3 text-[12.5px] text-fin-muted">
          This week: <b className="text-white/85">{label(Math.max(1, mins))}</b> locked · {week.length} session{week.length === 1 ? "" : "s"}{early ? ` · ${early} ended early` : ""}
        </div>
      )}
    </FinCard>
  );
}

function Step({ done, n, title, sub, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-fin-input px-3 py-2.5">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${done ? "bg-emerald-400 text-black" : "bg-white/10 text-white/70"}`}>{done ? <Icon name="check" size={13} stroke={3} /> : n}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12px] text-fin-muted">{sub}</span>
      </span>
      {!done && children}
    </div>
  );
}
