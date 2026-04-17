"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}
function authH(json = true) {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ── Small input ───────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input type={type} value={value} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800
          placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
          transition text-sm disabled:opacity-60 disabled:cursor-not-allowed" />
    </div>
  );
}

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

// ══════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  // ── Profile ───────────────────────────────────────────────────
  const [name,    setName]    = useState("");
  const [company, setCompany] = useState("");
  const [email,   setEmail]   = useState("");

  // ── Password ──────────────────────────────────────────────────
  const [curPwd,    setCurPwd]    = useState("");
  const [newPwd,    setNewPwd]    = useState("");
  const [repPwd,    setRepPwd]    = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load profile ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.user) { setName(d.user.name || ""); setCompany(d.user.company || ""); setEmail(d.user.email || ""); } })
      .catch(() => {});
  }, []);

  // ── Change password ───────────────────────────────────────────
  const changePassword = async () => {
    if (!curPwd) return showToast("Podaj obecne hasło", false);
    if (newPwd.length < 8) return showToast("Nowe hasło musi mieć min. 8 znaków", false);
    if (newPwd !== repPwd)  return showToast("Hasła nie są takie same", false);
    setPwdLoading(true);
    try {
      const r = await fetch(`${API}/auth/change-password`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const d = await r.json();
      if (d.error) showToast(d.error, false);
      else { showToast("Hasło zmienione", true); setCurPwd(""); setNewPwd(""); setRepPwd(""); }
    } catch { showToast("Błąd połączenia z serwerem", false); }
    finally { setPwdLoading(false); }
  };

  return (
    <div className="max-w-[860px] mx-auto pb-16 space-y-6">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── DANE KONTA ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">Dane konta</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Imię / nazwa" value={name} disabled />
          <Field label="Firma" value={company} disabled />
        </div>
        <Field label="Email" value={email} disabled />
        <p className="text-xs text-slate-400 mt-3">Aby zmieni&#263; dane skontaktuj si&#281; z administratorem.</p>
      </div>

      {/* ── ZMIANA HASŁA ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">Zmie&#324; has&#322;o</h2>
        <div className="space-y-3 max-w-md">
          <Field label="Obecne has&#322;o" type="password" value={curPwd} onChange={setCurPwd} placeholder="••••••••" />
          <Field label="Nowe has&#322;o (min. 8 znak&#243;w)" type="password" value={newPwd} onChange={setNewPwd} placeholder="••••••••" />
          <Field label="Powt&#243;rz nowe has&#322;o" type="password" value={repPwd} onChange={setRepPwd} placeholder="••••••••" />
          {newPwd && repPwd && newPwd !== repPwd && (
            <p className="text-xs text-red-500">Has&#322;a nie s&#261; takie same</p>
          )}
        </div>
        <button onClick={changePassword} disabled={pwdLoading}
          className={`mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
            pwdLoading
              ? "bg-indigo-300 cursor-wait"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-md hover:scale-105"
          }`}>
          {pwdLoading
            ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Zapisywanie...</>
            : "Zmie&#324; has&#322;o"}
        </button>
      </div>
    </div>
  );
}
