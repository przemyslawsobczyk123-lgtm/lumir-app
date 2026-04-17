"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RegisterPage() {
  const router = useRouter();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [company,  setCompany]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [done,     setDone]     = useState(false);

  const emailValid    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const nameValid     = name.length >= 2;
  const canSubmit     = emailValid && passwordValid && nameValid && !loading;

  async function register() {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDone(true);
      }
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") register();
  }

  // ── "Sprawdź skrzynkę" state ──────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-[420px] mx-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Sprawdź skrzynkę</h1>
          <p className="text-slate-400 text-sm mb-1">Wysłaliśmy link weryfikacyjny na:</p>
          <p className="text-indigo-400 font-medium mb-6">{email}</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 text-left">
              <span className="text-indigo-400 mt-0.5">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
              <p className="text-slate-400 text-sm leading-relaxed">
                Kliknij link w emailu, aby aktywować konto. Link jest ważny przez <strong className="text-white">24 godziny</strong>.
                Sprawdź też folder <strong className="text-white">Spam</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Przejdź do logowania
          </button>
          <p className="text-slate-600 text-xs mt-6">© {new Date().getFullYear()} LuMir</p>
        </div>
      </div>
    );
  }

  // ── Register form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-green-500/10 blur-[80px] top-[40%] left-[40%] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <img src="/lumir-icon.svg" alt="LuMir" className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-semibold text-white"
            style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.06em" }}>
            LuMir
          </h1>
          <p className="text-slate-400 text-sm mt-1">Inteligentny generator ofert</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Utwórz konto</h2>
          <p className="text-slate-400 text-sm mb-6">Zacznij sprzedawać szybciej z AI</p>

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

          {/* Name */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Imię / nazwa</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Jan Kowalski"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKey}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 outline-none text-sm transition focus:ring-2 focus:ring-indigo-500/20 ${
                  name && !nameValid ? "border-red-500/60" : "border-white/10 focus:border-indigo-500/60"
                }`}
              />
            </div>
          </div>

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
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 outline-none text-sm transition focus:ring-2 focus:ring-indigo-500/20 ${
                  email && !emailValid ? "border-red-500/60" : "border-white/10 focus:border-indigo-500/60"
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-3">
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
                placeholder="Minimum 8 znaków"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                className={`w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 outline-none text-sm transition focus:ring-2 focus:ring-indigo-500/20 ${
                  password && !passwordValid ? "border-red-500/60" : "border-white/10 focus:border-indigo-500/60"
                }`}
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
            {password && !passwordValid && (
              <p className="text-red-400 text-xs mt-1">Hasło musi mieć minimum 8 znaków</p>
            )}
          </div>

          {/* Company (optional) */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Firma <span className="text-slate-600 normal-case font-normal">(opcjonalne)</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Nazwa firmy"
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={handleKey}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none text-sm transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={register}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Tworzenie konta…
              </>
            ) : "Utwórz konto"}
          </button>

          <div className="mt-5 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-slate-400 hover:text-white transition text-sm"
            >
              Masz już konto? <span className="text-indigo-400 font-medium">Zaloguj się</span>
            </button>
          </div>

          <p className="text-slate-600 text-xs text-center mt-4">
            Rejestrując się, akceptujesz regulamin i politykę prywatności.
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} LuMir
        </p>
      </div>
    </div>
  );
}
