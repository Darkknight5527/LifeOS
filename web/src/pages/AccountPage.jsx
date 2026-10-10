// Account: your name and password for everyone; for the owner also invite
// codes and the list of friends (reset a forgotten password, remove someone).
import { useCallback, useEffect, useState } from "react";
import DomainShell from "../components/DomainShell.jsx";
import { useToast } from "../components/Toast.jsx";
import { api, clearLocalData, setToken } from "../api";
import { useMe } from "../lib/user.js";
import { EmptyState, FinCard, GhostButton, Icon, IconButton, PrimaryButton, Sheet, TextField } from "./finances/fin-ui.jsx";

const SITE = typeof window !== "undefined" ? window.location.origin : "";
const APK = "https://github.com/Darkknight5527/LifeOS/releases/download/android-latest/LifeOS.apk";

const ago = (t) => {
  if (!t) return "never";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? "" : "s"} ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AccountPage() {
  const { me, isOwner } = useMe();
  return (
    <DomainShell theme="" title="Account" subtitle={me?.email || ""} logoIcon="gear" maxWidth="lg:max-w-[1180px]">
      <div className={`grid grid-cols-1 items-start gap-5 lg:gap-4 [&>*]:min-w-0 ${isOwner ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "mx-auto max-w-[560px]"}`}>
        <div className="space-y-5 lg:space-y-4">
          <Profile />
          <Password />
          <Sessions />
        </div>
        {isOwner && (
          <div className="space-y-5 lg:space-y-4">
            <Friends />
          </div>
        )}
      </div>
    </DomainShell>
  );
}

