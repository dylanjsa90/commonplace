"use client";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, ArrowRight, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { api } from "./shared";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setReady(true);
    if (mode === "register" && location.hash) history.replaceState(null, "", location.pathname);
  }, [mode]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      location.assign("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <a href="/" className="brand auth-brand">
        <BookOpen size={30} strokeWidth={1.6} />
        <span>Commonplace</span>
      </a>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="auth-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>
            A home for
            <br />
            your curiosity.
          </h1>
          <p>
            Good reads, bright ideas, and things worth coming back to. Keep them
            all in one place.
          </p>
          <span className="auth-story-foot">
            Collect a little. Discover a lot.
          </span>
        </section>
        <section className="auth-panel">
          <BookOpen size={28} strokeWidth={1.4} className="auth-panel-icon" />
          <h2>
            {mode === "login" ? "Welcome back." : "Make yourself at home."}
          </h2>
          <p>
            {mode === "login"
              ? "Your corner of the internet is waiting."
              : "Create an account and start your own library."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" ? (
              <>
                <label htmlFor="auth-name">Your name</label>
                <input
                  id="auth-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </>
            ) : null}
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              required
              disabled={busy}
            />
            <label htmlFor="auth-password">Password</label>
            <div className="auth-password">
              <input
                id="auth-password"
                type={visible ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={1024}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mode === "register" ? (
              <>
                <small className="password-hint">
                  At least 12 characters. A memorable phrase works well.
                </small>
              </>
            ) : null}
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="primary-button auth-submit" disabled={busy || !ready}>
              {busy ? <LoaderCircle className="spin" size={17} /> : null}
              {busy
                ? "One moment…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!busy ? <ArrowRight size={17} /> : null}
            </button>
          </form>
          <p className="auth-alternate">
            {mode === "login" ? (
              <>
                New here? <a href="/register">Create your account</a>
              </>
            ) : (
              <>
                Already have a library? <a href="/login">Sign in</a>
              </>
            )}
          </p>
        </section>
      </div>
      <footer className="auth-footer">
        A quieter place for the things you want to keep.
      </footer>
    </main>
  );
}
