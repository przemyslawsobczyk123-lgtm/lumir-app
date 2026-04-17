"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MARKETPLACES = [
  { slug: "mediaexpert", label: "Media Expert" },
  { slug: "allegro",     label: "Allegro"       },
  { slug: "empik",       label: "Empik"          },
];

type AllegroAccountSidebar = {
  id: number;
  environment: "production" | "sandbox";
  allegro_login: string | null;
  status: "valid" | "expired";
  minutesLeft: number;
};

// ── Theme icons ─────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function DashboardLayout({ children }: any) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedMp, setExpandedMp] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [logoutModal, setLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Allegro per-seller account (status only — management is on dedicated page)
  const [allegroAccounts, setAllegroAccounts] = useState<AllegroAccountSidebar[]>([]);

  const loadAllegroAccounts = useCallback(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    fetch(`${API}/api/seller/allegro/accounts`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(j => { if (j.data) setAllegroAccounts(j.data); })
      .catch(() => {});
  }, []);

  // Load user + theme
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    // Load theme
    const savedTheme = localStorage.getItem("lumir-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    loadAllegroAccounts();
  }, [loadAllegroAccounts]);

  // Refresh Allegro status after OAuth on dedicated page
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "allegro-auth") return;
      if (e.data.success) loadAllegroAccounts();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadAllegroAccounts]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("lumir-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  function confirmLogout() {
    setLogoutModal(true);
    setOpen(false);
  }

  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen font-[Inter]" style={{ background: "var(--bg-body)" }}>

      {/* SIDEBAR */}
      <div className="w-[220px] text-white p-5 fixed h-full flex flex-col overflow-y-auto"
        style={{ background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-2.5 mb-10">
          <img src="/lumir-icon.svg" alt="LuMir" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <span className="text-[22px] font-semibold tracking-wide text-white"
            style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.04em" }}>
            LuMir
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {[
            { href: "/dashboard",          label: "📦 Produkty",        exact: true  },
            { href: "/dashboard/products", label: "📋 Lista produktów", exact: false },
            { href: "/dashboard/settings", label: "⚙️ Ustawienia",      exact: false },
          ].map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <div key={href}
                onClick={() => router.push(href)}
                className={`px-4 py-3 rounded-xl font-medium cursor-pointer transition-all ${
                  active
                    ? "bg-green-500 text-white shadow-sm shadow-green-900/30"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}>
                {label}
              </div>
            );
          })}

          {/* MARKETPLACE */}
          <div className="pt-4">
            <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase px-1 mb-2">
              Marketplace
            </div>
            <div className="space-y-1">
              {MARKETPLACES.map(({ slug, label }) => {
                const isAllegro  = slug === "allegro";
                const isExpanded = expandedMp === slug;
                const hasAny     = isAllegro && allegroAccounts.length > 0;
                const validCount = isAllegro ? allegroAccounts.filter(a => a.status === "valid").length : 0;

                return (
                  <div key={slug}>
                    {/* Row header */}
                    <div
                      onClick={() => setExpandedMp(isExpanded ? null : slug)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg
                        text-slate-300 hover:bg-white/10 hover:text-white
                        transition cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{label}</span>
                        {isAllegro && hasAny && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <svg
                        viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                      >
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="ml-3 mt-1 space-y-0.5">

                        {/* Kategoria link */}
                        <div
                          onClick={() => router.push(`/dashboard/marketplace/${slug}`)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white
                            hover:bg-white/5 rounded-lg cursor-pointer transition
                            border-l-2 border-white/10 pl-3 flex items-center gap-2"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                          Kategoria
                        </div>

                        {/* Allegro accounts link */}
                        {isAllegro && (
                          <div
                            onClick={() => router.push("/dashboard/allegro/accounts")}
                            className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition
                              border-l-2 border-white/10 pl-3 flex items-center gap-2
                              ${pathname === "/dashboard/allegro/accounts"
                                ? "text-indigo-400 bg-indigo-500/10 border-l-indigo-500/60"
                                : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                          >
                            <div className="w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0 text-white font-black text-[7px]" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>A</div>
                            <span>Konta Allegro</span>
                            {hasAny && (
                              <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${validCount > 0 ? "bg-green-400" : "bg-amber-400"}`} />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* USER INFO */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          <button
            onClick={confirmLogout}
            className="mt-2 text-xs text-red-400 hover:text-red-300 transition"
          >
            🚪 Wyloguj
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="ml-[220px] w-full">

        {/* TOPBAR */}
        <div className="flex justify-between items-center px-8 py-4 border-b"
          style={{ background: "var(--bg-topbar)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <input
            placeholder="Szukaj..."
            className="px-4 py-2 rounded-xl w-[250px] outline-none text-sm"
            style={{ background: "var(--bg-input-alt)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
          />
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative flex items-center w-[72px] h-8 rounded-full p-0.5 transition-all duration-300"
              style={{
                background: isDark ? "linear-gradient(135deg, #312e81, #1e1b4b)" : "linear-gradient(135deg, #fef3c7, #fde68a)",
                border: `1px solid ${isDark ? "#4338ca" : "#f59e0b"}`,
              }}
              title={isDark ? "Przełącz na jasny" : "Przełącz na ciemny"}
            >
              <div
                className="absolute w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md"
                style={{
                  left: isDark ? "calc(100% - 30px)" : "2px",
                  background: isDark ? "#1e1b4b" : "#ffffff",
                  color: isDark ? "#fbbf24" : "#f59e0b",
                }}
              >
                {isDark ? <MoonIcon /> : <SunIcon />}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider transition-all duration-300"
                style={{
                  marginLeft: isDark ? "6px" : "auto",
                  marginRight: isDark ? "auto" : "6px",
                  color: isDark ? "#a5b4fc" : "#92400e",
                }}>
                {isDark ? "Dark" : "Light"}
              </span>
            </button>

            <button
              onClick={() => router.push("/dashboard/new-product")}
              className="px-5 py-2 rounded-xl font-semibold text-white
                bg-gradient-to-r from-purple-500 to-indigo-500
                shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"
            >
              + Dodaj produkt
            </button>

            {/* AVATAR */}
            <div
              onClick={() => setOpen(!open)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500
                flex items-center justify-center font-bold text-white cursor-pointer
                shadow-md hover:scale-110 transition"
            >
              {initial}
            </div>
          </div>
        </div>

        {/* DROPDOWN */}
        {open && (
          <div ref={dropdownRef} className="absolute right-8 top-16 w-[260px] rounded-xl shadow-xl border p-3 z-50"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-dropdown)" }}>
            <div className="px-3 py-2 border-b mb-2" style={{ borderColor: "var(--border-light)" }}>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{user?.email}</div>
            </div>
            <div className="flex flex-col text-sm">
              <div
                onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                ⚙️ Ustawienia
              </div>
              <div
                onClick={confirmLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 cursor-pointer transition"
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(127,29,29,0.3)" : "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                🚪 Wyloguj
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="p-8 max-w-[1100px] mx-auto">
          {children}
        </div>
      </div>

      {/* LOGOUT MODAL */}
      {logoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setLogoutModal(false)}
        >
          <div
            className="relative w-full max-w-[360px] rounded-2xl p-7 shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
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
              Wylogować się?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Twoja sesja zostanie zakończona. Będziesz musiał zalogować się ponownie.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition hover:bg-white/5"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                Anuluj
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition
                  bg-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 active:scale-95"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