// ---------- you ----------
function Profile() {
  const { me, isOwner, setMe } = useMe();
  const toast = useToast();
  const [name, setName] = useState(me?.name || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(me?.name || ""), [me?.name]);
  const save = async () => {
    if (!name.trim() || name.trim() === me?.name) return;
    setBusy(true);
    try {
      setMe(await api.updateMe({ name: name.trim() }));
      toast("Name saved");
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FinCard title="You" action={<span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${isOwner ? "bg-fin-accent/15 text-fin-accent" : "bg-white/10 text-white/70"}`}>{isOwner ? "Owner" : "Member"}</span>}>
      <label className="mb-1.5 block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Name (used in greetings)</label>
      <div className="flex gap-2">
        <TextField value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <PrimaryButton className="shrink-0 !px-4 !py-2.5 !text-[15px]" disabled={busy || !name.trim() || name.trim() === me?.name} onClick={save}>
          Save
        </PrimaryButton>
      </div>
      <div className="mt-3 text-[13.5px] text-fin-muted">
        Signed in as <span className="text-white/85">{me?.email}</span>
      </div>
    </FinCard>
  );
}

function Password() {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setErr("");
    if (f.next.length < 10) return setErr("New password must be at least 10 characters.");
    if (f.next !== f.again) return setErr("The new passwords don't match.");
    setBusy(true);
    try {
      const res = await api.changePassword(f.current, f.next);
      setToken(res.token); // this device stays signed in; others are signed out
      setF({ current: "", next: "", again: "" });
      toast("Password changed — other devices were signed out");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FinCard title="Change password">
      <div className="space-y-2.5">
        <TextField type="password" autoComplete="current-password" placeholder="Current password" value={f.current} onChange={set("current")} />
        <TextField type="password" autoComplete="new-password" placeholder="New password (10+ characters)" value={f.next} onChange={set("next")} />
        <TextField type="password" autoComplete="new-password" placeholder="New password again" value={f.again} onChange={set("again")} onKeyDown={(e) => e.key === "Enter" && save()} />
      </div>
      {err && <div className="mt-2.5 text-[13.5px] text-fin-danger">{err}</div>}
      <PrimaryButton className="mt-3 w-full !py-2.5 !text-[15px]" disabled={busy || !f.current || !f.next} onClick={save}>
        {busy ? "Saving…" : "Change password"}
      </PrimaryButton>
    </FinCard>
  );
}

function Sessions() {
  const signOutAll = async () => {
    if (!window.confirm("Sign out on every device (phone, laptop…)? You'll need your password to log in again.")) return;
    try {
      await api.logoutAll();
    } catch {
      /* the local sign-out below still happens */
    }
    clearLocalData();
    window.location.replace("/");
  };
  return (
    <FinCard title="Devices">
      <div className="flex flex-col gap-2 sm:flex-row">
        <GhostButton
          className="flex-1 !py-2.5 !text-[15px]"
          onClick={() => {
            clearLocalData();
            window.location.replace("/");
          }}
        >
          Log out here
        </GhostButton>
        <GhostButton className="flex-1 !py-2.5 !text-[15px]" onClick={signOutAll}>
          Sign out everywhere
        </GhostButton>
      </div>
    </FinCard>
  );
}

// ---------- owner: friends ----------
function Friends() {
  const toast = useToast();
  const { me } = useMe();
  const [users, setUsers] = useState(null);
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState(null); // invite just made
  const [temp, setTemp] = useState(null); // { name, password }
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const [u, i] = await Promise.all([api.adminUsers(), api.adminInvites()]);
      setUsers(u);
      setInvites(i);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const message = (code) =>
    `Join me on LifeOS!\n\n1. Android app: ${APK}\n   (or use the website: ${SITE})\n2. Tap "Have an invite code? Create an account"\n3. Your code: ${code}\n\nThe code works once and expires in 7 days.`;

  const create = async () => {
    try {
      const inv = await api.adminCreateInvite(note.trim());
      setFresh(inv);
      setNote("");
      load();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const share = async (code) => {
    const text = message(code);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled — fall back to copying */
      }
    }
    toast((await copyText(text)) ? "Invite message copied — paste it in WhatsApp" : "Couldn't copy — select the text and copy it");
  };
  const cancel = async (inv) => {
    try {
      await api.adminDeleteInvite(inv.id);
      if (fresh?.id === inv.id) setFresh(null);
      load();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const reset = async (u) => {
    if (!window.confirm(`Make a temporary password for ${u.name || u.email}? Their current password stops working and they're signed out everywhere.`)) return;
    try {
      const { password } = await api.adminResetPassword(u.id);
      setTemp({ name: u.name || u.email, email: u.email, password });
    } catch (e) {
      toast(e.message, true);
    }
  };

  const pending = invites.filter((i) => !i.usedAt && i.expiresAt > Date.now());

  return (
    <>
      <FinCard title="Invite a friend">
        <p className="mb-3 text-[14px] leading-relaxed text-fin-muted">
          Each code works once and lasts 7 days. Your friend gets their own empty LifeOS — they never see your data, North Star or calendar. Friends get one AI skin check a day.
        </p>
        <div className="flex gap-2">
          <TextField value={note} maxLength={60} placeholder="Who is it for? (optional)" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <PrimaryButton className="shrink-0 !px-4 !py-2.5 !text-[15px]" onClick={create}>
            Create code
          </PrimaryButton>
        </div>
        {fresh && (
          <div className="mt-4 rounded-2xl bg-fin-accent/10 p-4 ring-1 ring-fin-accent/40">
            <div className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">{fresh.note ? `Code for ${fresh.note}` : "New code"}</div>
            <div className="selectable tabular mt-1 text-[30px] font-extrabold tracking-[0.12em] text-fin-accent">{fresh.code}</div>
            <PrimaryButton className="mt-3 w-full !py-2.5 !text-[15px]" onClick={() => share(fresh.code)}>
              <span className="flex items-center justify-center gap-2">
                <Icon name="external" size={17} /> Send invite message
              </span>
            </PrimaryButton>
            <details className="mt-2 text-[13px] text-fin-muted">
              <summary className="cursor-pointer">See the message</summary>
              <pre className="selectable mt-2 whitespace-pre-wrap rounded-xl bg-fin-input p-3 font-fin text-[13px] text-white/85">{message(fresh.code)}</pre>
            </details>
          </div>
        )}
        {pending.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Waiting to be used</div>
            <div className="space-y-1.5">
              {pending.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl bg-fin-input px-3 py-2">
                  <span className="selectable tabular font-bold tracking-[0.08em]">{i.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fin-muted">
                    {i.note || "—"} · expires {new Date(i.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <IconButton icon="copy" label="Send again" onClick={() => share(i.code)} />
                  <IconButton icon="close" label="Cancel code" onClick={() => cancel(i)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </FinCard>

      <FinCard title="People" action={users && <span className="text-[12.5px] text-fin-muted">{users.length} account{users.length === 1 ? "" : "s"}</span>}>
        {error ? (
          <div className="text-[14px] text-fin-danger">
            {error} <button className="underline" onClick={load}>Retry</button>
          </div>
        ) : !users ? (
          <div className="h-24 animate-pulse rounded-2xl bg-fin-input" />
        ) : users.length <= 1 ? (
          <EmptyState icon="mail">No friends yet — create a code above and send it to them.</EmptyState>
        ) : (
          <div className="space-y-1.5">
            {users.map((u) => {
              const self = String(u.id) === String(me?.id) || u.email === me?.email;
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-xl bg-fin-input px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[15px] font-bold uppercase">{(u.name || u.email)[0]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold">
                      {u.name || u.email.split("@")[0]}
                      {u.role === "admin" && <span className="ml-2 rounded-full bg-fin-accent/15 px-2 py-0.5 text-[11px] font-bold text-fin-accent">Owner</span>}
                    </div>
                    <div className="truncate text-[12.5px] text-fin-muted">
                      {u.email} · last seen {self ? "now" : ago(u.lastSeenAt)}
                    </div>
                  </div>
                  {!self && (
                    <>
                      <GhostButton className="!px-3 !py-1.5 !text-[13px]" onClick={() => reset(u)}>
                        Reset password
                      </GhostButton>
                      <IconButton icon="trash" label={`Remove ${u.name || u.email}`} onClick={() => setRemoving(u)} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FinCard>

      <Sheet
        open={Boolean(temp)}
        onClose={() => setTemp(null)}
        title="Temporary password"
        footer={
          <PrimaryButton
            className="flex-1"
            onClick={async () => {
              const ok = await copyText(`Your LifeOS password was reset.\nEmail: ${temp.email}\nTemporary password: ${temp.password}\nLog in, then change it in Account → Change password.`);
              toast(ok ? "Copied — send it to them" : "Couldn't copy — select it instead");
            }}
          >
            Copy message
          </PrimaryButton>
        }
      >
        {temp && (
          <>
            <p className="text-[14.5px] leading-relaxed text-fin-muted">
              Send this to <span className="text-white">{temp.name}</span>. They log in with it, then change it in Account. It's shown only once.
            </p>
            <div className="selectable tabular mt-4 rounded-2xl bg-fin-input p-4 text-center text-[22px] font-extrabold tracking-[0.06em]">{temp.password}</div>
          </>
        )}
      </Sheet>

      <RemoveSheet
        user={removing}
        onClose={() => setRemoving(null)}
        onDone={() => {
          setRemoving(null);
          load();
        }}
      />
    </>
  );
}

function RemoveSheet({ user, onClose, onDone }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setTyped(""), [user]);
  const go = async () => {
    setBusy(true);
    try {
      await api.adminRemoveUser(user.id, typed.trim());
      toast(`${user.name || user.email} removed`);
      onDone();
    } catch (e) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  const match = user && typed.trim().toLowerCase() === user.email;
  return (
    <Sheet
      open={Boolean(user)}
      onClose={onClose}
      title="Remove account"
      footer={
        <>
          <GhostButton className="flex-1" onClick={onClose}>
            Cancel
          </GhostButton>
          <PrimaryButton className="flex-1 !from-red-500 !to-red-700" disabled={!match || busy} onClick={go}>
            {busy ? "Removing…" : "Remove forever"}
          </PrimaryButton>
        </>
      }
    >
      {user && (
        <>
          <p className="text-[14.5px] leading-relaxed text-fin-muted">
            This deletes <span className="text-white">{user.name || user.email}</span>'s account and <b className="text-white">all of their data</b> — finances, workouts, skin checks and photos, everything. It can't be undone.
          </p>
          <label className="mb-1.5 mt-4 block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">Type their email to confirm</label>
          <TextField value={typed} placeholder={user.email} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        </>
      )}
    </Sheet>
  );
}
