"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") || "";

  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const passwordValid = password.length >= 8;
  const match         = password === password2;
  const canSubmit     = passwordValid && match && password2.length > 0 && !loading;

  async function reset() {
    if (!canSubmit || !token) return;
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Auto-login with returned JWT
        fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } })
          .then(r => r.json())
          .then(d => {
            if (d.user) {
              localStorage.setItem("token", data.token);
              localStorage.setItem("user", JSON.stringify(d.user));
            }
          })
          .catch(() => {});
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Nieprawidłowy link resetujący.</p>
          <button onClick={() => router.push("/forgot-password")}
            className="text-indigo-400 hover:text-indigo-300 transition text-sm">
            Poproś o nowy link →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <img src="/lumir-icon.svg" alt="LuMir" className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-semibold text-white"
            style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.06em" }}>
            LuMir
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Nowe hasło</h2>
          <p className="text-slate-400 text-sm mb-6">Ustaw nowe hasło dla swojego konta.</p>

          {error && (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
              {error.includes("wygasł") && (
                <button onClick={() => router.push("/forgot-password")}
                  className="ml-auto text-xs underline whitespace-nowrap">Nowy link</button>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Hasło zmienione! Przekierowanie…
            </div>
          )}

          {/* Password */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nowe hasło</label>
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
                className={`w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 outline-none text-sm transition focus:ring-2 focus:ring-indigo-500/20 ${
                  password && !passwordValid ? "border-red-500/60" : "border-white/10 focus:border-indigo-500/60"
                }`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                {showPwd
                  ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {password && !passwordValid && (
              <p className="text-red-400 text-xs mt-1">Hasło musi mieć minimum 8 znaków</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Powtórz hasło</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Powtórz hasło"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                onKeyDown={e => e.key === "Enter" && reset()}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 outline-none text-sm transition focus:ring-2 focus:ring-indigo-500/20 ${
                  password2 && !match ? "border-red-500/60" : "border-white/10 focus:border-indigo-500/60"
                }`}
              />
            </div>
            {password2 && !match && (
              <p className="text-red-400 text-xs mt-1">Hasła nie są identyczne</p>
            )}
          </div>

          <button
            onClick={reset}
            disabled={!canSubmit || success}
            className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              !canSubmit || success
                ? "opacity-50 cursor-not-allowed bg-indigo-500/40"
                : "shadow-lg hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98]"
            }`}
            style={canSubmit && !success ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : {}}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Zapisywanie…
              </>
            ) : success ? "Hasło zmienione ✓" : "Ustaw nowe hasło"}
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© {new Date().getFullYear()} LuMir</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
