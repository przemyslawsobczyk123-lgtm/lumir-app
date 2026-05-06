"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchBillingSummary, formatCredits, type BillingSummary } from "./billing/billing-data";
import { fetchActiveJobs, formatJobDuration, jobTypeLabel, jobStepLabel, type SellerJob } from "./jobs/job-client";
import { LangProvider, useLang } from "./LangContext";
import { translations } from "./i18n";
import { getDashboardSessionRefreshKey, getImpersonationBannerClasses } from "./layout-helpers";
import { isAmazonUiEnabled, withoutAmazonWhenDisabled } from "./mvp-feature-flags";
import {
  getDashboardNavItemClass,
  getDashboardNavItems,
  parseDashboardUser,
} from "./nav-helpers";
import {
  clearAdminOriginalSession,
  getImpersonationSessionFromSnapshot,
  getImpersonationSessionSnapshot,
  stopSellerImpersonation,
} from "./admin/sellers/admin-sellers-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const AMAZON_UI_ENABLED = isAmazonUiEnabled();

const MARKETPLACES = withoutAmazonWhenDisabled([
  { slug: "mediaexpert", label: "Media Expert" },
  { slug: "allegro",     label: "Allegro"       },
  { slug: "amazon",      label: "Amazon"        },
  { slug: "empik",       label: "Empik"          },
], (item) => item.slug);

type AllegroAccountSidebar = {
  id: number;
  environment: "production" | "sandbox";
  allegro_login: string | null;
  status: "valid" | "expired";
  minutesLeft: number;
};

type AmazonAccountSidebar = {
  id: number;
  status: "valid" | "expired";
};

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

function getDashboardImpersonationSnapshot() {
  return getImpersonationSessionSnapshot();
}

