import { useEffect, useRef, useState } from "react";
import { useFinance } from "./FinanceContext.jsx";
import { BUCKETS, PRESETS, clamp, formatMoney, monthLabel, splitByRatio, todayISO } from "./lib";
import { BucketBadge, FinCard, GhostButton, Icon, IconButton, MoneyField, Pill, PrimaryButton, Segmented, Sheet, TextField } from "./fin-ui.jsx";

export default function SettingsTab() {
  return (
    // Phones: stacked. Laptops: split + backup on the left, subcategories on the right;
    // very wide screens: three columns.
    <div className="grid grid-cols-1 items-start gap-5 lg:gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
      <div>
        <AdjustSplit />
      </div>
      <div className="lg:col-start-2 lg:row-span-2 xl:row-span-1">
        <Subcategories />
      </div>
      <div className="lg:col-start-1 lg:row-start-2 xl:col-start-3 xl:row-start-1">
        <DataBackup />
      </div>
    </div>
  );
}

// ---------- split editor ----------
function AdjustSplit() {
  const { ratio, saveRatio, saveAmounts, monthRecord, currentMonth } = useFinance();
  const rec = monthRecord(currentMonth);
  const [mode, setMode] = useState("ratio");
  const [draft, setDraft] = useState(ratio);
  const [amounts, setAmounts] = useState({ needs: "", wants: "", savings: "" });

  useEffect(() => setDraft(ratio), [ratio]);
  useEffect(() => {
    if (rec) setAmounts({ needs: String(rec.needs), wants: String(rec.wants), savings: String(rec.savings) });
  }, [rec?._id, rec?.needs, rec?.wants, rec?.savings]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = draft.needs + draft.wants + draft.savings;
  const balanced = total === 100;
  const changed = draft.needs !== ratio.needs || draft.wants !== ratio.wants || draft.savings !== ratio.savings;

  const amountTotal = BUCKETS.reduce((s, b) => s + (parseFloat(amounts[b.id]) || 0), 0);
  const diff = (rec?.salary || 0) - amountTotal;

  function setPct(id, raw) {
    const v = clamp(Math.round(Number(raw) || 0), 0, 100);
    setDraft((d) => ({ ...d, [id]: v }));
  }

  return (
    <FinCard title="Adjust split" delay={0}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "ratio", label: "By ratio %" },
          { value: "amount", label: "By amount ₹" },
        ]}
      />

      {mode === "ratio" ? (
        <div className="animate-fade-in">
          <div className="mt-4 text-[14px] text-fin-muted">Quick presets</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => {
              const active = draft.needs === p[0] && draft.wants === p[1] && draft.savings === p[2];
              return (
                <Pill key={p.join()} active={active} className="justify-center whitespace-nowrap !px-1 !py-1.5 !text-[13px]" onClick={() => setDraft({ needs: p[0], wants: p[1], savings: p[2] })}>
                  <span className="tabular">{p.join(" · ")}</span>
                </Pill>
              );
            })}
          </div>

          <SplitSlider value={draft} onChange={setDraft} />

          <div className="space-y-2">
            {BUCKETS.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                <span className="flex-1 text-[16px] font-semibold">{b.label}</span>
                {rec && <span className="tabular hidden text-[14px] text-fin-muted sm:inline">{formatMoney(splitByRatio(rec.salary, draft)[b.id])}</span>}
                <div className="flex w-[120px] items-center rounded-2xl bg-fin-input px-4 focus-within:ring-1 focus-within:ring-fin-accent/60">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={draft[b.id]}
                    onChange={(e) => setPct(b.id, e.target.value)}
                    className="tabular w-full bg-transparent py-2.5 text-right text-[16px] font-semibold text-white outline-none"
                    aria-label={`${b.label} percent`}
                  />
                  <span className="pl-2 text-fin-muted">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[14px] text-fin-muted">
            Total <span className={`font-bold ${balanced ? "text-white" : "text-fin-danger"}`}>{total}%</span>
            {balanced ? " · balanced ✓" : ` · ${total > 100 ? "remove" : "add"} ${Math.abs(100 - total)}% to balance`}
          </div>
          {rec && <div className="text-[13px] text-fin-faint">Applying also re-splits {monthLabel(currentMonth)}'s salary.</div>}
          <div className="mt-3 flex gap-3">
            <GhostButton className="flex-1" disabled={!changed} onClick={() => setDraft(ratio)}>Reset</GhostButton>
            <PrimaryButton className="flex-1" disabled={!balanced || !changed} onClick={() => saveRatio(draft, currentMonth)}>Apply ratio</PrimaryButton>
          </div>
        </div>
      ) : rec ? (
        <div className="animate-fade-in">
          <div className="mt-5 text-[15px] text-fin-muted">
            Set exact amounts for {monthLabel(currentMonth)} · salary {formatMoney(rec.salary)}
          </div>
          <div className="mt-3 space-y-3">
            {BUCKETS.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                <span className="flex-1 text-[16px] font-semibold">{b.label}</span>
                <MoneyField className="w-[160px]" value={amounts[b.id]} onChange={(v) => setAmounts((a) => ({ ...a, [b.id]: v }))} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-fin-muted">
            <span>
              Total <span className={`tabular font-bold ${diff === 0 ? "text-white" : "text-fin-danger"}`}>{formatMoney(amountTotal)}</span>
              {diff === 0 ? " · matches salary ✓" : diff > 0 ? ` · ${formatMoney(diff)} unassigned` : ` · ${formatMoney(-diff)} over salary`}
            </span>
            {diff !== 0 && (parseFloat(amounts.savings) || 0) + diff >= 0 && (
              <button
                onClick={() => setAmounts((a) => ({ ...a, savings: String((parseFloat(a.savings) || 0) + diff) }))}
                className="rounded-full bg-fin-tile px-3 py-1 text-[13px] font-semibold text-fin-savings hover:brightness-125"
              >
                Balance with Savings
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <GhostButton className="flex-1" onClick={() => setAmounts(Object.fromEntries(Object.entries(splitByRatio(rec.salary, ratio)).map(([k, v]) => [k, String(v)])))}>
              Reset to my ratio
            </GhostButton>
            <PrimaryButton
              className="flex-1"
              disabled={diff !== 0}
              onClick={() => saveAmounts(currentMonth, Object.fromEntries(BUCKETS.map((b) => [b.id, Math.round(parseFloat(amounts[b.id]) || 0)])))}
            >
              Save amounts
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-center text-[15px] text-fin-muted">Set this month's salary on Home first, then you can fine-tune exact amounts here.</div>
      )}
    </FinCard>
  );
}

// Draggable three-part bar: two handles split 100% into needs / wants / savings.
function SplitSlider({ value, onChange }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const total = value.needs + value.wants + value.savings;
  const p1 = total === 100 ? value.needs : (value.needs / (total || 1)) * 100;
  const p2 = total === 100 ? value.needs + value.wants : ((value.needs + value.wants) / (total || 1)) * 100;

  function setFrom(handle, pct) {
    let a = Math.round(p1);
    let b = Math.round(p2);
    if (handle === 0) a = clamp(Math.round(pct), 0, b);
    else b = clamp(Math.round(pct), a, 100);
    onChange({ needs: a, wants: b - a, savings: 100 - b });
  }
  function pctAt(clientX) {
    const r = ref.current.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }
  function onDown(handle) {
    return (e) => {
      e.preventDefault();
      drag.current = handle;
      e.currentTarget.setPointerCapture(e.pointerId);
    };
  }
  function onMove(e) {
    if (drag.current === null) return;
    setFrom(drag.current, pctAt(e.clientX));
  }
  function onKey(handle) {
    return (e) => {
      const cur = handle === 0 ? p1 : p2;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setFrom(handle, cur - (e.shiftKey ? 5 : 1)); }
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setFrom(handle, cur + (e.shiftKey ? 5 : 1)); }
    };
  }

  const segs = [
    { b: BUCKETS[0], from: 0, to: p1 },
    { b: BUCKETS[1], from: p1, to: p2 },
    { b: BUCKETS[2], from: p2, to: 100 },
  ];

  return (
    <div className="my-4 select-none px-3">
      <div ref={ref} className="relative h-11" title="Drag the handles to rebalance" onPointerMove={onMove} onPointerUp={() => (drag.current = null)}>
        <div className="absolute inset-x-0 top-1/2 flex h-4 -translate-y-1/2 gap-[2px] overflow-hidden rounded-full">
          {segs.map((s) => (
            <div key={s.b.id} className="h-full transition-[width] duration-75" style={{ width: `${s.to - s.from}%`, background: s.b.color }} />
          ))}
        </div>
        {[p1, p2].map((p, i) => (
          <div
            key={i}
            role="slider"
            tabIndex={0}
            aria-label={i === 0 ? "Needs / Wants boundary" : "Wants / Savings boundary"}
            aria-valuenow={Math.round(p)}
            aria-valuemin={0}
            aria-valuemax={100}
            onPointerDown={onDown(i)}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={onKey(i)}
            className="absolute top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center rounded-full bg-white shadow-lg ring-4 ring-fin-card transition-transform hover:scale-110 focus:outline-none focus-visible:ring-fin-accent active:scale-110 active:cursor-grabbing"
            style={{ left: `${p}%` }}
          >
            <span className="h-3 w-0.5 rounded bg-black/30" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex text-[12px] font-semibold">
        {segs.map((s) => (
          <div key={s.b.id} className="truncate text-center transition-[width] duration-75" style={{ width: `${s.to - s.from}%`, color: s.b.color }}>
            {s.to - s.from >= 9 ? `${Math.round(s.to - s.from)}%` : ""}
          </div>
        ))}
      </div>
      
    </div>
  );
}

// ---------- subcategories ----------
// One bucket at a time (Needs / Wants / Savings switch) so the card stays short.
function Subcategories() {
  const { categories, addCategory } = useFinance();
  const [bucket, setBucket] = useState("needs");
  const [draft, setDraft] = useState("");
  const b = BUCKETS.find((x) => x.id === bucket);
  const list = categories.filter((c) => c.bucket === bucket);

  async function add() {
    const doc = await addCategory(draft, bucket);
    if (doc) setDraft("");
  }

  return (
    <FinCard title="Subcategories" delay={60}>
      <p className="-mt-2 mb-3 text-[13.5px] text-fin-muted">Tap a name to rename it. Limits are optional monthly caps, shown in Insights.</p>
      <Segmented
        value={bucket}
        onChange={(v) => {
          setBucket(v);
          setDraft("");
        }}
        options={BUCKETS.map((x) => ({
          value: x.id,
          label: `${x.label} · ${categories.filter((c) => c.bucket === x.id).length}`,
          dot: x.color,
        }))}
      />
      <div key={bucket} className="mt-3 animate-fade-in">
        {list.length ? (
          <div className="fin-scroll divide-y divide-fin-line lg:max-h-[calc(100dvh-400px)] lg:min-h-[160px] lg:overflow-y-auto lg:pr-1">
            {list.map((c) => (
              <SubcategoryRow key={c._id} cat={c} />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-[14px] text-fin-muted">No {b.label.toLowerCase()} subcategories yet.</div>
        )}
        <div className="mt-2 flex gap-2">
          <TextField
            className="!py-3"
            placeholder={`Add to ${b.label}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <GhostButton className="!py-3" disabled={!draft.trim()} onClick={add}>Add</GhostButton>
        </div>
      </div>
    </FinCard>
  );
}

function SubcategoryRow({ cat }) {
  const { updateCategory, removeCategory } = useFinance();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [limit, setLimit] = useState(cat.limit ? String(cat.limit) : "");

  useEffect(() => setName(cat.name), [cat.name]);
  useEffect(() => setLimit(cat.limit ? String(cat.limit) : ""), [cat.limit]);

  async function commitName() {
    setEditing(false);
    const clean = name.trim();
    if (!clean || clean === cat.name) return setName(cat.name);
    await updateCategory(cat, { name: clean });
  }
  async function commitLimit() {
    const n = parseFloat(limit);
    const next = n > 0 ? Math.round(n) : null;
    if (next === (cat.limit || null)) return;
    await updateCategory(cat, { limit: next });
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") { setName(cat.name); setEditing(false); }
          }}
          className="min-w-0 flex-1 rounded-xl bg-fin-input px-3 py-2 text-[15px] font-semibold text-white outline-none ring-1 ring-fin-accent/60"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="min-w-0 flex-1 truncate rounded-xl px-1 py-2 text-left text-[15px] font-semibold hover:text-fin-accent">
          {cat.name}
        </button>
      )}
      <div className="flex w-[130px] items-center rounded-xl bg-fin-input px-3 focus-within:ring-1 focus-within:ring-fin-accent/60">
        <span className="text-[13px] text-fin-faint">₹</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={limit}
          placeholder="No limit"
          onChange={(e) => setLimit(e.target.value)}
          onBlur={commitLimit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="tabular w-full bg-transparent px-1.5 py-2 text-[14px] text-white placeholder:text-fin-faint outline-none"
          aria-label={`${cat.name} monthly limit`}
        />
      </div>
      <IconButton icon="trash" label={`Delete ${cat.name}`} onClick={() => removeCategory(cat)} className="hover:!text-fin-danger" />
    </div>
  );
}

// ---------- backup ----------
function DataBackup() {
  const { backup, restore, resetAll } = useFinance();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // parsed backup waiting for confirmation
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function download() {
    const data = await backup();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-finances-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    const data = await backup();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert("Your browser blocked clipboard access. Use Download backup instead.");
    }
  }

  function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed?.data) throw new Error();
        setPending(parsed);
      } catch {
        alert("That file isn't a LifeOS finance backup.");
      }
    };
    reader.readAsText(f);
  }

  const counts = pending
    ? [
        ["expenses", pending.data.transactions?.length || 0],
        ["subcategories", pending.data.categories?.length || 0],
        ["months", pending.data.months?.length || 0],
        ["holdings", pending.data.investments?.length || 0],
        ["goals", pending.data.savingsGoals?.length || 0],
      ]
    : [];

  const actions = [
    { icon: "download", label: "Download backup", onClick: download },
    { icon: copied ? "check" : "copy", label: copied ? "Copied!" : "Copy backup", onClick: copy },
    { icon: "upload", label: "Restore from file", onClick: () => fileRef.current?.click() },
    { icon: "reset", label: "Reset everything", onClick: () => setResetOpen(true), danger: true },
  ];

  return (
    <FinCard title="Data & backup" delay={120}>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex flex-col items-start gap-3 rounded-[20px] bg-fin-tile p-4 text-left text-[15px] font-semibold transition hover:bg-[#2e2e36] active:scale-[0.98] ${a.danger ? "text-fin-danger" : ""}`}
          >
            <Icon name={a.icon} size={22} />
            {a.label}
          </button>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
      <p className="mt-4 text-[14px] leading-relaxed text-fin-muted">
        Your finance data is stored in your LifeOS database. A backup is a single file with everything in this section — keep one somewhere safe before big changes.
        <b className="text-white/80"> Copy backup</b> puts it on the clipboard so you can paste it into Notes, email or WhatsApp.
      </p>

      <Sheet
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Restore backup?"
        footer={
          <>
            <GhostButton className="flex-1" onClick={() => setPending(null)}>Cancel</GhostButton>
            <PrimaryButton
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await restore(pending.data);
                setBusy(false);
                setPending(null);
              }}
            >
              {busy ? "Restoring…" : "Replace my data"}
            </PrimaryButton>
          </>
        }
      >
        <p className="text-[15px] leading-relaxed text-fin-muted">
          This replaces everything currently in Finances with the backup
          {pending?.exportedAt ? ` from ${new Date(pending.exportedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {counts.map(([k, n]) => (
            <div key={k} className="rounded-2xl bg-fin-input px-4 py-3">
              <div className="tabular text-[20px] font-bold">{n}</div>
              <div className="text-[13px] text-fin-muted">{k}</div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={resetOpen}
        onClose={() => { setResetOpen(false); setConfirmText(""); }}
        title="Reset everything?"
        footer={
          <>
            <GhostButton className="flex-1" onClick={() => { setResetOpen(false); setConfirmText(""); }}>Cancel</GhostButton>
            <button
              disabled={confirmText !== "RESET" || busy}
              onClick={async () => {
                setBusy(true);
                await resetAll();
                setBusy(false);
                setResetOpen(false);
                setConfirmText("");
              }}
              className="flex-1 rounded-2xl bg-red-600 px-5 py-3 text-[16px] font-bold text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? "Resetting…" : "Delete all"}
            </button>
          </>
        }
      >
        <p className="text-[15px] leading-relaxed text-fin-muted">
          This permanently deletes every expense, salary, subcategory, holding and goal in Finances. It can't be undone — download a backup first if you might want it back.
        </p>
        <div className="mt-4 text-[14px] text-fin-muted">Type <b className="text-white">RESET</b> to confirm</div>
        <TextField className="mt-2" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
      </Sheet>
    </FinCard>
  );
}
