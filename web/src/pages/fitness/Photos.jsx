// Progress photos: front, side and back every couple of weeks, compared side
// by side (or with a slider). Private to your account and never sent to AI.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { useFit } from "./FitContext.jsx";
import { addDays, daysBetween, isoDate, parseISO, prettyDate, r1, todayISO, weightTrend } from "./lib";
import { forgetImage, progressImage, shrinkPhoto } from "./photo.js";
import { kicker } from "./fit-ui.jsx";
import { EmptyState, FinCard, Icon, Segmented, Sheet } from "../finances/fin-ui.jsx";

export const POSES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];
const EVERY = 14; // days between photo sessions

function usePhotos() {
  const showToast = useToast();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setList(await api.progressPhotos());
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load photos");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (date, pose, file) => {
    const { data } = await shrinkPhoto(file);
    const doc = await api.saveProgressPhoto(date, pose, data);
    setList((l) => {
      (l || []).filter((p) => p.date === date && p.pose === pose).forEach((p) => forgetImage(p._id));
      return [doc, ...(l || []).filter((p) => !(p.date === date && p.pose === pose))];
    });
    return doc;
  };
  const remove = async (photo) => {
    try {
      await api.deleteProgressPhoto(photo._id);
      forgetImage(photo._id);
      setList((l) => l.filter((p) => p._id !== photo._id));
      showToast("Photo deleted");
    } catch (err) {
      showToast(err.message || "Couldn't delete", true);
    }
  };
  return { list, error, load, save, remove };
}

// A private photo, loaded with your login.
function Photo({ id, alt, className = "", style }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    progressImage(id)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);
  if (failed) return <div className={`grid place-items-center bg-fin-input text-[12px] text-fin-faint ${className}`} style={style}>Couldn't load</div>;
  if (!url) return <div className={`animate-pulse bg-fin-input ${className}`} style={style} />;
  return <img src={url} alt={alt} draggable={false} className={`select-none object-cover ${className}`} style={style} />;
}

