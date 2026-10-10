// Sign in, or join with an invite code from the owner.
import { useState } from "react";
import { api, setToken } from "../api";

export default function LoginPage({ onLoggedIn }) {
  // Opening an invite link (…/?invite=ABCD-EFGH) goes straight to sign-up.
  const linkCode = (() => {
    try {
      return new URLSearchParams(window.location.search).get("invite") || "";
    } catch {
      return "";
    }
  })();
  const [mode, setMode] = useState(linkCode ? "join" : "login");
  const [f, setF] = useState({ email: "", password: "", password2: "", name: "", code: linkCode });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const join = mode === "join";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (join) {
      if (f.password.length < 10) return setError("Password must be at least 10 characters.");
      if (f.password !== f.password2) return setError("The two passwords don't match.");
    }
    setLoading(true);
    try {
      const res = join
        ? await api.register({ email: f.email, password: f.password, name: f.name, code: f.code })
        : await api.login(f.email, f.password);
      setToken(res.token);
      if (linkCode) window.history.replaceState(null, "", "/");
      onLoggedIn(res.user);
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Wrong email or password." : err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-2xl border border-transparent bg-[#1d1d23] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/30 focus:border-[#fb8a3c]/70";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-4 py-10 font-fin text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-[380px] space-y-3.5 rounded-[28px] bg-[#141418] p-7 shadow-2xl ring-1 ring-white/5">
        <div className="mb-1 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f2772a] to-[#c2490b] text-[20px] font-extrabold">L</span>
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight">LifeOS</h1>
            <p className="text-[13.5px] text-white/50">{join ? "Create your account" : "Sign in to your dashboard"}</p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-[14px] text-red-300" role="alert">{error}</div>}

        {join && (
          <>
            <Field label="Invite code">
              <input value={f.code} onChange={set("code")} required autoCapitalize="characters" autoComplete="off" placeholder="e.g. K7QM-4TXB" className={`${input} tracking-[0.12em] uppercase`} />
            </Field>
            <Field label="Your name">
              <input value={f.name} onChange={set("name")} required maxLength={60} autoComplete="name" placeholder="What should LifeOS call you?" className={input} />
            </Field>
          </>
        )}
        <Field label="Email">
          <input type="email" value={f.email} onChange={set("email")} required autoComplete="email" className={input} />
        </Field>
        <Field label={join ? "Choose a password (10+ characters)" : "Password"}>
          <input type="password" value={f.password} onChange={set("password")} required autoComplete={join ? "new-password" : "current-password"} className={input} />
        </Field>
        {join && (
          <Field label="Type it again">
            <input type="password" value={f.password2} onChange={set("password2")} required autoComplete="new-password" className={input} />
          </Field>
        )}

        <button type="submit" disabled={loading} className="!mt-5 w-full rounded-2xl bg-gradient-to-r from-[#f2772a] to-[#c2490b] py-3.5 text-[16px] font-bold text-white transition active:scale-[0.98] disabled:opacity-50">
          {loading ? (join ? "Creating account…" : "Signing in…") : join ? "Create account" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(join ? "login" : "join");
            setError("");
          }}
          className="w-full rounded-2xl py-2.5 text-[14px] font-semibold text-white/60 hover:bg-white/5 hover:text-white"
        >
          {join ? "Already have an account? Sign in" : "Have an invite code? Create an account"}
        </button>
        {!join && <p className="text-center text-[12.5px] text-white/35">Forgot your password? Ask the person who invited you to reset it.</p>}
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white/45">{label}</span>
      {children}
    </label>
  );
}
