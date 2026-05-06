"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "../../LangContext";
import {
  canViewBillingStats,
  parseDashboardUser,
  type DashboardUser,
} from "../../nav-helpers";
import {
  BILLING_STATS_SORT_FIELDS,
  buildBillingStatsQuery,
  getBillingStatsFilterSummary,
  getBillingStatsThemeClasses,
  type BillingStatsSortBy,
  type BillingStatsSortDir,
} from "./page-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type BillingStatsRow = {
  sellerId: number;
  name: string;
  email: string;
  company: string;
  creditBalance: number;
  paidCreditsGranted: number;
  lifetimeCreditsPurchased: number;
  lifetimeCreditsUsed: number;
  revenueCents: number;
  paidCredits: number;
  paymentsCount: number;
  creditsUsed: number;
  usageEvents: number;
  lastPaymentAt: string | null;
};

type BillingStatsResponse = {
  success?: boolean;
  data?: {
    month: { value: string; start: string; end: string };
    summary: {
      revenueCents: number;
      paidCredits: number;
      paymentsCount: number;
      creditsUsed: number;
      usageEvents: number;
      activeSellers: number;
    };
    rows: BillingStatsRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    filters: { search: string; sortBy: BillingStatsSortBy; sortDir: BillingStatsSortDir };
  };
  error?: string;
};

const EMPTY_DATA: NonNullable<BillingStatsResponse["data"]> = {
  month: { value: "", start: "", end: "" },
  summary: {
    revenueCents: 0,
    paidCredits: 0,
    paymentsCount: 0,
    creditsUsed: 0,
    usageEvents: 0,
    activeSellers: 0,
  },
  rows: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: { search: "", sortBy: "revenue", sortDir: "desc" },
};

const COPY = {
  pl: {
    eyebrow: "Admin",
    title: "Statystyki billingowe",
    subtitle: "Miesieczne przychody, wplacone pakiety i zuzycie kredytow per sprzedawca.",
    noAccess: "Brak uprawnien do statystyk billingowych.",
    month: "Miesiac",
    searchPlaceholder: "Szukaj seller, email lub firma",
    search: "Szukaj",
    searchFilter: "Fraza",
    clear: "Wyczysc",
    filters: "Filtry",
    sort: "Sortowanie",
    sortBy: "Sortuj po",
    direction: "Kierunek",
    sortLabels: {
      seller: "Sprzedawca",
      balance: "Saldo",
      revenue: "Przychod",
      paidCredits: "Wplacone kredyty",
      creditsUsed: "Zuzyte kredyty",
      payments: "Platnosci",
      lifetimePurchased: "Lifetime kupione",
      lifetimeUsed: "Lifetime zuzyte",
      lastPayment: "Ostatnia platnosc",
    },
    sortDirections: {
      desc: "malejaco",
      asc: "rosnaco",
    },
    revenue: "Przychod",
    paidCredits: "Wplacone kredyty",
    usedCredits: "Zuzyte kredyty",
    activeSellers: "Aktywni sellerzy",
    payments: "Platnosci",
    seller: "Sprzedawca",
    balance: "Saldo",
    lifetime: "Lifetime",
    lastPayment: "Ostatnia platnosc",
    empty: "Brak danych dla wybranego miesiaca.",
    loading: "Ladowanie statystyk...",
    failed: "Nie udalo sie pobrac statystyk.",
    page: "Strona",
    of: "z",
    previous: "Poprzednia",
    next: "Nastepna",
  },
  en: {
    eyebrow: "Admin",
    title: "Billing stats",
    subtitle: "Monthly revenue, purchased packs, and credit usage per seller.",
    noAccess: "Missing billing stats permission.",
    month: "Month",
    searchPlaceholder: "Search seller, email, or company",
    search: "Search",
    searchFilter: "Search",
    clear: "Clear",
    filters: "Filters",
    sort: "Sorting",
    sortBy: "Sort by",
    direction: "Direction",
    sortLabels: {
      seller: "Seller",
      balance: "Balance",
      revenue: "Revenue",
      paidCredits: "Paid credits",
      creditsUsed: "Used credits",
      payments: "Payments",
      lifetimePurchased: "Lifetime purchased",
      lifetimeUsed: "Lifetime used",
      lastPayment: "Last payment",
    },
    sortDirections: {
      desc: "descending",
      asc: "ascending",
    },
    revenue: "Revenue",
    paidCredits: "Paid credits",
    usedCredits: "Used credits",
    activeSellers: "Active sellers",
    payments: "Payments",
    seller: "Seller",
    balance: "Balance",
    lifetime: "Lifetime",
    lastPayment: "Last payment",
    empty: "No data for selected month.",
    loading: "Loading stats...",
    failed: "Failed to load stats.",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
  },
} as const;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}

