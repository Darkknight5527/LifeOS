// Grooming › Skin › Scan: today's AI skin check, how each score is moving,
// a before/after slider, and every past check.
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, PrimaryButton, Ring, Segmented } from "../../finances/fin-ui.jsx";
import { LineChart } from "../../fitness/fit-ui.jsx";
import { useToast } from "../../../components/Toast.jsx";
import { todayISO } from "../skin/lib";
import { ANGLES, METRICS, fmtDay, overallColor, sevColor, sevWord } from "./lib.js";
import { photoUrl, useSkinScans } from "./useSkinScans.js";
import ScanCapture from "./ScanCapture.jsx";

// Laptop: every column fits the screen and scrolls on its own.
const H = "lg:h-[calc(100dvh-178px)] lg:min-h-[380px]";

export default function ScanView() {
  const { scans, loading, error, reload, create, reanalyze, remove } = useSkinScans();
  const today = todayISO();
  const [capturing, setCapturing] = useState(false);
  const [openId, setOpenId] = useState(null);
  const shown = scans.find((s) => s._id === openId) || scans[0];
  const prev = shown ? scans.find((s) => s.date < shown.date && s.status === "done") : null;
  const hasToday = scans.some((s) => s.date === today);

  if (loading && !scans.length) return <div className="h-[420px] animate-pulse rounded-[24px] bg-fin-card" />;

  return (
    <>
      {capturing && (
        <ScanCapture
          date={today}
          onSubmit={create}
          onClose={(scan) => {
            setCapturing(false);
            if (scan?._id) setOpenId(scan._id);
          }}
        />
      )}
      {!scans.length ? (
        <FinCard>
          <Intro onStart={() => setCapturing(true)} error={error} onRetry={reload} />
        </FinCard>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-4 [&>*]:min-w-0">
          <div className={`fin-scroll space-y-5 lg:space-y-4 lg:overflow-y-auto lg:rounded-[24px] ${H}`}>
            {!hasToday && (
              <button onClick={() => setCapturing(true)} className="flex w-full items-center gap-4 rounded-[24px] bg-gradient-to-br from-[#36d6c2] via-[#1fb5a6] to-[#0e7f77] p-5 text-left shadow-glow transition active:scale-[0.99]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black/15"><Icon name="sparkle" size={24} stroke={2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold">Check today's skin</span>
                  <span className="block text-[14px] text-white/85">Three quick selfies · about a minute</span>
                </span>
                <Icon name="right" size={22} />
              </button>
            )}
            {shown && (
              <Result
                scan={shown}
                prev={prev}
                isToday={shown.date === today}
                onRetake={() => setCapturing(true)}
                onReanalyze={() => reanalyze(shown._id)}
                onDelete={async () => {
                  await remove(shown._id);
                  setOpenId(null);
                }}
              />
            )}
          </div>
          <div className={`space-y-5 lg:flex lg:flex-col lg:gap-4 lg:space-y-0 ${H}`}>
            <Progress scans={scans} />
            <PastChecks scans={scans} selected={shown?._id} onOpen={(id) => {
              setOpenId(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} />
          </div>
          <div className={`lg:flex lg:flex-col ${H}`}>
            <Compare scans={scans} />
          </div>
        </div>
      )}
    </>
  );
}

function Intro({ onStart, error, onRetry }) {
  return (
    <div className="mx-auto max-w-[520px] py-4 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#2dd4bf]/15 text-[#5eead4]"><Icon name="sparkle" size={30} stroke={1.8} /></span>
      <div className="mt-4 text-[22px] font-extrabold">AI skin check</div>
      <p className="mt-2 text-[15px] leading-relaxed text-fin-muted">
        Take three selfies (front, left, right). The AI scores acne, marks, redness, oiliness, dryness, dark circles, texture and tone, writes what it sees, and tracks how each one changes over time.
      </p>
      <ul className="mx-auto mt-4 max-w-[380px] space-y-1.5 text-left text-[14px] text-white/75">
        <li>☀️ Same spot, same light every time — a window in daylight is ideal</li>
        <li>🧼 Clean face, no makeup or filters, hair off your face</li>
        <li>🩺 It describes what it sees — it isn't a doctor</li>
      </ul>
      {error && (
        <div className="mt-4 text-[14px] text-fin-danger">
          {error} <button onClick={onRetry} className="underline">Retry</button>
        </div>
      )}
      <PrimaryButton className="mt-6 w-full sm:w-auto sm:px-10" onClick={onStart}>Start my first check</PrimaryButton>
    </div>
  );
}

// ---------- one check's result ----------
function Result({ scan, prev, isToday, onRetake, onReanalyze, onDelete }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast(okMsg);
    } catch (e) {
      toast(e.message || "Something went wrong", true);
    } finally {
      setBusy(false);
    }
  };
  const done = scan.status === "done";
  const delta = done && prev?.overall != null ? scan.overall - prev.overall : null;

  return (
    <FinCard
      title={isToday ? "Today's skin" : fmtDay(scan.date, { weekday: "long", day: "numeric", month: "long" })}
      action={
        <div className="flex items-center gap-1">
          {isToday && <GhostButton className="!px-3 !py-1.5 !text-[13px]" onClick={onRetake}>Retake</GhostButton>}
          <IconButton
            icon="trash"
            label="Delete this check"
            onClick={() => window.confirm("Delete this skin check and its photos?") && run(onDelete, "Check deleted")}
          />
        </div>
      }
    >
      <Photos scan={scan} />

      {!done ? (
        <div className="mt-4 rounded-2xl bg-fin-input p-4 text-[14px]">
          <div className="font-semibold">{scan.status === "pending" ? "Still being read…" : "The AI couldn't read this one"}</div>
          {scan.error && <div className="mt-1 text-fin-muted">{scan.error}</div>}
          <PrimaryButton disabled={busy} className="mt-3 !py-2 !text-[14px]" onClick={() => run(onReanalyze, "Done")}>
            {busy ? "Reading…" : "Try again"}
          </PrimaryButton>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <Ring value={scan.overall} max={100} color={overallColor(scan.overall)} size={84} stroke={8}>
              <span className="tabular text-[22px] font-extrabold">{scan.overall}</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-[17px] font-bold leading-snug">{scan.headline}</div>
              <div className="mt-1 text-[13px] text-fin-muted">
                Skin score out of 100
                {delta != null && (
                  <span className={`ml-2 font-semibold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-orange-400" : ""}`}>
                    {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)} since {fmtDay(prev.date)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {scan.photoQuality && !scan.photoQuality.usable && (
            <div className="mt-3 rounded-2xl bg-amber-400/10 px-4 py-2.5 text-[13.5px] text-amber-200">⚠ Photo quality: {scan.photoQuality.issues || "hard to read"} — scores may be off.</div>
          )}
          {scan.seeDermatologist && (
            <div className="mt-3 rounded-2xl bg-red-500/10 px-4 py-2.5 text-[13.5px] text-red-200">🩺 Something here may be worth showing a dermatologist.</div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {METRICS.map((m) => {
              const v = scan.scores?.[m.id] ?? 0;
              const p = prev?.scores?.[m.id];
              const d = p != null ? Math.round((v - p) * 10) / 10 : null;
              return (
                <div key={m.id} title={m.info}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="font-semibold text-white/85">{m.label}</span>
                    <span className="tabular text-fin-muted">
                      {d ? <span className={d < 0 ? "text-emerald-400" : "text-orange-400"}>{d < 0 ? "↓" : "↑"} </span> : null}
                      {sevWord(v)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fin-input">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, v * 10)}%`, background: sevColor(v) }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 text-[11.5px] text-fin-faint">Shorter bars are better · ↓ = less than last check</div>

          <p className="selectable mt-4 text-[14.5px] leading-relaxed text-white/85">{scan.summary}</p>
          {scan.changes && <p className="selectable mt-2 text-[14.5px] leading-relaxed text-[#5eead4]">{scan.changes}</p>}

          {scan.areas?.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {scan.areas.map((a) => (
                <div key={a.area} className="flex gap-3 rounded-xl bg-fin-input px-3 py-2 text-[13.5px]">
                  <span className="w-[84px] shrink-0 font-semibold text-white/80">{a.area}</span>
                  <span className="text-fin-muted">{a.note}</span>
                </div>
              ))}
            </div>
          )}
          {scan.tips?.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Tips</div>
              <ul className="space-y-1 text-[14px] text-white/80">
                {scan.tips.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 text-[11.5px] text-fin-faint">Read by Google Gemini · not medical advice</div>
        </>
      )}
    </FinCard>
  );
}

function usePhoto(id, angle) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (id && angle) photoUrl(id, angle).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, angle]);
  return url;
}

function Thumb({ id, angle, onOpen }) {
  const url = usePhoto(id, angle);
  return (
    <button onClick={() => url && onOpen(url)} className="overflow-hidden rounded-2xl bg-fin-input">
      {url ? <img src={url} alt={`${angle} photo`} className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4] w-full animate-pulse" />}
    </button>
  );
}

function Photos({ scan }) {
  const [big, setBig] = useState(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {ANGLES.filter((a) => scan.angles?.includes(a.id)).map((a) => (
          <Thumb key={a.id} id={scan._id} angle={a.id} onOpen={setBig} />
        ))}
      </div>
      {big && (
        <button className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4" onClick={() => setBig(null)} aria-label="Close photo">
          <img src={big} alt="" className="max-h-full max-w-full rounded-2xl" />
        </button>
      )}
    </>
  );
}

// ---------- trends ----------
function Progress({ scans }) {
  const [metric, setMetric] = useState("overall");
  const done = useMemo(() => scans.filter((s) => s.status === "done").slice().reverse(), [scans]);
  if (done.length < 2) {
    return (
      <FinCard title="Progress" className="lg:shrink-0">
        <EmptyState icon="trend">Your trend appears after your second check.</EmptyState>
      </FinCard>
    );
  }
  const pts = done.map((s) => ({ x: fmtDay(s.date), y: metric === "overall" ? s.overall : s.scores?.[metric] ?? null }));
  const m = METRICS.find((x) => x.id === metric);
  const first = pts[0].y;
  const last = pts[pts.length - 1].y;
  const better = metric === "overall" ? last > first : last < first;
  return (
    <FinCard title="Progress" className="lg:shrink-0" action={<span className="text-[12.5px] text-fin-muted">{done.length} checks</span>}>
      <div className="fin-scrollbar-none -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
        {[{ id: "overall", label: "Skin score" }, ...METRICS].map((x) => (
          <button
            key={x.id}
            onClick={() => setMetric(x.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold transition ${metric === x.id ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-input text-white/70"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <LineChart points={pts} height={140} format={(v) => (metric === "overall" ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}/10`)} />
      <div className="mt-2 text-[13px] text-fin-muted">
        {first === last ? "No change" : better ? "Getting better" : "Getting worse"} since {fmtDay(done[0].date)}
        {m ? ` · lower ${m.label.toLowerCase()} is better` : " · higher is better"}
      </div>
    </FinCard>
  );
}

// ---------- before / after ----------
function Compare({ scans }) {
  const withPhotos = scans.filter((s) => s.angles?.length);
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [angle, setAngle] = useState("front");
  const [pos, setPos] = useState(50);
  const box = useRef(null);
  if (withPhotos.length < 2) {
    return (
      <FinCard title="Before / after" className="lg:flex-1">
        <EmptyState icon="copy">After two checks, slide between them to see the change.</EmptyState>
      </FinCard>
    );
  }
  const before = withPhotos.find((s) => s._id === a) || withPhotos[withPhotos.length - 1];
  const after = withPhotos.find((s) => s._id === b) || withPhotos[0];
  const angles = ANGLES.filter((x) => before.angles.includes(x.id) && after.angles.includes(x.id));
  const ang = angles.some((x) => x.id === angle) ? angle : angles[0]?.id;

  const drag = (e) => {
    const r = box.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setPos(Math.max(0, Math.min(100, (x / r.width) * 100)));
  };
  const pick = (value, set) => (
    <select value={value} onChange={(e) => set(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-fin-input px-3 py-2 text-[13.5px] text-white outline-none">
      {withPhotos.map((s) => (
        <option key={s._id} value={s._id}>
          {fmtDay(s.date, { day: "numeric", month: "short", year: "2-digit" })}
          {s.status === "done" ? ` · ${s.overall}` : ""}
        </option>
      ))}
    </select>
  );

  return (
    <FinCard title="Before / after" className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="mb-3 flex items-center gap-2">
        {pick(before._id, setA)}
        <Icon name="right" size={16} className="shrink-0 text-fin-faint" />
        {pick(after._id, setB)}
      </div>
      {angles.length > 1 && (
        <Segmented className="mb-3 [&_button]:!py-1.5 [&_button]:!text-[13px]" value={ang} onChange={setAngle} options={angles.map((x) => ({ value: x.id, label: x.label }))} />
      )}
      {ang ? (
        <div
          ref={box}
          data-no-swipe
          className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-2xl bg-fin-input sm:mx-auto sm:max-w-[380px] lg:aspect-auto lg:min-h-0 lg:max-w-none lg:flex-1"
          onMouseDown={(e) => {
            drag(e);
            const mv = (ev) => drag(ev);
            const up = () => (window.removeEventListener("mousemove", mv), window.removeEventListener("mouseup", up));
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
          }}
          onTouchStart={drag}
          onTouchMove={drag}
        >
          <SlideImg id={after._id} angle={ang} />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <SlideImg id={before._id} angle={ang} />
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
            <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0b0b0d] shadow-lg">
              <Icon name="left" size={14} stroke={2.5} />
            </span>
          </div>
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold">{fmtDay(before.date)}</span>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold">{fmtDay(after.date)}</span>
        </div>
      ) : (
        <div className="text-[14px] text-fin-muted">These two checks don't share a photo angle.</div>
      )}
    </FinCard>
  );
}

function SlideImg({ id, angle }) {
  const url = usePhoto(id, angle);
  return url ? <img src={url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 animate-pulse" />;
}

// ---------- list ----------
function PastChecks({ scans, selected, onOpen }) {
  return (
    <FinCard title="All checks" className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="fin-scroll max-h-[320px] space-y-1 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
        {scans.map((s) => (
          <button
            key={s._id}
            onClick={() => onOpen(s._id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${s._id === selected ? "bg-fin-accent/10" : "hover:bg-white/[0.04]"}`}
          >
            <span className="tabular w-[88px] shrink-0 text-[13.5px] font-semibold">{fmtDay(s.date, { day: "numeric", month: "short", year: "2-digit" })}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-fin-muted">{s.status === "done" ? s.headline : s.status === "failed" ? "Couldn't be read — tap to retry" : "Being read…"}</span>
            {s.status === "done" && (
              <span className="tabular shrink-0 text-[14px] font-bold" style={{ color: overallColor(s.overall) }}>
                {s.overall}
              </span>
            )}
          </button>
        ))}
      </div>
    </FinCard>
  );
}
