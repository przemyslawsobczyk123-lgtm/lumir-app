"use client";

import { useEffect, useState } from "react";
import {
  createBillingCheckout,
  fetchBillingHistory,
  fetchBillingSummary,
  formatCredits,
  formatDateTime,
  formatPricePln,
  formatUnitPricePln,
  type BillingHistoryEntry,
  type BillingHistoryResult,
  type BillingPack,
  type BillingSummary,
} from "./billing-data";
import {
  filterBillingHistoryItems,
  getBillingHistoryFilterCounts,
  getBillingRefreshDelays,
  getCheckoutResultFromSearch,
  getRetryableBillingIssues,
  type BillingHistoryFilter,
  type CheckoutResult,
  type RetryableBillingIssue,
} from "./page-helpers";
import {
  getBillingHistorySourceMeta,
  getBillingHistoryStatusMeta,
} from "./ui-helpers";
import { useLang } from "../LangContext";
import { translations } from "../i18n";

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

const BILLING_PAGE_COPY = {
  pl: {
    checkoutSuccessTitle: "Platnosc wraca ze Stripe",
    checkoutSuccessBody: "Odswiezam saldo i historie kilka razy, zeby webhook zdazyl zapisac doladowanie.",
    checkoutCancelTitle: "Checkout anulowany",
    checkoutCancelBody: "Saldo bez zmian. Mozesz od razu sprobowac ponownie.",
    historyCountOne: "wpis",
    historyCountMany: "wpisow",
    historyFilterLabel: "Filtr statusu",
    historyFilterAll: "Wszystkie",
    historyFilterPaid: "Oplacone",
    historyFilterFailed: "Bledy",
    historyFilterExpired: "Wygasle",
    historyFilterGranted: "Starter",
    historyFilterPending: "Oczekuje",
    historyEmptyFiltered: "Brak pozycji dla wybranego filtra.",
    auditEyebrow: "Audit",
    auditTitle: "Problemy z checkoutem",
    auditDesc: "Nieudane i wygasle checkouty mozesz wznowic jednym kliknieciem.",
    auditRetry: "Ponow zakup",
    auditPack: "Pakiet",
    auditSession: "Sesja",
    auditStatus: "Status",
  },
  en: {
    checkoutSuccessTitle: "Stripe payment return detected",
    checkoutSuccessBody: "Refreshing balance and history a few times so the webhook can persist the top-up.",
    checkoutCancelTitle: "Checkout cancelled",
    checkoutCancelBody: "Balance stays unchanged. You can retry right away.",
    historyCountOne: "entry",
    historyCountMany: "entries",
    historyFilterLabel: "Status filter",
    historyFilterAll: "All",
    historyFilterPaid: "Paid",
    historyFilterFailed: "Failed",
    historyFilterExpired: "Expired",
    historyFilterGranted: "Starter",
    historyFilterPending: "Pending",
    historyEmptyFiltered: "No rows for selected filter.",
    auditEyebrow: "Audit",
    auditTitle: "Checkout issues",
    auditDesc: "Failed and expired checkouts can be resumed with one click.",
    auditRetry: "Retry purchase",
    auditPack: "Package",
    auditSession: "Session",
    auditStatus: "Status",
  },
} as const;

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl p-5 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)" }}>{label}</div>
      <div className="mt-3 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{value}</div>
      <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{hint}</div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--accent-primary)" }}>{eyebrow}</div>
      <h2 className="text-2xl font-semibold" style={{ color: "var(--text-heading)" }}>{title}</h2>
      <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{description}</p>
    </div>
  );
}

