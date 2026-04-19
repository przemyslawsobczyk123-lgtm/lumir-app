"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  // Handle Google OAuth redirect + other query params
  useEffect(() => {
    const googleToken = params.get("google_token");
    const err         = params.get("error");

    if (googleToken) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${googleToken}` } })
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem("token", googleToken);
            localStorage.setItem("user", JSON.stringify(data.user));
            setSuccess(true);
            setTimeout(() => router.push("/dashboard"), 800);
          }
        })
        .catch(() => setError("Błąd logowania przez Google"));
      return;
    }

    if (err === "google_cancelled") return;
    if (err === "google_failed") setError("Nie udało się zalogować przez Google");
    if (err === "inactive") setError("Konto jest nieaktywne — skontaktuj się z administratorem");
  }, [params, router]);

  async function login() {
    setError(""); setUnverified(null);
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.requiresVerification) {
          setUnverified(data.email || email);
        } else {
          setError(data.error);
        }
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 800);
      }
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!unverified) return;
    setResendSent(false);
    await fetch(`${API}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverified }),
    });
    setResendSent(true);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") login();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-green-500/10 blur-[80px] top-[40%] left-[40%] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Image src="/lumir-icon.svg" alt="LuMir" width={36} height={36} className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-semibold text-white"
            style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.06em" }}>
            LuMir
          </h1>
          <p className="text-slate-400 text-sm mt-1">Inteligentny generator ofert</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Witaj ponownie</h2>
          <p className="text-slate-400 text-sm mb-6">Zaloguj się, aby kontynuować</p>

          {/* Google button */}
          <a href={`${API}/auth/google/start`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 mb-5 rounded-xl
              bg-white/5 border border-white/10 text-white text-sm font-medium
              hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Kontynuj z Google
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10"/>
            <span className="text-slate-500 text-xs">lub email</span>
            <div className="flex-1 h-px bg-white/10"/>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Unverified email notice */}
          {unverified && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Potwierdź swój adres email
              </div>
              <p className="text-amber-400/70 text-xs mb-2">Sprawdź skrzynkę pocztową i kliknij link weryfikacyjny.</p>
              {resendSent
                ? <p className="text-green-400 text-xs">Email wysłany ponownie ✓</p>
                : <button onClick={resendVerification} className="text-xs underline hover:no-underline">Wyślij ponownie</button>
              }
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Zalogowano! Przekierowanie…
            </div>
          )}

          {/* Email */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                placeholder="twoj@email.pl"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKey}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
                  text-white placeholder-slate-500 outline-none text-sm transition
                  focus:border-indigo-500/60 focus:bg-white/8 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Hasło</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/10
                  text-white placeholder-slate-500 outline-none text-sm transition
                  focus:border-indigo-500/60 focus:bg-white/8 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPwd
                  ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => router.push("/forgot-password")}
              className="text-slate-500 hover:text-slate-300 transition text-xs"
            >
              Zapomniałeś hasła?
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={login}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98]"
            style={{ background: success ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Logowanie…
              </>
            ) : success ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                Zalogowano
              </>
            ) : "Zaloguj się"}
          </button>

          <div className="mt-5 text-center">
            <button
              onClick={() => router.push("/register")}
              className="text-slate-400 hover:text-white transition text-sm"
            >
              Nie masz konta? <span className="text-indigo-400 font-medium">Zarejestruj się</span>
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} LuMir
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