export function PhotosView() {
  const fit = useFit();
  const showToast = useToast();
  const photos = usePhotos();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(""); // pose being uploaded
  const [open, setOpen] = useState(null); // photo shown full size
  const input = useRef(null);
  const target = useRef(null);

  const list = photos.list || [];
  const sessions = useMemo(() => {
    const m = {};
    for (const p of list) (m[p.date] ||= { date: p.date })[p.pose] = p;
    return Object.values(m).sort((a, b) => b.date.localeCompare(a.date));
  }, [list]);
  const trend = useMemo(() => weightTrend(fit.body), [fit.body]);
  const weightOn = (iso) => {
    let w = null;
    for (const t of trend) {
      if (t.date > iso) break;
      if (daysBetween(t.date, iso) <= 7) w = t.trend;
    }
    return w != null ? r1(w) : null;
  };
  const day = sessions.find((s) => s.date === date) || {};
  const last = sessions[0];
  const nextDue = last ? isoDate(addDays(parseISO(last.date), EVERY)) : null;
  const dueIn = nextDue ? daysBetween(today, nextDue) : null;

  const pick = (pose) => {
    target.current = pose;
    input.current?.click();
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const pose = target.current;
    if (!file || !pose) return;
    setBusy(pose);
    try {
      await photos.save(date, pose, file);
      showToast(`${POSES.find((p) => p.value === pose).label} photo saved`);
    } catch (err) {
      showToast(err.message || "Couldn't save the photo", true);
    } finally {
      setBusy("");
    }
  };

  const col = "fin-scroll space-y-5 lg:h-[calc(100dvh-178px)] lg:space-y-4 lg:overflow-y-auto lg:pr-1";
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,0.85fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} aria-hidden="true" tabIndex={-1} />

      <div className={col}>
        <FinCard title={<span className="flex items-center gap-2"><Icon name="camera" size={15} /> Take photos</span>}>
          <label className="block">
            <div className="mb-1 text-[12.5px] text-fin-muted">Date</div>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-full rounded-2xl bg-fin-input px-4 py-3 text-[15px] text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-fin-accent/60"
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {POSES.map((p) => {
              const ph = day[p.value];
              return (
                <button
                  key={p.value}
                  onClick={() => pick(p.value)}
                  disabled={!!busy}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-fin-input text-left ring-fin-accent/60 transition hover:ring-2 disabled:opacity-60"
                  aria-label={`${ph ? "Replace" : "Add"} ${p.label.toLowerCase()} photo`}
                >
                  {ph ? <Photo id={ph._id} alt={`${p.label} on ${prettyDate(date)}`} className="absolute inset-0 h-full w-full" /> : (
                    <span className="absolute inset-0 grid place-items-center text-fin-faint group-hover:text-white/70">
                      <Icon name={busy === p.value ? "clock" : "plus"} size={22} stroke={2.2} />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-[12.5px] font-semibold">
                    {busy === p.value ? "Saving…" : p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[12.5px] leading-relaxed text-fin-muted">
            Tap a box to take or choose a photo. Taking it again replaces that day's photo.
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-fin-input px-3 py-2.5 text-[12.5px] text-fin-muted">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
            Only you can see these. They're never shared with friends or sent to the AI.
          </div>
        </FinCard>

        <FinCard title="For photos you can compare">
          <ul className="space-y-1.5 text-[13.5px] leading-snug text-fin-muted">
            <li>• Same spot, same light — morning, before eating.</li>
            <li>• Same clothes (or less), phone at chest height, 2–3 m away.</li>
            <li>• Stand relaxed — don't suck in or flex.</li>
            <li>• Use the phone's self-timer or ask someone to take them.</li>
            <li>• Every 2 weeks is enough — the change is too slow to see day to day.</li>
          </ul>
          {last && (
            <div className={`mt-3 rounded-2xl px-3 py-2 text-[13px] font-semibold ${dueIn <= 0 ? "bg-fin-accent/15 text-fin-accent" : "bg-fin-input text-white/80"}`}>
              {dueIn <= 0 ? "New photos are due — it's been 2 weeks." : `Next photos in ${dueIn} day${dueIn === 1 ? "" : "s"} (${prettyDate(nextDue, { day: "numeric", month: "short" })}).`}
            </div>
          )}
        </FinCard>
      </div>

      <div className={col}>
        {photos.error && !photos.list ? (
          <FinCard>
            <div className="py-6 text-center">
              <div className="text-[15px] font-semibold">Couldn't load your photos</div>
              <div className="mt-1 text-[13.5px] text-fin-muted">{photos.error}</div>
              <button onClick={photos.load} className="mt-3 rounded-2xl bg-fin-tile px-4 py-2 text-[14px] font-semibold">Try again</button>
            </div>
          </FinCard>
        ) : !photos.list ? (
          <div className="h-[420px] animate-pulse rounded-[24px] bg-fin-card" />
        ) : sessions.length ? (
          <>
            <Compare sessions={sessions} weightOn={weightOn} />
            <FinCard title="All photos">
              <div className="space-y-4">
                {sessions.map((s) => (
                  <div key={s.date}>
                    <div className="mb-1.5 flex items-baseline gap-2 text-[13.5px]">
                      <span className="font-semibold">{prettyDate(s.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                      {weightOn(s.date) && <span className="tabular text-fin-muted">{weightOn(s.date)} kg</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {POSES.map((p) =>
                        s[p.value] ? (
                          <button key={p.value} onClick={() => setOpen(s[p.value])} className="relative aspect-[3/4] overflow-hidden rounded-xl ring-fin-accent/60 hover:ring-2" aria-label={`Open ${p.label.toLowerCase()} photo from ${prettyDate(s.date)}`}>
                            <Photo id={s[p.value]._id} alt="" className="absolute inset-0 h-full w-full" />
                            <span className="absolute bottom-1 left-1.5 text-[11px] font-semibold drop-shadow">{p.label}</span>
                          </button>
                        ) : (
                          <div key={p.value} className="grid aspect-[3/4] place-items-center rounded-xl bg-fin-input text-[11px] text-fin-faint">{p.label}</div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </FinCard>
          </>
        ) : (
          <FinCard>
            <EmptyState icon="camera">
              Your first photos are the most important ones — in a few months they'll show changes the scale can't. Take a front, side and back photo today.
            </EmptyState>
          </FinCard>
        )}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${POSES.find((p) => p.value === open.pose)?.label} · ${prettyDate(open.date)}` : ""} wide>
        {open && (
          <div>
            <Photo id={open._id} alt="" className="mx-auto max-h-[65dvh] w-auto rounded-2xl !object-contain" />
            <button
              onClick={() => {
                photos.remove(open);
                setOpen(null);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3 text-[15px] font-semibold text-fin-danger hover:bg-red-500/20"
            >
              <Icon name="trash" size={16} /> Delete this photo
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// Before / after for one pose: side by side, or one on top of the other with a slider.
function Compare({ sessions, weightOn }) {
  const [pose, setPose] = useState("front");
  const [mode, setMode] = useState("side");
  const dates = sessions.filter((s) => s[pose]).map((s) => s.date); // newest first
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [split, setSplit] = useState(50);
  const b = dates.includes(before) ? before : dates[dates.length - 1];
  const a = dates.includes(after) ? after : dates[0];
  const bp = sessions.find((s) => s.date === b)?.[pose];
  const ap = sessions.find((s) => s.date === a)?.[pose];
  const wb = b && weightOn(b);
  const wa = a && weightOn(a);
  const gap = a && b ? daysBetween(b, a) : 0;
  const sel = "w-full truncate rounded-xl bg-fin-input px-2.5 py-2 text-[13.5px] text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-fin-accent/60";
  const label = (iso) => prettyDate(iso, { day: "numeric", month: "short", year: "2-digit" });

  return (
    <FinCard
      title="Compare"
      action={<Segmented className="w-[190px] [&_button]:!py-1 [&_button]:!text-[12.5px]" value={mode} onChange={setMode} options={[{ value: "side", label: "Side by side" }, { value: "slider", label: "Slider" }]} />}
    >
      <Segmented className="[&_button]:!py-1.5 [&_button]:!text-[13.5px]" value={pose} onChange={setPose} options={POSES} />
      {dates.length < 2 ? (
        <div className="py-8 text-center text-[14px] text-fin-muted">
          {dates.length ? `You have one ${pose} photo. Take another in two weeks to compare.` : `No ${pose} photos yet.`}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label>
              <div className={kicker}>Before</div>
              <select value={b} onChange={(e) => setBefore(e.target.value)} className={sel} aria-label="Before photo date">
                {dates.map((d) => <option key={d} value={d}>{label(d)}{weightOn(d) ? ` · ${weightOn(d)} kg` : ""}</option>)}
              </select>
            </label>
            <label>
              <div className={kicker}>After</div>
              <select value={a} onChange={(e) => setAfter(e.target.value)} className={sel} aria-label="After photo date">
                {dates.map((d) => <option key={d} value={d}>{label(d)}{weightOn(d) ? ` · ${weightOn(d)} kg` : ""}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 text-center text-[13px] text-fin-muted">
            {Math.abs(gap) >= 7 ? `${Math.round(Math.abs(gap) / 7)} week${Math.round(Math.abs(gap) / 7) === 1 ? "" : "s"} apart` : `${Math.abs(gap)} day${Math.abs(gap) === 1 ? "" : "s"} apart`}
            {wb && wa ? <b className={`tabular ml-1 ${wa - wb < 0 ? "text-emerald-300" : "text-white"}`}>· {wa - wb > 0 ? "+" : ""}{r1(wa - wb)} kg</b> : null}
          </div>
          {mode === "side" ? (
            <div className="mx-auto mt-3 grid max-w-[560px] grid-cols-2 gap-2">
              {[[bp, b, wb, "Before"], [ap, a, wa, "After"]].map(([p, d, w, k]) => (
                <div key={k} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
                  {p && <Photo id={p._id} alt={`${k}: ${label(d)}`} className="absolute inset-0 h-full w-full !object-contain" />}
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold">{label(d)}{w ? ` · ${w} kg` : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-3 max-w-[340px]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
                {bp && <Photo id={bp._id} alt={`Before: ${label(b)}`} className="absolute inset-0 h-full w-full !object-contain" />}
                {ap && (
                  <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                    <Photo id={ap._id} alt={`After: ${label(a)}`} className="absolute inset-0 h-full w-full !object-contain" />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${split}%` }} />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11.5px] font-semibold">{label(b)}</span>
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11.5px] font-semibold">{label(a)}</span>
              </div>
              <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(Number(e.target.value))} className="mt-3 w-full accent-[rgb(var(--fin-accent))]" aria-label="Slide between before and after" />
            </div>
          )}
        </>
      )}
    </FinCard>
  );
}

