"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}

function authH() {
  return { Authorization: `Bearer ${getToken()}` };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        className="w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition placeholder-[var(--text-tertiary)] focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20"
        style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-input)" }}
      />
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
        ok ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [repPwd, setRepPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authH() })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setName(d.user.name || "");
          setCompany(d.user.company || "");
          setEmail(d.user.email || "");
        }
      })
      .catch(() => {});
  }, []);

  const changePassword = async () => {
    if (pwdLoading) return;
    if (!curPwd) return showToast("Podaj obecne haslo", false);
    if (newPwd.length < 8) return showToast("Nowe haslo musi miec min. 8 znakow", false);
    if (newPwd !== repPwd) return showToast("Hasla nie sa takie same", false);

    setPwdLoading(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          ...authH(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const json = await res.json();
      if (json.error) {
        showToast(json.error, false);
      } else {
        showToast("Haslo zmienione", true);
        setCurPwd("");
        setNewPwd("");
        setRepPwd("");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Blad polaczenia z serwerem"), false);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[860px] space-y-6 pb-16">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <div className="mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Dane konta</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Billing moved out. Settings stays on account and password only.</p>
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Field label="Imie / nazwa" value={name} />
          <Field label="Firma" value={company} />
        </div>
        <Field label="Email" value={email} />
        <p className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>Zmiana danych konta jest obecnie poza MVP panelu.</p>
      </div>

      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Zmien haslo</h2>
        <div className="mt-4 max-w-md space-y-3">
          <Field label="Obecne haslo" type="password" value={curPwd} onChange={setCurPwd} placeholder="********" />
          <Field label="Nowe haslo (min. 8 znakow)" type="password" value={newPwd} onChange={setNewPwd} placeholder="********" />
          <Field label="Powtorz nowe haslo" type="password" value={repPwd} onChange={setRepPwd} placeholder="********" />
          {newPwd && repPwd && newPwd !== repPwd ? (
            <p className="text-xs text-red-500">Hasla nie sa takie same</p>
          ) : null}
        </div>

        <button
          onClick={() => {
            void changePassword();
          }}
          aria-disabled={pwdLoading}
          className={`mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition ${
            pwdLoading
              ? "cursor-wait bg-indigo-300"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-md"
          }`}
        >
          {pwdLoading ? "Zapisywanie..." : "Zmien haslo"}
        </button>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-indigo-700">Billing przeniesiony</div>
            <p className="mt-1 text-sm text-indigo-600/80">
              Kredyty, packi i historia platnosci sa teraz w osobnym widoku.
            </p>
          </div>
          <a
            href="/dashboard/billing"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Otworz Billing
          </a>
        </div>
      </div>
    </div>
  );
}
