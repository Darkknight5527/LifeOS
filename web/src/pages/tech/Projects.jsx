// Projects: the board, each project's page, the build log, the idea inbox and
// activity (GitHub commits + the hours you've logged here).
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../components/Toast.jsx";
import { useTech } from "./TechContext.jsx";
import { DEFAULT_STAGES, STATUS, addDays, hours, isoDate, mondayOf, newId, parseISO, prettyDate, showcaseScore } from "./lib";
import { COL, HeatGrid, SkillChip, SkillPicker, input, kicker, select, useNav } from "./ui.jsx";
import { Bars } from "../fitness/fit-ui.jsx";
import { EmptyState, FinCard, GhostButton, Icon, PrimaryButton, Sheet, TextField } from "../finances/fin-ui.jsx";
import { Chips } from "../mental/mind/MindViews.jsx";

const progressOf = (p) => (p.stages?.length ? p.stages.filter((s) => s.done).length / p.stages.length : 0);
const nextStage = (p) => p.stages?.find((s) => !s.done)?.title;

// ============================== Board ==============================
function ProjectCard({ p }) {
  const t = useTech();
  const nav = useNav();
  const pct = Math.round(progressOf(p) * 100);
  const sc = showcaseScore(p);
  const toast = useToast();
  const running = t.timer?.kind === "project" && t.timer.projectId === p._id;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => nav.open("project", p._id)}
      onKeyDown={(e) => e.key === "Enter" && nav.open("project", p._id)}
      className="cursor-pointer rounded-2xl bg-fin-input p-3.5 text-left transition hover:bg-fin-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-fin-accent"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-bold">{p.name}</div>
          {p.summary && <div className="line-clamp-2 text-[12.5px] text-fin-muted">{p.summary}</div>}
        </div>
        {(t.projectMin[p._id] || 0) > 0 && <span className="tabular shrink-0 text-[12px] text-fin-faint">{hours(t.projectMin[p._id])}</span>}
      </div>
      {p.stages?.length > 0 && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[11.5px] text-fin-muted">
            <span className="truncate">{nextStage(p) ? `Next: ${nextStage(p)}` : "All stages done"}</span>
            <span className="tabular shrink-0">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-black/30">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: STATUS[p.status]?.color }} />
          </div>
        </div>
      )}
      {p.skills?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {p.skills.slice(0, 4).map((id) => <SkillChip key={id} id={id} small />)}
          {p.skills.length > 4 && <span className="px-1 text-[11.5px] text-fin-faint">+{p.skills.length - 4}</span>}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[11.5px] text-fin-faint" title="Showcase check: README, demo, resume bullet, pinned">Showcase {sc}/4</span>
        {p.status === "building" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (running) t.stopTimer();
              else if (!t.startTimer({ kind: "project", projectId: p._id, skillId: "" })) toast("Stop the running timer first");
            }}
            className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold ${running ? "bg-fin-accent text-[#052e16]" : "bg-fin-tile text-white/80 hover:text-white"}`}
          >
            <Icon name={running ? "pause" : "play"} size={12} stroke={2.4} /> {running ? "Stop" : "Work"}
          </button>
        )}
      </div>
    </div>
  );
}
export function ProjectsBoard() {
  const t = useTech();
  const [adding, setAdding] = useState(false);
  const real = t.projects.filter((p) => p.status !== "idea");
  const week = mondayOf(t.today);
  const weekMin = t.sessions.filter((s) => s.kind === "project" && s.date >= week).reduce((a, s) => a + (s.minutes || 0), 0);
  const cols = ["building", "planned", "shipped", "paused"];
  const sorted = (st) => real.filter((p) => p.status === st).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (!real.length) {
    return (
      <div className="mx-auto max-w-[560px]">
        <FinCard>
          <EmptyState icon="code">
            Add the projects you're building or planning — each one tracks its stages, the skills it needs, your hours and whether it's ready to show a recruiter.
          </EmptyState>
          <PrimaryButton className="w-full" onClick={() => setAdding(true)}>Add your first project</PrimaryButton>
          {t.projects.length > 0 && <div className="mt-3 text-center text-[13px] text-fin-muted">You have {t.projects.length} idea{t.projects.length === 1 ? "" : "s"} in the inbox — start one from Ideas.</div>}
        </FinCard>
        <NewProjectSheet open={adding} onClose={() => setAdding(false)} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ["Building", sorted("building").length],
          ["Shipped", sorted("shipped").length],
          ["This week", hours(weekMin)],
        ].map(([k, v]) => (
          <span key={k} className="rounded-full bg-fin-card px-3.5 py-1.5 text-[13px] text-fin-muted">
            {k} <b className="tabular text-white">{v}</b>
          </span>
        ))}
        <PrimaryButton className="ml-auto !px-4 !py-2 !text-[14px]" onClick={() => setAdding(true)}>+ New project</PrimaryButton>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {cols.map((st) => {
          const list = sorted(st);
          if (!list.length && (st === "paused" || st === "shipped")) return null;
          return (
            <section key={st} className="flex flex-col rounded-[24px] bg-fin-card p-4 lg:max-h-[calc(100dvh-240px)]">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-fin-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS[st].color }} /> {STATUS[st].label}
                <span className="tabular normal-case tracking-normal text-fin-faint">{list.length}</span>
              </h2>
              <div className="fin-scroll space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                {list.length ? list.map((p) => <ProjectCard key={p._id} p={p} />) : <div className="py-4 text-center text-[13px] text-fin-faint">Nothing here yet.</div>}
              </div>
            </section>
          );
        })}
      </div>
      <NewProjectSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

export function NewProjectSheet({ open, onClose, status = "planned" }) {
  const t = useTech();
  const nav = useNav();
  const [f, setF] = useState({ name: "", summary: "", status, stages: true, skills: [] });
  useEffect(() => {
    if (open) setF({ name: "", summary: "", status, stages: true, skills: [] });
  }, [open, status]);
  const save = async () => {
    const doc = await t.create("projects", {
      name: f.name.trim(),
      summary: f.summary.trim(),
      status: f.status,
      skills: f.skills,
      stages: f.stages ? DEFAULT_STAGES.map((title) => ({ id: newId(), title, done: false })) : [],
    }, "Project added");
    onClose();
    if (doc && !String(doc._id).startsWith("tmp-")) nav.open("project", doc._id);
  };
  return (
    <Sheet open={open} onClose={onClose} title="New project" footer={<PrimaryButton className="flex-1" disabled={!f.name.trim()} onClick={save}>Add project</PrimaryButton>}>
      <div className="space-y-4">
        <TextField autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name, e.g. ATE log parser" maxLength={120} />
        <textarea rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="What is it, in one or two lines?" className={input} maxLength={1000} />
        <div>
          <div className={kicker}>Status</div>
          <Chips value={f.status} onChange={(v) => setF({ ...f, status: v })} options={["planned", "building", "shipped", "paused"].map((s) => ({ value: s, label: STATUS[s].label }))} label="Status" />
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-fin-input px-3.5 py-3">
          <input type="checkbox" checked={f.stages} onChange={(e) => setF({ ...f, stages: e.target.checked })} className="mt-1 h-4 w-4 accent-[rgb(var(--fin-accent))]" />
          <span>
            <span className="block text-[14.5px] font-semibold">Use my usual stages</span>
            <span className="block text-[12.5px] text-fin-muted">{DEFAULT_STAGES.join(" → ")}</span>
          </span>
        </label>
        <div>
          <div className={kicker}>Skills it needs</div>
          <SkillPicker value={f.skills} onChange={(skills) => setF({ ...f, skills })} />
        </div>
      </div>
    </Sheet>
  );
}

// ============================== Build log ==============================
export function BuildLogView() {
  const t = useTech();
  const toastFn = useToast();
  const nav = useNav();
  const projects = t.projects.filter((p) => p.status !== "idea");
  const [f, setF] = useState({ projectId: nav.focus.logProject || projects.find((p) => p.status === "building")?._id || "", text: "", shipped: false, date: t.today });
  const [filter, setFilter] = useState(nav.focus.logProject || "");
  const list = t.logs.filter((l) => !filter || l.projectId === filter).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const groups = useMemo(() => {
    const m = [];
    for (const l of list) {
      const last = m[m.length - 1];
      if (last && last.date === l.date) last.items.push(l);
      else m.push({ date: l.date, items: [l] });
    }
    return m;
  }, [list]);
  const add = async () => {
    if (!f.text.trim()) return;
    await t.create("logs", { date: f.date || t.today, projectId: f.projectId, text: f.text.trim(), shipped: f.shipped }, f.shipped ? "Shipped — logged" : "Logged");
    setF((x) => ({ ...x, text: "", shipped: false }));
  };
  const copyShipped = async () => {
    const lines = list.filter((l) => l.shipped).map((l) => `• ${l.text}${l.projectId && t.project[l.projectId] ? ` (${t.project[l.projectId].name})` : ""}`);
    if (!lines.length) return toastFn("Nothing marked as shipped yet");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toastFn(`Copied ${lines.length} shipped item${lines.length === 1 ? "" : "s"}`);
    } catch {
      toastFn("Couldn't copy", true);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,1fr)_2fr] lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard title="Log what you did">
          <div className="space-y-3">
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} className={select} aria-label="Project">
              <option value="">No project / general</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <textarea rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="e.g. Got the STDF parser reading PTR records" className={input} maxLength={1000} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" checked={f.shipped} onChange={(e) => setF({ ...f, shipped: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--fin-accent))]" /> Shipped / finished
              </label>
              <input type="date" value={f.date} max={t.today} onChange={(e) => e.target.value && setF({ ...f, date: e.target.value })} className="ml-auto rounded-xl bg-fin-input px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Date" />
            </div>
            <PrimaryButton className="w-full" disabled={!f.text.trim()} onClick={add}>Add to log</PrimaryButton>
          </div>
        </FinCard>
        <FinCard title="For your resume">
          <div className="text-[13.5px] leading-relaxed text-fin-muted">Things you mark as shipped are your proof of work. Copy them as bullet points when you update your resume or LinkedIn.</div>
          <GhostButton className="mt-3 w-full !py-2.5 !text-[14px]" onClick={copyShipped}>Copy shipped items</GhostButton>
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard
          title="Build log"
          action={
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-[200px] rounded-xl bg-fin-input px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" aria-label="Filter by project">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          }
        >
          {groups.length ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.date}>
                  <div className="mb-1.5 text-[12.5px] font-semibold text-fin-muted">{prettyDate(g.date, { weekday: "long", day: "numeric", month: "short" })}</div>
                  <div className="space-y-1.5">
                    {g.items.map((l) => (
                      <div key={l._id} className="group flex items-start gap-2 rounded-2xl bg-fin-input px-3 py-2">
                        <div className="min-w-0 flex-1 text-[14px]">
                          {l.shipped && <span className="mr-1.5 rounded bg-[#f2c14e]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#f2c14e]">shipped</span>}
                          {l.text}
                          {l.projectId && t.project[l.projectId] && (
                            <button onClick={() => nav.open("project", l.projectId)} className="ml-1.5 text-[12px] font-semibold text-fin-accent hover:underline">{t.project[l.projectId].name}</button>
                          )}
                        </div>
                        <button onClick={() => t.remove("logs", l, "Entry deleted")} className="shrink-0 text-fin-faint opacity-60 hover:text-fin-danger group-hover:opacity-100" aria-label="Delete entry">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="list">Short notes on what you did each day add up — and become resume bullets later.</EmptyState>
          )}
        </FinCard>
      </div>
    </div>
  );
}

// ============================== Ideas ==============================
export function IdeasView() {
  const t = useTech();
  const nav = useNav();
  const [text, setText] = useState("");
  const ideas = t.projects.filter((p) => p.status === "idea").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const add = async () => {
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const name of lines) await t.create("projects", { name: name.slice(0, 120), status: "idea" });
    setText("");
  };
  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <FinCard title="Capture an idea">
        <div className="flex gap-2">
          <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), add())} placeholder="e.g. Shmoo plot viewer in the browser" className={input} maxLength={2000} aria-label="New idea" />
          <PrimaryButton className="shrink-0 !px-5" disabled={!text.trim()} onClick={add}>Save</PrimaryButton>
        </div>
        <div className="mt-2 text-[12.5px] text-fin-faint">Just the name is enough. Turn it into a project when you're ready to start.</div>
      </FinCard>
      <FinCard title={`Idea inbox · ${ideas.length}`}>
        {ideas.length ? (
          <div className="space-y-1.5">
            {ideas.map((p) => (
              <div key={p._id} className="flex items-center gap-2 rounded-2xl bg-fin-input px-3.5 py-2.5">
                <button onClick={() => nav.open("project", p._id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[14.5px] font-semibold">{p.name}</div>
                  <div className="text-[12px] text-fin-faint">{prettyDate(isoDate(new Date(p.createdAt || Date.now())), { day: "numeric", month: "short" })}{p.summary ? ` · ${p.summary}` : ""}</div>
                </button>
                <button
                  onClick={() => t.patch("projects", p, { status: "planned", stages: p.stages?.length ? p.stages : DEFAULT_STAGES.map((title) => ({ id: newId(), title, done: false })) }, "Moved to your board as Planned")}
                  className="shrink-0 rounded-xl bg-fin-accent/15 px-3 py-1.5 text-[13px] font-semibold text-fin-accent hover:bg-fin-accent/25"
                >
                  Start project
                </button>
                <button onClick={() => t.remove("projects", p, "Idea deleted")} className="shrink-0 px-1 text-fin-faint hover:text-fin-danger" aria-label={`Delete ${p.name}`}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="sparkle">No ideas waiting. Write them down the moment they come — most good projects start as one line.</EmptyState>
        )}
      </FinCard>
    </div>
  );
}

// ============================== Activity ==============================
// `saved` is false while the username is still being saved, so we don't ask
// the server before it knows it.
function useGithub(user, saved) {
  const [st, setSt] = useState({ loading: false, data: null, error: "" });
  const load = async (fresh = false) => {
    if (!user) return setSt({ loading: false, data: null, error: "" });
    if (!saved) return setSt((s) => ({ ...s, loading: true }));
    setSt((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await api.techGithub(fresh);
      setSt({ loading: false, data, error: data.error || "" });
    } catch (err) {
      setSt({ loading: false, data: null, error: err.message || "Couldn't reach GitHub" });
    }
  };
  useEffect(() => {
    load();
  }, [user, saved]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...st, refresh: () => load(true) };
}

export function ActivityView() {
  const t = useTech();
  const nav = useNav();
  const user = t.settings?.githubUser || "";
  const gh = useGithub(user, Boolean(t.settings) && !String(t.settings._id).startsWith("tmp-") && !t.settingsSaving);
  const [name, setName] = useState(user);
  useEffect(() => setName(user), [user]);

  // Hours per week for the last 8 weeks: building vs studying.
  const weeks = useMemo(() => {
    const out = [];
    const mon = parseISO(mondayOf(t.today));
    for (let i = 7; i >= 0; i--) {
      const start = isoDate(addDays(mon, -7 * i));
      const end = isoDate(addDays(mon, -7 * i + 6));
      const ss = t.sessions.filter((s) => s.date >= start && s.date <= end);
      out.push({
        label: prettyDate(start, { day: "numeric", month: "short" }),
        build: ss.filter((s) => s.kind === "project").reduce((a, s) => a + s.minutes, 0) / 60,
        study: ss.filter((s) => s.kind !== "project").reduce((a, s) => a + s.minutes, 0) / 60,
      });
    }
    return out;
  }, [t.sessions, t.today]);
  const perProject = t.projects.filter((p) => t.projectMin[p._id]).sort((a, b) => t.projectMin[b._id] - t.projectMin[a._id]);
  const goal = t.settings?.weeklyGoal ?? 7;
  const r1 = (n) => Math.round(n * 10) / 10;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-4 [&>*]:min-w-0">
      <div className={COL}>
        <FinCard
          title={<span className="flex items-center gap-2"><Icon name="code" size={15} /> GitHub</span>}
          action={user && <button onClick={gh.refresh} disabled={gh.loading} className="rounded-xl bg-fin-tile px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50">{gh.loading ? "Loading…" : "Refresh"}</button>}
        >
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value.trim())} placeholder="Your GitHub username" className={`${input} !py-2.5 !text-[14px]`} maxLength={39} aria-label="GitHub username" />
            <button onClick={() => t.saveSettings({ githubUser: name }, name ? "GitHub connected" : "GitHub removed")} disabled={name === user} className="shrink-0 rounded-2xl bg-fin-tile px-4 text-[14px] font-semibold disabled:opacity-40">Save</button>
          </div>
          {!user ? (
            <div className="mt-3 text-[13.5px] leading-relaxed text-fin-muted">Add your username to see your public commits for the last ~90 days. No login needed — it only reads what's already public.</div>
          ) : gh.error && !gh.data ? (
            <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-[13.5px] text-fin-danger">{gh.error}</div>
          ) : gh.data ? (
            <div className="mt-4">
              <div className="mb-3 flex gap-4">
                <div><div className="text-[12px] text-fin-muted">Commits</div><div className="tabular text-[24px] font-extrabold">{gh.data.commits}</div></div>
                <div><div className="text-[12px] text-fin-muted">Active days</div><div className="tabular text-[24px] font-extrabold">{Object.keys(gh.data.days).length}</div></div>
                <div><div className="text-[12px] text-fin-muted">Repos</div><div className="tabular text-[24px] font-extrabold">{gh.data.repos.length}</div></div>
              </div>
              <HeatGrid values={gh.data.days} weeks={13} end={t.today} label={(d, v) => `${prettyDate(d, { day: "numeric", month: "short" })}: ${v} commit${v === 1 ? "" : "s"}`} />
              <div className={`${kicker} mt-4`}>Most active repos</div>
              <div className="space-y-1">
                {gh.data.repos.map((r) => (
                  <a key={r.name} href={`https://github.com/${r.name}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] hover:bg-fin-input">
                    <span className="min-w-0 flex-1 truncate">{r.name.split("/")[1] || r.name}</span>
                    <span className="tabular text-fin-muted">{r.commits} commit{r.commits === 1 ? "" : "s"}</span>
                    <span className="tabular w-16 text-right text-[12px] text-fin-faint">{prettyDate(r.last, { day: "numeric", month: "short" })}</span>
                  </a>
                ))}
                {!gh.data.repos.length && <div className="text-[13px] text-fin-faint">No public commits in the last 90 days.</div>}
              </div>
              {gh.data.stale && <div className="mt-2 text-[12px] text-amber-200">Showing saved numbers — {gh.data.error}</div>}
            </div>
          ) : (
            <div className="mt-4 h-[120px] animate-pulse rounded-2xl bg-fin-input" />
          )}
        </FinCard>
      </div>
      <div className={COL}>
        <FinCard title="Hours logged here" action={<span className="tabular text-[12.5px] text-fin-muted">goal {goal} h/week</span>}>
          <Bars data={weeks.map((w) => ({ label: `Week of ${w.label}`, value: r1(w.build + w.study) }))} target={goal} format={(v) => `${v} h`} height={130} />
          <div className="mt-2 flex justify-between text-[11.5px] text-fin-faint">
            <span>{weeks[0].label}</span>
            <span>this week</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-fin-input px-3 py-2"><div className="text-[12px] text-fin-muted">Building · 8 weeks</div><div className="tabular text-[18px] font-extrabold">{r1(weeks.reduce((a, w) => a + w.build, 0))} h</div></div>
            <div className="rounded-2xl bg-fin-input px-3 py-2"><div className="text-[12px] text-fin-muted">Studying · 8 weeks</div><div className="tabular text-[18px] font-extrabold">{r1(weeks.reduce((a, w) => a + w.study, 0))} h</div></div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13.5px] text-fin-muted">
            Weekly goal
            <input type="number" min="0" max="80" defaultValue={goal} onBlur={(e) => Number(e.target.value) !== goal && t.saveSettings({ weeklyGoal: Math.max(0, Math.min(80, Number(e.target.value) || 0)) }, "Goal saved")} className="w-16 rounded-xl bg-fin-input px-2 py-1 text-center text-white outline-none" aria-label="Weekly goal in hours" />
            hours (building + studying)
          </label>
        </FinCard>
        <FinCard title="Time per project">
          {perProject.length ? (
            <div className="space-y-2">
              {perProject.map((p) => {
                const max = t.projectMin[perProject[0]._id];
                return (
                  <button key={p._id} onClick={() => nav.open("project", p._id)} className="block w-full text-left">
                    <div className="flex justify-between text-[13.5px]"><span className="truncate font-semibold">{p.name}</span><span className="tabular text-fin-muted">{hours(t.projectMin[p._id])}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/30"><div className="h-full rounded-full bg-fin-accent" style={{ width: `${(t.projectMin[p._id] / max) * 100}%` }} /></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-[13.5px] text-fin-muted">Use “Work” on a project to time your building sessions — they show up here.</div>
          )}
        </FinCard>
      </div>
    </div>
  );
}