function PackCard({
  pack,
  loading,
  onBuy,
}: {
  pack: BillingPack;
  loading: boolean;
  onBuy: (credits: number) => void;
}) {
  const { lang } = useLang();
  const t = translations[lang].billing;

  const fullAuctions = Math.floor(pack.credits);
  const descriptions = Math.floor(pack.credits / 0.67);
  const attributes = Math.floor(pack.credits / 0.33);

  const fullPriceCents = pack.credits * 550;
  const savingsCents = fullPriceCents - pack.amountCents;
  const savingsPct = Math.round((savingsCents / fullPriceCents) * 100);
  const hasSavings = savingsPct > 0;

  return (
    <div
      className={`rounded-3xl p-5 transition ${pack.featured ? "shadow-[0_0_0_2px_rgba(99,102,241,0.3)]" : ""}`}
      style={{
        background: pack.featured
          ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))"
          : "var(--bg-card)",
        border: pack.featured ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)" }}>{t.packLabel}</div>
          <div className="mt-1 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(pack.credits)}</div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{t.packCredits}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--bg-input-alt)", color: "var(--text-secondary)" }}>
            {pack.featured ? t.packPopular : t.packPrepaid}
          </span>
          {hasSavings ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={pack.featured ? {
                background: "rgba(16,185,129,0.2)",
                color: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.25)",
              } : {
                background: "rgba(16,185,129,0.12)",
                color: "#059669",
              }}
            >
              -{savingsPct}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>{t.packPrice}</div>
        {hasSavings ? (
          <div className="mt-2 text-sm line-through opacity-50" style={{ color: "var(--text-tertiary)" }}>
            {formatPricePln(fullPriceCents)}
          </div>
        ) : null}
        <div className={`font-semibold text-3xl ${hasSavings ? "mt-0.5" : "mt-2"}`} style={{ color: "var(--text-heading)" }}>{formatPricePln(pack.amountCents)}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{formatUnitPricePln(pack.pricePerAuction)} {t.packPricePerAuction}</div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{t.packFullAuction}</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{fullAuctions}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{t.packDescriptions}</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(descriptions)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>{t.packAttributes}</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(attributes)}</span>
        </div>
      </div>

      <button
        onClick={() => onBuy(pack.credits)}
        aria-disabled={loading}
        className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          loading
            ? "cursor-wait opacity-60"
            : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/20"
        }`}
        style={loading ? { background: "var(--bg-input-alt)", color: "var(--text-tertiary)" } : {}}
      >
        {loading ? t.packRedirecting : t.packBuy}
      </button>
    </div>
  );
}

function HistoryRow({ item }: { item: BillingHistoryEntry }) {
  const { lang } = useLang();
  const t = translations[lang].billing;
  const statusMeta = getBillingHistoryStatusMeta(item.status, lang);

  return (
    <tr style={{ borderTop: "1px solid var(--border-default)" }}>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{formatDateTime(item.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</div>
        <div className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>{item.description || item.kind}</div>
      </td>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>{formatCredits(item.credits)}</td>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>
        {item.amount == null ? t.historyNoAmount : formatPricePln(item.amount)}
      </td>
      <td className="px-4 py-4 text-sm">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </td>
    </tr>
  );
}

function HistoryCard({ item }: { item: BillingHistoryEntry }) {
  const { lang } = useLang();
  const t = translations[lang].billing;
  const statusMeta = getBillingHistoryStatusMeta(item.status, lang);

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{item.description || item.kind}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>{t.historyColDate}</div>
          <div className="mt-1" style={{ color: "var(--text-primary)" }}>{formatDateTime(item.createdAt)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>{t.historyColCredits}</div>
          <div className="mt-1" style={{ color: "var(--text-primary)" }}>{formatCredits(item.credits)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>{t.historyColAmount}</div>
          <div className="mt-1" style={{ color: "var(--text-primary)" }}>
            {item.amount == null ? t.historyNoAmount : formatPricePln(item.amount)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>{t.historyColStatus}</div>
          <div className="mt-1" style={{ color: "var(--text-primary)" }}>{statusMeta.label}</div>
        </div>
      </div>
    </div>
  );
}

function AuditIssueCard({
  item,
  loading,
  onRetry,
}: {
  item: RetryableBillingIssue;
  loading: boolean;
  onRetry: (credits: number) => void;
}) {
  const { lang } = useLang();
  const copy = BILLING_PAGE_COPY[lang];
  const statusMeta = getBillingHistoryStatusMeta(item.status, lang);

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</div>
            <div className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>{item.description}</div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span>{copy.auditPack}: <strong style={{ color: "var(--text-primary)" }}>{formatCredits(item.packCredits)}</strong></span>
            {item.stripeSessionId ? (
              <span>{copy.auditSession}: <strong style={{ color: "var(--text-primary)" }}>{item.stripeSessionId}</strong></span>
            ) : null}
          </div>
        </div>

        <button
          onClick={() => onRetry(item.packCredits)}
          aria-disabled={loading}
          className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            loading
              ? "cursor-wait opacity-60"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/20"
          }`}
          style={loading ? { background: "var(--bg-card)", color: "var(--text-tertiary)" } : {}}
        >
          {loading ? translations[lang].billing.packRedirecting : copy.auditRetry}
        </button>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { lang } = useLang();
  const t = translations[lang].billing;
  const copy = BILLING_PAGE_COPY[lang];

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [history, setHistory] = useState<BillingHistoryResult>({ items: [], source: "unavailable" });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoadingCredits, setCheckoutLoadingCredits] = useState<number | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult>(null);
  const [activeFilter, setActiveFilter] = useState<BillingHistoryFilter>("all");

  useEffect(() => {
    let disposed = false;
    const timeouts: number[] = [];

    async function load(options: { silent?: boolean } = {}) {
      if (!options.silent) {
        setLoading(true);
        setHistoryLoading(true);
      }
      setError("");

      try {
        const [summary, ledger] = await Promise.all([
          fetchBillingSummary(),
          fetchBillingHistory(),
        ]);

        if (disposed) return;
        setBilling(summary);
        setHistory(ledger);
      } catch (err: unknown) {
        if (disposed) return;
        setError(getErrorMessage(err, "Nie udalo sie pobrac billing"));
      } finally {
        if (!disposed && !options.silent) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    }

    const nextCheckoutResult = typeof window === "undefined"
      ? null
      : getCheckoutResultFromSearch(window.location.search);
    setCheckoutResult(nextCheckoutResult);

    if (typeof window !== "undefined" && nextCheckoutResult) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    void load();

    if (typeof window !== "undefined") {
      for (const delay of getBillingRefreshDelays(nextCheckoutResult)) {
        timeouts.push(window.setTimeout(() => {
          void load({ silent: true });
        }, delay));
      }
    }

    return () => {
      disposed = true;
      for (const timeout of timeouts) window.clearTimeout(timeout);
    };
  }, []);

  const currentCredits = billing?.current?.creditBalance ?? billing?.usage.remaining ?? 0;
  const totalGranted = billing?.usage.limit ?? 0;
  const totalUsed = billing?.usage.used ?? 0;
  const starterCredits = billing?.starterCredits ?? 3;
  const sourceMeta = getBillingHistorySourceMeta(history.source, lang);
  const filterCounts = getBillingHistoryFilterCounts(history.items);
  const filteredHistory = filterBillingHistoryItems(history.items, activeFilter);
  const retryableIssues = getRetryableBillingIssues(history.items);
  const historyCountLabel = filteredHistory.length === 1 ? copy.historyCountOne : copy.historyCountMany;
  const historyFilters = [
    { id: "all" as const, label: copy.historyFilterAll },
    { id: "paid" as const, label: copy.historyFilterPaid },
    { id: "failed" as const, label: copy.historyFilterFailed },
    { id: "expired" as const, label: copy.historyFilterExpired },
    { id: "granted" as const, label: copy.historyFilterGranted },
    { id: "pending" as const, label: copy.historyFilterPending },
  ];

  const startCheckout = async (packCredits: number) => {
    if (checkoutLoadingCredits) return;
    setCheckoutLoadingCredits(packCredits);
    setError("");

    try {
      const session = await createBillingCheckout(packCredits);
      if (session?.url) {
        window.location.href = session.url;
        return;
      }
      throw new Error("Brak URL checkout");
    } catch (err) {
      setError(getErrorMessage(err, "Nie udalo sie otworzyc checkout Stripe"));
    } finally {
      setCheckoutLoadingCredits(null);
    }
  };

  const statusBanner = checkoutResult === "success"
    ? {
        title: copy.checkoutSuccessTitle,
        body: copy.checkoutSuccessBody,
        style: {
          border: "1px solid rgba(16,185,129,0.22)",
          background: "rgba(16,185,129,0.10)",
          color: "#065f46",
        },
      }
    : checkoutResult === "cancel"
      ? {
          title: copy.checkoutCancelTitle,
          body: copy.checkoutCancelBody,
          style: {
            border: "1px solid rgba(245,158,11,0.22)",
            background: "rgba(245,158,11,0.10)",
            color: "#92400e",
          },
        }
      : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.24),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-indigo-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Billing
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t.pageTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {t.pageDesc}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t.currentBalance}</div>
              <div className="mt-2 text-4xl font-semibold text-white">{formatCredits(currentCredits)}</div>
              <div className="mt-1 text-sm text-slate-400">{t.currentBalanceHint}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t.starter}</div>
              <div className="mt-2 text-4xl font-semibold text-white">{formatCredits(starterCredits)}</div>
              <div className="mt-1 text-sm text-slate-400">{t.starterHint}</div>
            </div>
          </div>
        </div>
      </div>

      {statusBanner ? (
        <div className="rounded-2xl p-5 text-sm" style={statusBanner.style}>
          <div className="font-semibold">{statusBanner.title}</div>
          <div className="mt-1 opacity-90">{statusBanner.body}</div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          <div className="font-semibold">{t.loadFailed}</div>
          <div className="mt-1 text-rose-200/80">{error}</div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label={t.metricBalance}
          value={`${formatCredits(currentCredits)} ${t.credits}`}
          hint={t.metricBalanceHint}
        />
        <MetricCard
          label={t.metricBought}
          value={`${formatCredits(billing?.current?.paidCreditsGranted ?? 0)} ${t.credits}`}
          hint={t.metricBoughtHint}
        />
        <MetricCard
          label={t.metricUsed}
          value={`${formatCredits(totalUsed)} ${t.credits}`}
          hint={t.metricUsedHint}
        />
        <MetricCard
          label={t.metricStarterFree}
          value={`${formatCredits(billing?.current?.freeCreditsGranted ?? starterCredits)} ${t.credits}`}
          hint={t.metricStarterFreeHint}
        />
      </section>

      <section className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <SectionTitle
          eyebrow={t.aiCostEyebrow}
          title={t.aiCostTitle}
          description={t.aiCostDesc}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: t.aiCostDescription, value: billing ? formatCredits(billing.aiCosts.description) : "0,67", hint: t.aiCostDescriptionHint },
            { label: t.aiCostAttributes, value: billing ? formatCredits(billing.aiCosts.attributes) : "0,33", hint: t.aiCostAttributesHint },
            { label: t.aiCostAll, value: billing ? formatCredits(billing.aiCosts.all) : "1,00", hint: t.aiCostAllHint },
          ].map(({ label, value, hint }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
              <div className="mt-3 text-4xl font-semibold" style={{ color: "var(--accent-primary)" }}>{value}</div>
              <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{hint}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl p-5 text-sm" style={{ background: "var(--accent-primary-light)", border: "1px solid var(--accent-primary-border)", color: "var(--accent-primary)" }}>
          {t.aiCostBulkNote}
        </div>
      </section>

      <section className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <SectionTitle
          eyebrow={t.packsEyebrow}
          title={t.packsTitle}
          description={t.packsDesc}
        />

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(billing?.packs || []).map((pack) => (
              <PackCard
                key={pack.code}
                pack={pack}
                loading={checkoutLoadingCredits === pack.credits}
                onBuy={startCheckout}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <SectionTitle
            eyebrow={t.accountEyebrow}
            title={t.accountTitle}
            description={t.accountDesc}
          />

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl px-4 py-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>{t.totalGranted}</div>
              <div className="mt-2 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(totalGranted)} {t.credits}</div>
            </div>
            <div className="rounded-2xl px-4 py-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>{t.lastPayment}</div>
              <div className="mt-2 text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
                {formatDateTime(billing?.current?.lastPaymentAt)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: t.freeStarter, val: formatCredits(billing?.current?.freeCreditsGranted ?? 0) },
                { label: t.bought, val: formatCredits(billing?.current?.paidCreditsGranted ?? 0) },
                { label: t.used, val: formatCredits(totalUsed) },
                { label: t.available, val: formatCredits(currentCredits) },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl px-3 py-3 text-sm" style={{ background: "var(--bg-input-alt)", color: "var(--text-secondary)" }}>
                  {label}: <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <SectionTitle
            eyebrow={t.historyEyebrow}
            title={t.historyTitle}
            description={t.historyDesc}
          />

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
            <div>
              <div>{t.historySource}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                {filteredHistory.length} {historyCountLabel}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceMeta.className}`}>
              {sourceMeta.label}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>
              {copy.historyFilterLabel}
            </span>
            {historyFilters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className="rounded-full px-3 py-2 text-xs font-semibold transition"
                  style={active ? {
                    background: "var(--accent-primary-light)",
                    border: "1px solid var(--accent-primary-border)",
                    color: "var(--accent-primary)",
                  } : {
                    background: "var(--bg-input-alt)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {filter.label} <span className="opacity-75">{filterCounts[filter.id]}</span>
                </button>
              );
            })}
          </div>

          {retryableIssues.length ? (
            <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--accent-primary-light)", border: "1px solid var(--accent-primary-border)" }}>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--accent-primary)" }}>{copy.auditEyebrow}</div>
                <div className="text-lg font-semibold" style={{ color: "var(--text-heading)" }}>{copy.auditTitle}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{copy.auditDesc}</div>
              </div>

              <div className="mt-4 space-y-3">
                {retryableIssues.map((item) => (
                  <AuditIssueCard
                    key={item.id}
                    item={item}
                    loading={checkoutLoadingCredits === item.packCredits}
                    onRetry={startCheckout}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3 md:hidden">
            {historyLoading ? (
              <div className="rounded-2xl px-4 py-6 text-sm" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}>
                {t.historyLoading}
              </div>
            ) : filteredHistory.length ? (
              filteredHistory.map((item) => <HistoryCard key={item.id} item={item} />)
            ) : (
              <div className="rounded-2xl px-4 py-6 text-sm" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}>
                {activeFilter === "all" ? t.historyEmpty : copy.historyEmptyFiltered}
              </div>
            )}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-2xl md:block" style={{ border: "1px solid var(--border-default)" }}>
            <table className="min-w-full" style={{ borderCollapse: "collapse" }}>
              <thead className="text-left text-xs uppercase tracking-[0.22em]" style={{ background: "var(--bg-table-header)", color: "var(--text-secondary)" }}>
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.historyColDate}</th>
                  <th className="px-4 py-3 font-semibold">{t.historyColItem}</th>
                  <th className="px-4 py-3 font-semibold">{t.historyColCredits}</th>
                  <th className="px-4 py-3 font-semibold">{t.historyColAmount}</th>
                  <th className="px-4 py-3 font-semibold">{t.historyColStatus}</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm" style={{ color: "var(--text-tertiary)" }} colSpan={5}>
                      {t.historyLoading}
                    </td>
                  </tr>
                ) : filteredHistory.length ? (
                  filteredHistory.map((item) => <HistoryRow key={item.id} item={item} />)
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm" style={{ color: "var(--text-tertiary)" }} colSpan={5}>
                      {activeFilter === "all" ? t.historyEmpty : copy.historyEmptyFiltered}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
