// Full-screen guided capture for the AI skin check: front, left and right
// photos with a face outline, a self-timer, quick light / blur checks, then
// the photos are sent for analysis.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../finances/fin-ui.jsx";
import { haptic } from "../../../lib/inApp.js";
import { ANGLES, processFile, processPhoto } from "./lib.js";

export default function ScanCapture({ date, onClose, onSubmit }) {
  const [step, setStep] = useState(0); // index into ANGLES, or 3 = all done
  const [shots, setShots] = useState({}); // angle -> processed photo
  const [review, setReview] = useState(null); // photo waiting for "Use" / "Retake"
  const [camError, setCamError] = useState("");
  const [timer, setTimer] = useState(true);
  const [count, setCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const video = useRef(null);
  const stream = useRef(null);
  const fileInput = useRef(null);
  const angle = ANGLES[Math.min(step, 2)];
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Lock the page behind, and let the phone's back button close this screen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.history.pushState({ lifeosScan: 1 }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  const close = () => (window.history.state?.lifeosScan ? window.history.back() : onClose());

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const needCamera = step < 3 && !review && !sending;
  useEffect(() => {
    if (!needCamera || camError) return;
    let alive = true;
    (async () => {
      try {
        if (!stream.current) {
          stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        }
        if (alive && video.current) {
          video.current.srcObject = stream.current;
          await video.current.play().catch(() => {});
        }
      } catch {
        if (alive) setCamError("Camera not available — use the button below to take or pick a photo instead.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [needCamera, camError, step]);
  useEffect(() => () => stopCamera(), []);

  const snap = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    haptic("light");
    // Saved the right way round (the live preview is mirrored like a mirror).
    const photo = await processPhoto(v, v.videoWidth, v.videoHeight);
    setReview(photo);
  }, []);

  const shutter = () => {
    if (count) return;
    if (!timer) return snap();
    let n = 3;
    setCount(n);
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        setCount(0);
        snap();
      } else setCount(n);
    }, 1000);
  };

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setReview(await processFile(f));
    } catch (err) {
      setError(err.message);
    }
  };

  const accept = () => {
    setShots((s) => ({ ...s, [angle.id]: review }));
    setReview(null);
    setStep((i) => i + 1);
    haptic("light");
  };
  const skip = () => setStep((i) => i + 1);

  const submit = async () => {
    stopCamera();
    setSending(true);
    setError("");
    try {
      const photos = ANGLES.filter((a) => shots[a.id]).map((a) => ({ angle: a.id, data: shots[a.id].data }));
      const scan = await onSubmit(date, photos);
      haptic("heavy");
      onCloseRef.current = () => {}; // the result is handed over below; ignore the back step
      onClose(scan);
      if (window.history.state?.lifeosScan) window.history.back();
    } catch (err) {
      setError(err.message || "Couldn't send the photos. Check your connection and try again.");
      setSending(false);
    }
  };

  const done = step >= 3;
  if (done && stream.current) stopCamera();

  return createPortal(
    <div className="fixed inset-0 z-[75] flex flex-col bg-black font-fin text-white" role="dialog" aria-modal="true" aria-label="Skin check">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <button onClick={close} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <Icon name="close" size={20} />
        </button>
        <div className="flex flex-1 justify-center gap-2">
          {ANGLES.map((a, i) => (
            <span key={a.id} className={`h-1.5 w-10 rounded-full ${shots[a.id] ? "bg-[#2dd4bf]" : i === step ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>
        {!done && !review ? (
          <button onClick={() => setTimer((t) => !t)} aria-pressed={timer} className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${timer ? "bg-[#2dd4bf]/20 text-[#5eead4]" : "bg-white/10 text-white/70"}`}>
            <Icon name="clock" size={16} /> 3s
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      {sending ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-[#2dd4bf]" />
          <div className="text-[20px] font-bold">Reading your skin…</div>
          <div className="text-[14px] text-white/60">Usually 10–30 seconds. Keep this screen open.</div>
        </div>
      ) : done ? (
        <Summary shots={shots} onRetake={(i) => setStep(i)} onSubmit={submit} error={error} />
      ) : review ? (
        <Review photo={review} angle={angle} onRetake={() => setReview(null)} onUse={accept} />
      ) : (
        <>
          <div className="px-6 pb-3 text-center">
            <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#5eead4]">
              Photo {step + 1} of 3 · {angle.label}
            </div>
            <div className="mt-1 text-[17px] font-semibold">{angle.hint}</div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] flex-1 overflow-hidden">
            {camError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/70">
                <Icon name="info" size={32} />
                {camError}
              </div>
            ) : (
              <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            )}
            {!camError && <FaceGuide angle={angle.id} />}
            {count > 0 && <div className="absolute inset-0 grid place-items-center text-[96px] font-extrabold text-white drop-shadow-lg">{count}</div>}
          </div>
          <div className="px-6 pt-3 text-center text-[13px] text-white/55">Same spot and light each time · daylight from a window works best · no filters</div>
          <div className="flex items-center justify-between px-8 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            <button onClick={() => fileInput.current?.click()} className="flex w-20 flex-col items-center gap-1 text-[12px] text-white/70">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10"><Icon name="upload" size={20} /></span>
              {camError ? "Take photo" : "Gallery"}
            </button>
            {!camError ? (
              <button onClick={shutter} aria-label="Take photo" className="grid h-[76px] w-[76px] place-items-center rounded-full border-4 border-white transition active:scale-95">
                <span className="h-[60px] w-[60px] rounded-full bg-white" />
              </button>
            ) : (
              <span className="w-[76px]" />
            )}
            {step > 0 ? (
              <button onClick={skip} className="flex w-20 flex-col items-center gap-1 text-[12px] text-white/70">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10"><Icon name="right" size={20} /></span>
                Skip
              </button>
            ) : (
              <span className="w-20" />
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" capture={camError ? "user" : undefined} className="hidden" onChange={pickFile} />
        </>
      )}
    </div>,
    document.body
  );
}

// Oval outline to line the face up the same way every time.
function FaceGuide({ angle }) {
  const shift = angle === "left" ? 18 : angle === "right" ? -18 : 0;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <mask id="face-hole">
          <rect width="100" height="130" fill="white" />
          <ellipse cx={50 + shift / 4} cy="60" rx="27" ry="37" fill="black" />
        </mask>
      </defs>
      <rect width="100" height="130" fill="rgba(0,0,0,0.45)" mask="url(#face-hole)" />
      <ellipse cx={50 + shift / 4} cy="60" rx="27" ry="37" fill="none" stroke="#5eead4" strokeWidth="0.7" strokeDasharray="2 1.5" />
      {angle !== "front" && (
        <path d={angle === "left" ? "M30 108 h40 m-6 -4 l6 4 l-6 4" : "M70 108 h-40 m6 -4 l-6 4 l6 4"} stroke="#5eead4" strokeWidth="1" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Review({ photo, angle, onRetake, onUse }) {
  return (
    <>
      <div className="relative mx-auto w-full max-w-[520px] flex-1 overflow-hidden">
        <img src={photo.url} alt={`${angle.label} photo`} className="h-full w-full object-contain" />
      </div>
      <div className="px-6 pt-3">
        {photo.issues.length ? (
          <div className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[14px] text-amber-200">
            {photo.issues.map((i) => (
              <div key={i}>⚠ {i}</div>
            ))}
            <div className="mt-1 text-amber-200/70">You can still use it, but the AI may be less accurate.</div>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-[14px] text-emerald-200">✓ Light and focus look good.</div>
        )}
      </div>
      <div className="flex gap-3 px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        <button onClick={onRetake} className="flex-1 rounded-2xl bg-white/10 py-3.5 text-[16px] font-semibold">Retake</button>
        <button onClick={onUse} className="flex-1 rounded-2xl bg-[#2dd4bf] py-3.5 text-[16px] font-bold text-[#04211d]">Use photo</button>
      </div>
    </>
  );
}

function Summary({ shots, onRetake, onSubmit, error }) {
  const have = ANGLES.filter((a) => shots[a.id]);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6">
      <div className="pt-4 text-center text-[20px] font-bold">Ready to check</div>
      <div className="mt-1 text-center text-[14px] text-white/60">Tap a photo to retake it.</div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {ANGLES.map((a, i) => (
          <button key={a.id} onClick={() => onRetake(i)} className="overflow-hidden rounded-2xl bg-white/5 text-left">
            {shots[a.id] ? (
              <img src={shots[a.id].url} alt={a.label} className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="grid aspect-[3/4] place-items-center text-[12px] text-white/40">Skipped</div>
            )}
            <div className="px-2 py-1.5 text-center text-[12px] font-semibold text-white/80">{a.label}</div>
          </button>
        ))}
      </div>
      {error && <div className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[14px] text-red-300">{error}</div>}
      <div className="mt-auto pb-[max(20px,env(safe-area-inset-bottom))] pt-6">
        <button disabled={!have.length} onClick={onSubmit} className="w-full rounded-2xl bg-[#2dd4bf] py-4 text-[17px] font-bold text-[#04211d] disabled:opacity-40">
          Check my skin
        </button>
        <div className="mt-3 text-center text-[12px] leading-relaxed text-white/45">
          Photos are stored privately behind your login and read by Google Gemini. It describes what it sees — it isn't a doctor.
        </div>
      </div>
    </div>
  );
}
