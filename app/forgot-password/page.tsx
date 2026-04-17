"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ForgotPasswordPage() {
  const router  = useRouter();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function send() {
    if (!email.trim()) return;
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDone(true);
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px] bottom-[-80px] right-[-80px] pointer-events-none" />

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
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Sprawdź skrzynkę</h2>
              <p className="text-slate-400 text-sm mb-1">Jeśli konto istnieje, wysłaliśmy link resetujący na:</p>
              <p className="text-indigo-400 font-medium text-sm mb-6">{email}</p>
              <p className="text-slate-500 text-xs mb-6">Link jest ważny przez 1 godzinę.</p>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02] shadow-lg"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                Wróć do logowania
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Resetuj hasło</h2>
              <p className="text-slate-400 text-sm mb-6">
                Podaj swój adres email, a wyślemy Ci link do ustawienia nowego hasła.
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="mb-6">
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
                    onKeyDown={e => e.key === "Enter" && send()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
                      text-white placeholder-slate-500 outline-none text-sm transition
                      focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <button
                onClick={send}
                disabled={!email.trim() || loading}
                className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-4 ${
                  !email.trim() || loading
                    ? "opacity-50 cursor-not-allowed bg-indigo-500/40"
                    : "shadow-lg hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98]"
                }`}
                style={email.trim() && !loading ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : {}}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Wysyłanie…
                  </>
                ) : "Wyślij link resetujący"}
              </button>

              <div className="text-center">
                <button
                  onClick={() => router.push("/login")}
                  className="text-slate-500 hover:text-slate-300 transition text-sm"
                >
                  ← Wróć do logowania
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© {new Date().getFullYear()} LuMir</p>
      </div>
    </div>
  );
}
