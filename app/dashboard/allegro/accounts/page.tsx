"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}
function authH() {
  return { Authorization: `Bearer ${getToken()}` };
}

type AllegroAccount = {
  id: number;
  environment: "production" | "sandbox";
  allegro_login: string | null;
  allegro_user_id: string | null;
  expires_at: string;
  created_at: string;
  status: "valid" | "expired";
  minutesLeft: number;
};

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {ok
        ? <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
        : <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
      {msg}
    </div>
  );
}

// ── Account Card ──────────────────────────────────────────────────
function AccountCard({ account, onDisconnect }: {
  account: AllegroAccount; onDisconnect: () => void;
}) {
  const isProd  = account.environment === "production";
  const isValid = account.status === "valid";
  const hours   = Math.floor(account.minutesLeft / 60);
  const mins    = account.minutesLeft % 60;

  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-2xl border transition"
      style={{
        background: "var(--bg-card)",
        borderColor: isValid ? "var(--border-default)" : "#fcd34d55",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar — gradient matching project's avatar/button style */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-base shadow-sm"
          style={{ background: isProd
            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
            : "linear-gradient(135deg, #64748b, #475569)" }}
        >
          A
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {account.allegro_login || "Konto Allegro"}
            </span>
            {/* Environment badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              isProd
                ? "bg-green-100 text-green-700"
                : "bg-slate-200 text-slate-500"
            }`}>
              {isProd ? "Produkcja" : "Sandbox"}
            </span>
            {/* Token status — auto-refreshed, just informational */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              isValid ? "bg-green-50 text-green-600" : "bg-amber-100 text-amber-600"
            }`}>
              {isValid ? `● Token ważny ${hours}h ${mins}min` : "● Token wygasł"}
            </span>
          </div>
          {account.allegro_user_id && (
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              ID: {account.allegro_user_id}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onDisconnect}
        className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600
          px-3 py-1.5 rounded-lg transition hover:bg-red-50"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Rozłącz
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function AllegroAccountsPage() {
  const [accounts,        setAccounts]        = useState<AllegroAccount[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [connecting,      setConnecting]      = useState<"production" | "sandbox" | null>(null);
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [disconnectId,    setDisconnectId]    = useState<number | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAccounts = useCallback(async (triggerRefresh = false) => {
    setLoading(true);
    try {
      // If any account is expired, trigger server-side refresh first
      if (triggerRefresh) {
        await fetch(`${API}/api/seller/allegro/accounts/refresh`, {
          method: "POST", headers: authH(),
        });
      }
      const r = await fetch(`${API}/api/seller/allegro/accounts`, { headers: authH() });
      const j = await r.json();
      if (j.data) {
        setAccounts(j.data);
        // If still expired after refresh attempt, try once more silently
        const hasExpired = j.data.some((a: AllegroAccount) => a.status === "expired");
        if (hasExpired && !triggerRefresh) loadAccounts(true);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "allegro-auth") return;
      setConnecting(null);
      if (e.data.success) {
        showToast(`Połączono konto Allegro: ${e.data.login || "—"}`, true);
        loadAccounts();
      } else {
        showToast(`Błąd: ${e.data.error || "Nieznany błąd"}`, false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadAccounts]);

  const connectAllegro = async (env: "production" | "sandbox") => {
    setConnecting(env);
    try {
      const r = await fetch(`${API}/api/seller/allegro/auth/start?env=${env}`, { headers: authH() });
      const j = await r.json();
      if (!j.url) throw new Error(j.error || "Brak URL");
      const popup = window.open(j.url, "allegro-auth",
        "width=600,height=720,top=100,left=200,toolbar=no,location=yes,status=no,menubar=no");
      if (!popup) {
        showToast("Przeglądarka zablokowała popup — zezwól na wyskakujące okna dla tej strony", false);
        setConnecting(null);
      }
    } catch (e: any) {
      showToast(e.message, false);
      setConnecting(null);
    }
  };

  const disconnectAllegro = async () => {
    if (disconnectId === null) return;
    await fetch(`${API}/api/seller/allegro/accounts/${disconnectId}`, { method: "DELETE", headers: authH() });
    setDisconnectId(null);
    showToast("Konto odłączone", true);
    loadAccounts();
  };

  const hasProduction = accounts.some(a => a.environment === "production");
  const hasSandbox    = accounts.some(a => a.environment === "sandbox");

  return (
    <div className="max-w-[860px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Konta Allegro</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Połącz swoje konto Allegro, aby pobierać oferty i wystawiać produkty bezpośrednio z aplikacji.
          </p>
        </div>

        <div className="flex gap-2">
          {!hasProduction && (
            <button
              onClick={() => connectAllegro("production")}
              disabled={connecting !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm text-white ${
                connecting === "production" ? "opacity-70 cursor-wait" : "hover:shadow-md hover:scale-105"
              }`}
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {connecting === "production" ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Łączenie...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Połącz konto
                </>
              )}
            </button>
          )}
          {!hasSandbox && (
            <button
              onClick={() => connectAllegro("sandbox")}
              disabled={connecting !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                connecting === "sandbox" ? "opacity-50 cursor-wait" : "hover:bg-white/5"
              }`}
              style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
            >
              {connecting === "sandbox" ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : null}
              + Sandbox
            </button>
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10" style={{ color: "var(--text-tertiary)" }}>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Ładowanie kont...</span>
          </div>
        ) : accounts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--accent-primary-light, #eef2ff)" }}
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ color: "var(--accent-primary, #6366f1)" }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Brak połączonych kont
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
              Połącz konto Allegro, aby wystawiać oferty bezpośrednio z aplikacji
            </p>
            <button
              onClick={() => connectAllegro("production")}
              disabled={connecting !== null}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold
                shadow-md hover:shadow-lg hover:scale-105 transition"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Połącz konto Allegro
            </button>
          </div>
        ) : (
          /* Account list */
          <div className="space-y-3">
            {accounts.map(acc => (
              <AccountCard
                key={acc.id}
                account={acc}
                onDisconnect={() => setDisconnectId(acc.id)}
              />
            ))}

            {/* Option to add the other environment */}
            {((hasProduction && !hasSandbox) || (hasSandbox && !hasProduction)) && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Dodaj też środowisko:</span>
                {!hasSandbox && (
                  <button
                    onClick={() => connectAllegro("sandbox")}
                    disabled={connecting !== null}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition hover:bg-white/5"
                    style={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}
                  >
                    + Sandbox
                  </button>
                )}
                {!hasProduction && (
                  <button
                    onClick={() => connectAllegro("production")}
                    disabled={connecting !== null}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:border-indigo-300"
                  >
                    + Produkcja
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info box — auto-refresh */}
        <div
          className="mt-6 flex items-start gap-3 px-4 py-3 rounded-xl text-xs border"
          style={{
            background: "var(--bg-input-alt)",
            borderColor: "var(--border-default)",
            color: "var(--text-tertiary)",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>
            Token Allegro jest <strong>automatycznie odświeżany</strong> — wystarczy połączyć konto raz.
            Nie musisz logować się ponownie. Połączenie działa bezterminowo.
          </span>
        </div>
      </div>

      {/* DISCONNECT MODAL */}
      {disconnectId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setDisconnectId(null)}
        >
          <div
            className="relative w-full max-w-[360px] rounded-2xl p-7 shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
            </div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-primary)" }}>
              Odłączyć konto Allegro?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Konto zostanie odłączone. Będziesz mógł podłączyć je ponownie w dowolnym momencie.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDisconnectId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition hover:bg-white/5"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                Anuluj
              </button>
              <button
                onClick={disconnectAllegro}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition
                  bg-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 active:scale-95"
              >
                Odłącz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