function getStoredUser() {
  return typeof window !== "undefined" ? parseDashboardUser(localStorage.getItem("user")) : null;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format((Number(value) || 0) / 100);
}

function number(value: number) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function AdminBillingStatsPage() {
  const { lang } = useLang();
  const copy = COPY[lang];
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [month, setMonth] = useState(getCurrentMonth);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [sortBy, setSortBy] = useState<BillingStatsSortBy>("revenue");
  const [sortDir, setSortDir] = useState<BillingStatsSortDir>("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasAccess = canViewBillingStats(currentUser);
  const themeClasses = getBillingStatsThemeClasses();
  const query = useMemo(() => {
    return buildBillingStatsQuery({
      month,
      page,
      limit: 50,
      search: submittedSearch,
      sortBy,
      sortDir,
    });
  }, [month, page, submittedSearch, sortBy, sortDir]);

  const activeFilters = useMemo(() => (
    getBillingStatsFilterSummary(
      { month, search: submittedSearch, sortBy, sortDir },
      {
        month: copy.month,
        search: copy.searchFilter,
        sort: copy.sort,
        sortLabels: copy.sortLabels,
        sortDirections: copy.sortDirections,
      },
    )
  ), [copy, month, submittedSearch, sortBy, sortDir]);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError(copy.noAccess);
      setLoading(false);
      return;
    }

    let disposed = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/admin/billing-stats?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as BillingStatsResponse;
        if (!res.ok || json.success === false || !json.data) {
          throw new Error(json.error || copy.failed);
        }
        if (!disposed) {
          setData(json.data);
          setError("");
        }
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : copy.failed);
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, [copy.failed, copy.noAccess, query]);

  const submitSearch = () => {
    setSubmittedSearch(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSubmittedSearch("");
    setSortBy("revenue");
    setSortDir("desc");
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > data.pagination.totalPages) return;
    setPage(nextPage);
  };

  if (currentUser && !hasAccess) {
    return (
      <main className={themeClasses.accessPage}>
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-sm font-semibold text-amber-900 [html.dark_&]:border-amber-500/30 [html.dark_&]:bg-amber-500/10 [html.dark_&]:text-amber-200">
          {copy.noAccess}
        </div>
      </main>
    );
  }

  return (
    <main className={themeClasses.page}>
      <section className={themeClasses.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={themeClasses.eyebrow}>{copy.eyebrow}</div>
            <h1 className={themeClasses.title}>{copy.title}</h1>
            <p className={themeClasses.subtitle}>{copy.subtitle}</p>
          </div>
          <label className={themeClasses.label}>
            {copy.month}
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value || getCurrentMonth());
                setPage(1);
              }}
              className={themeClasses.input}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.revenue} value={money(data.summary.revenueCents)} tone="border-emerald-300 bg-emerald-50 text-emerald-950 [html.dark_&]:border-emerald-500/30 [html.dark_&]:bg-emerald-500/10 [html.dark_&]:text-emerald-200" />
        <MetricCard label={copy.paidCredits} value={number(data.summary.paidCredits)} tone="border-sky-300 bg-sky-50 text-sky-950 [html.dark_&]:border-sky-500/30 [html.dark_&]:bg-sky-500/10 [html.dark_&]:text-sky-200" />
        <MetricCard label={copy.usedCredits} value={number(data.summary.creditsUsed)} tone="border-violet-300 bg-violet-50 text-violet-950 [html.dark_&]:border-violet-500/30 [html.dark_&]:bg-violet-500/10 [html.dark_&]:text-violet-200" />
        <MetricCard label={copy.activeSellers} value={number(data.summary.activeSellers)} tone="border-amber-300 bg-amber-50 text-amber-950 [html.dark_&]:border-amber-500/30 [html.dark_&]:bg-amber-500/10 [html.dark_&]:text-amber-200" />
      </section>

      <section className={themeClasses.panel}>
        <div className={themeClasses.panelHeader}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder={copy.searchPlaceholder}
                className={themeClasses.searchInput}
              />
              <div className="flex gap-2">
                <button onClick={submitSearch} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
                  {copy.search}
                </button>
                <button onClick={clearSearch} className={themeClasses.secondaryButton}>
                  {copy.clear}
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[26rem]">
              <label className={themeClasses.compactLabel}>
                {copy.sortBy}
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as BillingStatsSortBy);
                    setPage(1);
                  }}
                  className={themeClasses.select}
                >
                  {BILLING_STATS_SORT_FIELDS.map((field) => (
                    <option key={field} value={field}>{copy.sortLabels[field]}</option>
                  ))}
                </select>
              </label>
              <label className={themeClasses.compactLabel}>
                {copy.direction}
                <select
                  value={sortDir}
                  onChange={(event) => {
                    setSortDir(event.target.value as BillingStatsSortDir);
                    setPage(1);
                  }}
                  className={themeClasses.select}
                >
                  <option value="desc">{copy.sortDirections.desc}</option>
                  <option value="asc">{copy.sortDirections.asc}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className={themeClasses.filterLabel}>{copy.filters}</span>
              {activeFilters.map((filter) => (
                <span key={filter.key} className={themeClasses.filterPill}>
                  <span className={themeClasses.filterPillLabel}>{filter.label}:</span> {filter.value}
                </span>
              ))}
            </div>
            <div className={themeClasses.pageText}>
              {copy.page} {data.pagination.page} {copy.of} {data.pagination.totalPages}
            </div>
          </div>
        </div>

        {error && <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={themeClasses.tableHeader}>
              <tr>
                <th className="px-4 py-3">{copy.seller}</th>
                <th className="px-4 py-3">{copy.balance}</th>
                <th className="px-4 py-3">{copy.revenue}</th>
                <th className="px-4 py-3">{copy.paidCredits}</th>
                <th className="px-4 py-3">{copy.usedCredits}</th>
                <th className="px-4 py-3">{copy.payments}</th>
                <th className="px-4 py-3">{copy.lifetime}</th>
                <th className="px-4 py-3">{copy.lastPayment}</th>
              </tr>
            </thead>
            <tbody className={themeClasses.tableBody}>
              {loading ? (
                <tr>
                  <td colSpan={8} className={themeClasses.emptyCell}>{copy.loading}</td>
                </tr>
              ) : data.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.sellerId} className={themeClasses.tableRow}>
                    <td className="px-4 py-4">
                      <div className={themeClasses.sellerName}>{row.name || row.email}</div>
                      <div className={themeClasses.sellerMeta}>{row.email}</div>
                      <div className={themeClasses.sellerCompany}>{row.company || "-"}</div>
                    </td>
                    <td className={themeClasses.strongCell}>{number(row.creditBalance)}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-600 [html.dark_&]:text-emerald-300">{money(row.revenueCents)}</td>
                    <td className="px-4 py-4">{number(row.paidCredits)}</td>
                    <td className="px-4 py-4">{number(row.creditsUsed)}</td>
                    <td className="px-4 py-4">{number(row.paymentsCount)}</td>
                    <td className={themeClasses.mutedCell}>
                      +{number(row.lifetimeCreditsPurchased)} / -{number(row.lifetimeCreditsUsed)}
                    </td>
                    <td className={themeClasses.mutedCell}>{dateTime(row.lastPaymentAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={themeClasses.emptyCell}>{copy.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={themeClasses.pagination}>
          <button
            onClick={() => goToPage(data.pagination.page - 1)}
            aria-disabled={!data.pagination.hasPrevPage || loading}
            className={`${themeClasses.pagerButton} ${
              data.pagination.hasPrevPage && !loading ? themeClasses.pagerButtonEnabled : themeClasses.pagerButtonDisabled
            }`}
          >
            {copy.previous}
          </button>
          <button
            onClick={() => goToPage(data.pagination.page + 1)}
            aria-disabled={!data.pagination.hasNextPage || loading}
            className={`${themeClasses.pagerButton} ${
              data.pagination.hasNextPage && !loading ? themeClasses.pagerButtonEnabled : themeClasses.pagerButtonDisabled
            }`}
          >
            {copy.next}
          </button>
        </div>
      </section>
    </main>
  );
}