function getDashboardServerImpersonationSnapshot() {
  return "";
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

function readUserLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "";
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
  const [contactOpen, setContactOpen] = useState(false);
  const [contactType, setContactType] = useState<"suggestion"|"meeting"|"issue"|null>(null);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<HTMLDivElement>(null);
  const userRaw = useSyncExternalStore(subscribeDashboardSnapshot, getDashboardUserSnapshot, getDashboardServerUserSnapshot);
  const user = parseDashboardUser(userRaw);
  const impersonationRaw = useSyncExternalStore(
    subscribeDashboardSnapshot,
    getDashboardImpersonationSnapshot,
    getDashboardServerImpersonationSnapshot,
  );
  const impersonationSession = getImpersonationSessionFromSnapshot(impersonationRaw);
  const impersonatedName = readUserLabel(impersonationSession?.currentUser?.name);
  const impersonatedEmail = readUserLabel(impersonationSession?.currentUser?.email);
  const sessionRefreshKey = getDashboardSessionRefreshKey(userRaw, impersonationRaw);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<SellerJob[]>([]);

  // Allegro per-seller account (status only — management is on dedicated page)
  const [allegroAccounts, setAllegroAccounts] = useState<AllegroAccountSidebar[]>([]);
  const [amazonAccounts, setAmazonAccounts] = useState<AmazonAccountSidebar[]>([]);

  const loadAllegroAccounts = useCallback(() => {
    const tk = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    fetch(`${API}/api/seller/allegro/accounts`, { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => { if (j.data) setAllegroAccounts(j.data); })
      .catch(() => {});
  }, []);

  const loadAmazonAccounts = useCallback((triggerRefresh = false) => {
    const tk = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    const headers = { Authorization: `Bearer ${tk}` };

    const load = () =>
      fetch(`${API}/api/seller/amazon/accounts`, { headers })
        .then(r => r.json())
        .then(j => {
          if (Array.isArray(j.data)) {
            setAmazonAccounts(j.data);
          }
        })
        .catch(() => {});

    if (triggerRefresh) {
      return fetch(`${API}/api/seller/amazon/accounts/refresh`, {
        method: "POST",
        headers,
      })
        .catch(() => {})
        .then(load);
    }

    return load();
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
    if (AMAZON_UI_ENABLED) loadAmazonAccounts();
    loadBillingSummary();
  }, [loadAllegroAccounts, loadAmazonAccounts, loadBillingSummary, router, sessionRefreshKey]);

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
  }, [sessionRefreshKey]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Refresh Allegro status after OAuth on dedicated page
  useEffect(() => {
    if (!AMAZON_UI_ENABLED) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "allegro-auth") return;
      if (e.data.success) loadAllegroAccounts();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadAllegroAccounts]);

  // Refresh Amazon status after OAuth on dedicated page
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "amazon-auth") return;
      if (e.data.success) loadAmazonAccounts(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadAmazonAccounts]);

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
    clearAdminOriginalSession();
    router.push("/login");
  }

  function confirmLogout() {
    setLogoutModal(true);
    setOpen(false);
  }

  async function sendContact() {
    if (!contactType || contactMsg.trim().length < 10) return;
    setContactSending(true);
    setContactError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: contactType, message: contactMsg.trim() }),
      });
      if (res.status === 429) { setContactError(lang === "pl" ? "Poczekaj 3 minuty przed wysłaniem kolejnej wiadomości." : "Please wait 3 minutes before sending another message."); return; }
      if (!res.ok) { setContactError(lang === "pl" ? "Nie udało się wysłać. Spróbuj ponownie." : "Failed to send. Please try again."); return; }
      setContactDone(true);
      setContactMsg("");
      setContactType(null);
    } catch {
      setContactError(lang === "pl" ? "Błąd sieci. Spróbuj ponownie." : "Network error. Please try again.");
    } finally {
      setContactSending(false);
    }
  }

  const isDark = theme === "dark";

  const NAV_ITEMS = getDashboardNavItems(t.nav, user);
  const impersonatedLabel = impersonatedName || impersonatedEmail || (lang === "pl" ? "sprzedawca" : "seller");
  const impersonationBannerClasses = getImpersonationBannerClasses();

  function returnToAdmin() {
    const restored = stopSellerImpersonation();
    if (!restored) return;
    router.push("/dashboard/admin/sellers");
  }

  return (
    <div className="flex min-h-screen font-[Inter]" style={{ background: "var(--bg-body)" }}>

      {/* SIDEBAR */}
      <div className="w-[220px] text-white p-5 fixed h-full flex flex-col overflow-y-auto"
        style={{ background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-2.5 mb-10">
          <Image src="/lumir-icon.svg" alt="LuMir" width={36} height={36} className="h-9 w-9 rounded-xl flex-shrink-0" />
          <span className="text-[22px] font-semibold tracking-wide text-white">
            LuMir
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {NAV_ITEMS.map(({ href, label, exact, icon, tone }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <div key={href}
                onClick={() => router.push(href)}
                className={getDashboardNavItemClass(active, tone)}>
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
                const isAmazon   = slug === "amazon";
                const isExpanded = expandedMp === slug;
                const hasAny     = isAllegro && allegroAccounts.length > 0;
                const hasAmazon  = isAmazon && amazonAccounts.length > 0;
                const validCount = isAllegro
                  ? allegroAccounts.filter(a => a.status === "valid").length
                  : isAmazon
                    ? amazonAccounts.filter(a => a.status === "valid").length
                    : 0;
                const sellerCount = isAllegro
                  ? allegroAccounts.length
                  : isAmazon
                    ? amazonAccounts.length
                    : 0;

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
                        {(isAllegro && hasAny) || (isAmazon && hasAmazon) ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        ) : null}
                        {((isAllegro && hasAny) || (isAmazon && hasAmazon)) && (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                            {sellerCount}
                          </span>
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
                          {t.sidebar.categoryIntegrations}
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

                        {isAmazon && hasAmazon && (
                          <div className="px-3 py-1.5 text-xs rounded-lg border-l-2 border-white/10 pl-3 flex items-center gap-2 text-slate-400 hover:bg-white/5">
                            <div className="w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0 text-white font-black text-[7px]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>A</div>
                            <span>Amazon seller accounts</span>
                            <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${validCount > 0 ? "bg-green-400" : "bg-amber-400"}`} />
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
          {impersonationSession && (
          <div className={impersonationBannerClasses.container}>
            <div className="min-w-0">
              <span className={impersonationBannerClasses.eyebrow}>
                {lang === "pl" ? "Impersonacja" : "Impersonating"}
              </span>
              <span className={impersonationBannerClasses.identity}>
                {impersonatedLabel}
                {impersonatedEmail && impersonatedEmail !== impersonatedLabel ? ` (${impersonatedEmail})` : ""}
              </span>
            </div>
            <button
              onClick={returnToAdmin}
              className={impersonationBannerClasses.button}
            >
              {lang === "pl" ? "Wroc do admina" : "Return to admin"}
            </button>
          </div>
        )}

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
                    <div className="flex gap-2">
                      {activeJobs.length > 0 && (
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/jobs/clear-stuck`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setActiveJobs([]);
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold transition"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                        >
                          Wyczyść
                        </button>
                      )}
                      <button
                        onClick={() => setJobsOpen(false)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold transition"
                        style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
                      >
                        {t.topbar.tasksClose}
                      </button>
                    </div>
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
                        <div className="flex items-center justify-between gap-3 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          <span>{jobTypeLabel(job.type)}</span>
                          <span style={{ color: "var(--text-tertiary)" }}>{job.progressPercent}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-input)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${job.progressPercent}%`, background: "linear-gradient(90deg, #f59e0b, #f97316)" }}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          <span>{jobStepLabel(job.currentStep, job.currentMessage, job.status)}</span>
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
              {/* Settings */}
              <div
                onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                {t.dropdown.settings}
              </div>

              {/* Separator: settings / utilities */}
              <div className="my-1 border-t" style={{ borderColor: "var(--border-light)" }} />

              {/* Contact */}
              <div
                onClick={() => { setOpen(false); setContactOpen(true); setContactDone(false); setContactError(""); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                {lang === "pl" ? "Kontakt" : "Contact"}
              </div>

              {/* Theme toggle row */}
              <div
                onClick={toggleTheme}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: isDark ? "#fbbf24" : "#6366f1" }} className="shrink-0">
                  {isDark ? <MoonIcon /> : <SunIcon />}
                </span>
                <span>{isDark ? t.topbar.dark : t.topbar.light}</span>
              </div>

              {/* Language toggle row */}
              <div
                onClick={() => { setLang(lang === "pl" ? "en" : "pl"); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="flex-1">{lang === "pl" ? "Polski" : "English"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-primary-light, rgba(99,102,241,0.12))", color: "var(--accent-primary)" }}>
                  {lang === "pl" ? "EN" : "PL"}
                </span>
              </div>

              {/* Separator: preferences / destructive */}
              <div className="my-1 border-t" style={{ borderColor: "var(--border-light)" }} />

              {/* Logout */}
              <div
                onClick={confirmLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 cursor-pointer transition"
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(127,29,29,0.3)" : "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
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
      {/* CONTACT MODAL */}
      {contactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setContactOpen(false)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-2xl p-7 shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition hover:opacity-70"
              style={{ color: "var(--text-tertiary)", background: "var(--bg-card-hover)" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {contactDone ? (
              /* Success state */
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  {lang === "pl" ? "Wiadomość wysłana!" : "Message sent!"}
                </h3>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  {lang === "pl" ? "Odpiszemy na Twój adres email tak szybko jak to możliwe." : "We'll reply to your email address as soon as possible."}
                </p>
                <button
                  onClick={() => setContactOpen(false)}
                  className="px-6 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {lang === "pl" ? "Zamknij" : "Close"}
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  {lang === "pl" ? "Skontaktuj się z nami" : "Get in touch"}
                </h3>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  {lang === "pl" ? "Wybierz temat i napisz wiadomość." : "Choose a topic and write your message."}
                </p>

                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {([
                    {
                      key: "suggestion",
                      pl: "Sugestia", en: "Suggestion",
                      plSub: "Podziel się pomysłem", enSub: "Share an idea",
                      color: "#8b5cf6",
                      bg: "rgba(139,92,246,0.08)",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      ),
                    },
                    {
                      key: "meeting",
                      pl: "Spotkanie", en: "Meeting",
                      plSub: "Umów konsultację", enSub: "Book a call",
                      color: "#0ea5e9",
                      bg: "rgba(14,165,233,0.08)",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                          <rect x="3" y="4" width="18" height="18" rx="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      ),
                    },
                    {
                      key: "issue",
                      pl: "Problem", en: "Issue",
                      plSub: "Coś nie działa", enSub: "Something's wrong",
                      color: "#f59e0b",
                      bg: "rgba(245,158,11,0.08)",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      ),
                    },
                  ] as const).map(opt => {
                    const active = contactType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setContactType(opt.key)}
                        className="flex flex-col items-center gap-2 px-2 py-4 rounded-xl border-2 transition text-center"
                        style={{
                          borderColor: active ? opt.color : "var(--border-default)",
                          background: active ? opt.bg : "transparent",
                          color: active ? opt.color : "var(--text-secondary)",
                        }}
                      >
                        <span style={{ color: active ? opt.color : "var(--text-tertiary)" }}>{opt.icon}</span>
                        <span className="text-xs font-semibold leading-tight" style={{ color: active ? opt.color : "var(--text-primary)" }}>
                          {lang === "pl" ? opt.pl : opt.en}
                        </span>
                        <span className="text-[10px] leading-tight" style={{ color: "var(--text-tertiary)" }}>
                          {lang === "pl" ? opt.plSub : opt.enSub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Message textarea */}
                <textarea
                  value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder={lang === "pl" ? "Opisz szczegółowo…" : "Describe in detail…"}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none border transition"
                  style={{
                    background: "var(--bg-input, var(--bg-card-hover))",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                <div className="text-xs text-right mt-1 mb-4" style={{ color: "var(--text-tertiary)" }}>
                  {contactMsg.length}/2000
                </div>

                {contactError && (
                  <p className="text-xs text-red-500 mb-3">{contactError}</p>
                )}

                <button
                  onClick={sendContact}
                  disabled={!contactType || contactMsg.trim().length < 10 || contactSending}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {contactSending
                    ? (lang === "pl" ? "Wysyłanie…" : "Sending…")
                    : (lang === "pl" ? "Wyślij wiadomość" : "Send message")}
                </button>
                <p className="text-center text-[11px] mt-3" style={{ color: "var(--text-tertiary)" }}>
                  {lang === "pl" ? "Możesz wysłać wiadomość co 3 minuty." : "You can send a message every 3 minutes."}
                </p>
              </>
            )}
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
