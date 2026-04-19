"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchBillingSummary, formatCredits, type BillingSummary } from "./billing/billing-data";
import { fetchActiveJobs, formatJobDuration, type SellerJob } from "./jobs/job-client";
import { LangProvider, useLang } from "./LangContext";
import { translations } from "./i18n";

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

type DashboardUser = {
  name?: string;
  email?: string;
};

function parseStoredUser(raw: string): DashboardUser | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    return {
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      email: typeof candidate.email === "string" ? candidate.email : undefined,
    };
  } catch {
    return null;
  }
}

function getDashboardUserSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("user");
  } catch {
    return null;
  }
}

function getDashboardServerUserSnapshot(): string | null {
  return null;
}

function subscribeDashboardSnapshot(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("lumir-dashboard-storage", handler as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("lumir-dashboard-storage", handler as EventListener);
  };
}

// ¦¦ Theme icons ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
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

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const t = translations[lang];
  const [open, setOpen] = useState(false);
  const [expandedMp, setExpandedMp] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      return localStorage.getItem("lumir-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [logoutModal, setLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<HTMLDivElement>(null);
  const userRaw = useSyncExternalStore(subscribeDashboardSnapshot, getDashboardUserSnapshot, getDashboardServerUserSnapshot);
  const user = userRaw ? parseStoredUser(userRaw) : null;
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<SellerJob[]>([]);

  // Allegro per-seller account (status only — management is on dedicated page)
  const [allegroAccounts, setAllegroAccounts] = useState<AllegroAccountSidebar[]>([]);

  const loadAllegroAccounts = useCallback(() => {
    const tk = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    fetch(`${API}/api/seller/allegro/accounts`, { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => { if (j.data) setAllegroAccounts(j.data); })
      .catch(() => {});
  }, []);

  const loadBillingSummary = useCallback(() => {
    fetchBillingSummary()
      .then((summary) => setBillingSummary(summary))
      .catch(() => setBillingSummary(null));
  }, []);

  // Load user + theme
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    loadAllegroAccounts();
    loadBillingSummary();
  }, [loadAllegroAccounts, loadBillingSummary, router]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    if (!token) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const jobs = await fetchActiveJobs(token);
        if (!cancelled) setActiveJobs(jobs);
      } catch {
        if (!cancelled) setActiveJobs([]);
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (jobsRef.current && !jobsRef.current.contains(e.target as Node)) {
        setJobsOpen(false);
      }
    }
    if (jobsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [jobsOpen]);

  const initial = [user?.name?.[0], user?.email?.[0]]
    .map(c => c?.toUpperCase())
    .find(c => c && /[A-Z]/.test(c)) ?? "U";

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

  const NAV_ITEMS = [
    { href: "/dashboard",          label: t.nav.dashboard, exact: true,  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/products", label: t.nav.products,  exact: false, icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
    { href: "/dashboard/billing",  label: t.nav.billing,   exact: false, icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { href: "/dashboard/settings", label: t.nav.settings,  exact: false, icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div className="flex min-h-screen font-[Inter]" style={{ background: "var(--bg-body)" }}>

      {/* SIDEBAR */}
      <div className="w-[220px] text-white p-5 fixed h-full flex flex-col overflow-y-auto"
        style={{ background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-2.5 mb-10">
          <Image src="/lumir-icon.svg" alt="LuMir" width={32} height={32} className="w-8 h-8 rounded-lg flex-shrink-0" />
          <span className="text-[22px] font-semibold tracking-wide text-white"
            style={{ fontFamily: "var(--font-brand), Georgia, serif", letterSpacing: "0.04em" }}>
            LuMir
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {NAV_ITEMS.map(({ href, label, exact, icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <div key={href}
                onClick={() => router.push(href)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium cursor-pointer transition-all ${
                  active
                    ? "bg-green-500 text-white shadow-sm shadow-green-900/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
                {label}
              </div>
            );
          })}

          {billingSummary && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {t.sidebar.creditsBalance}
              </div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-xl font-semibold text-white">
                  {formatCredits(billingSummary.current?.creditsRemaining ?? billingSummary.usage.remaining ?? 0)}
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {t.sidebar.creditsAvailable}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {t.sidebar.openBilling}
              </div>
            </div>
          )}

          {/* MARKETPLACE */}
          <div className="pt-4">
            <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase px-1 mb-2">
              {t.sidebar.marketplace}
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
                          {t.sidebar.category}
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
                            <span>{t.sidebar.allegroAccounts}</span>
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
            {t.nav.logout}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="ml-[220px] w-full">

        {/* TOPBAR */}
        <div className="relative flex justify-end items-center px-8 py-4 border-b"
          style={{ background: "var(--bg-topbar)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-3">
            {/* Tasks button + dropdown */}
            <div ref={jobsRef} className="relative">
              <button
                onClick={() => setJobsOpen((value) => !value)}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)", boxShadow: "var(--shadow-card)" }}
              >
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b" }}>
                  {activeJobs.length}
                </span>
                {t.topbar.tasks}
              </button>

              {jobsOpen && (
                <div
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-[340px] rounded-2xl border p-4 shadow-2xl"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {t.topbar.tasksTitle}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {t.topbar.tasksSubtitle}
                      </div>
                    </div>
                    <button
                      onClick={() => setJobsOpen(false)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold transition"
                      style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
                    >
                      {t.topbar.tasksClose}
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {activeJobs.length === 0 ? (
                      <div
                        className="rounded-xl border px-3 py-4 text-center text-sm"
                        style={{ borderColor: "var(--border-default)", background: "var(--bg-body)", color: "var(--text-tertiary)" }}
                      >
                        {t.topbar.tasksEmpty}
                      </div>
                    ) : activeJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border p-3"
                        style={{ borderColor: "var(--border-default)", background: "var(--bg-body)" }}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          <span>{job.label || job.type}</span>
                          <span>{job.progressPercent}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-input)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${job.progressPercent}%`, background: "linear-gradient(90deg, #f59e0b, #f97316)" }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          <span>{job.currentStep || job.status}</span>
                          <span>•</span>
                          <span>{formatJobDuration(job.elapsedSeconds)}</span>
                          {job.etaSeconds != null && (
                            <>
                              <span>•</span>
                              <span>ETA {formatJobDuration(job.etaSeconds)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {billingSummary && (
              <button
                onClick={() => router.push("/dashboard/billing")}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)", boxShadow: "var(--shadow-card)" }}
              >
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)" }}>
                  {formatCredits(billingSummary.current?.creditsRemaining ?? billingSummary.usage.remaining ?? 0)}
                </span>
                {t.nav.billing}
              </button>
            )}

            {/* Language switcher */}
            <button
              onClick={() => setLang(lang === "pl" ? "en" : "pl")}
              className="rounded-xl px-3 py-2 text-xs font-bold tracking-widest uppercase transition hover:opacity-80"
              style={{ background: "var(--accent-primary)", color: "#fff", border: "none", letterSpacing: "0.08em" }}
            >
              {lang === "pl" ? "EN" : "PL"}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative flex items-center w-[72px] h-8 rounded-full p-0.5 transition-all duration-300"
              style={{
                background: isDark ? "linear-gradient(135deg, #312e81, #1e1b4b)" : "linear-gradient(135deg, #fef3c7, #fde68a)",
                border: `1px solid ${isDark ? "#4338ca" : "#f59e0b"}`,
              }}
              title={isDark ? t.topbar.themeLight : t.topbar.themeDark}
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
                {isDark ? t.topbar.dark : t.topbar.light}
              </span>
            </button>

            <button
              onClick={() => router.push("/dashboard/new-product")}
              className="px-5 py-2 rounded-xl font-semibold text-white
                bg-gradient-to-r from-purple-500 to-indigo-500
                shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"
            >
              {t.topbar.addProduct}
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
                {t.dropdown.settings}
              </div>
              <div
                onClick={confirmLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 cursor-pointer transition"
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(127,29,29,0.3)" : "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {t.dropdown.logout}
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
              {t.logoutModal.title}
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              {t.logoutModal.body}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition hover:bg-white/5"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                {t.logoutModal.cancel}
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition
                  bg-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 active:scale-95"
              >
                {t.logoutModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </LangProvider>
  );
}
