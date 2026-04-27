"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "../LangContext";
import { FileMarketplaceImportPanel } from "./FileMarketplaceImportPanel";
import { MarketplaceSourceImportModal } from "../products/MarketplaceSourceImportModal";
import {
  getImportJobOpenProductId,
  hasReportableImportJobItem,
  isImportModeWithAi,
  normalizeImportJobResult,
  summarizeImportJobItems,
} from "../products/import-job-helpers";
import type { MarketplaceImportMode, MarketplaceImportProvider } from "../products/import-hub-helpers";
import {
  getVisibleImportDestinations,
  type FileImportMarketplace,
  type ImportDestinationId,
} from "./file-import-helpers";
import {
  getImportMetricClass,
  getImportStatusClass,
  importProgressClasses,
  importReportClasses,
  type ImportMetricKind,
} from "./import-theme-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${token}` };
}

const COPY = {
  pl: {
    eyebrow: "Import",
    title: "Import produktów",
    desc: "Importuj z pliku marketplace, Allegro lub Amazon i obserwuj historię importów w jednym miejscu.",
    start: "Nowy import",
    activeTitle: "Import w toku",
    activeDesc: "Queued marketplace import",
    rows: "wierszy",
    latestTitle: "Ostatni wynik",
    recentTitle: "Historia importów",
    selected: "zaznaczone",
    modeAi: "Import + AI",
    modeOnly: "Import only",
    close: "Zamknij raport",
    imported: "Zaimportowane",
    duplicates: "Duplikaty",
    failed: "Błędy",
    total: "Razem",
    duplicateSkips: "Pominięte duplikaty",
    existingProduct: "Istniejący produkt",
    open: "Otwórz",
    noItems: "Brak szczegółów pozycji.",
    refresh: "Odśwież",
    loading: "Ładuję historię importów...",
    empty: "Brak historii importów. Pierwszy import pojawi się tutaj.",
  },
  en: {
    eyebrow: "Import",
    title: "Product imports",
    desc: "Import from marketplace files, Allegro, or Amazon and keep import history in one workspace.",
    start: "New import",
    activeTitle: "Import in background",
    activeDesc: "Queued marketplace import",
    rows: "rows",
    latestTitle: "Latest result",
    recentTitle: "Import history",
    selected: "selected",
    modeAi: "Import + AI",
    modeOnly: "Import only",
    close: "Close report",
    imported: "Imported",
    duplicates: "Duplicates",
    failed: "Failed",
    total: "Total",
    duplicateSkips: "Duplicate skips",
    existingProduct: "Existing product",
    open: "Open",
    noItems: "No item details.",
    refresh: "Refresh",
    loading: "Loading import history...",
    empty: "No import history yet. First import will appear here.",
  },
} as const;

type JobSummary = {
  id: string;
  type?: string | null;
  status: string;
  marketplaceSlug?: string | null;
  mode?: string | null;
  requestedItems?: number | null;
  progressPercent?: number | null;
  currentMessage?: string | null;
  elapsedSeconds?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  finishedAt?: string | null;
};

type JobItemSummary = {
  id: number | null;
  itemOrder?: number | null;
  productId: number | null;
  resultProductExists?: boolean | null;
  sourceItem?: unknown;
  marketplaceSlug?: string | null;
  mode?: string | null;
  status: string | null;
  progressPercent?: number | null;
  currentStep?: string | null;
  currentMessage?: string | null;
  resultRefId?: number | null;
  resultJson?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  elapsedSeconds?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CompletedImportReport = {
  job: JobSummary;
  items: JobItemSummary[];
  summary: ReturnType<typeof summarizeImportJobItems>;
  provider: ImportLaunchProvider | null;
  mode: MarketplaceImportMode | null;
  selectedCount: number;
};

type ImportLaunchProvider = MarketplaceImportProvider | FileImportMarketplace;

type QueuedImportPayload = {
  job: JobSummary;
  provider: ImportLaunchProvider;
  mode: MarketplaceImportMode;
  selectedCount: number;
};

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function normalizeJobSummary(raw: Partial<JobSummary> | null | undefined): JobSummary | null {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    type: raw.type ?? null,
    status: raw.status ?? "queued",
    marketplaceSlug: raw.marketplaceSlug ?? null,
    mode: raw.mode ?? null,
    requestedItems: raw.requestedItems ?? null,
    progressPercent: raw.progressPercent ?? null,
    currentMessage: raw.currentMessage ?? null,
    elapsedSeconds: raw.elapsedSeconds ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    finishedAt: raw.finishedAt ?? null,
  };
}

function normalizeJobItemProductId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeJobItemSummary(raw: Partial<JobItemSummary> | null | undefined): JobItemSummary | null {
  if (!raw) return null;
  let resultJson: unknown = raw.resultJson ?? null;
  if (typeof resultJson === "string") {
    try {
      resultJson = JSON.parse(resultJson);
    } catch {
      resultJson = null;
    }
  }
  const productId = normalizeJobItemProductId(raw.productId);
  if (!hasReportableImportJobItem({ productId, status: raw.status ?? null, resultJson })) return null;

  return {
    id: typeof raw.id === "number" ? raw.id : null,
    itemOrder: raw.itemOrder ?? null,
    productId,
    resultProductExists: raw.resultProductExists ?? null,
    sourceItem: raw.sourceItem ?? null,
    marketplaceSlug: raw.marketplaceSlug ?? null,
    mode: raw.mode ?? null,
    status: raw.status ?? null,
    progressPercent: raw.progressPercent ?? null,
    currentStep: raw.currentStep ?? null,
    currentMessage: raw.currentMessage ?? null,
    resultRefId: raw.resultRefId ?? null,
    resultJson,
    errorCode: raw.errorCode ?? null,
    errorMessage: raw.errorMessage ?? null,
    elapsedSeconds: raw.elapsedSeconds ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function isImportJobType(job: JobSummary) {
  return job.type === "products_import_marketplace" || job.type === "products_import_excel";
}

function normalizeImportProvider(value: unknown): ImportLaunchProvider | null {
  const provider = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (provider === "allegro" || provider === "amazon" || provider === "mediaexpert" || provider === "empik" || provider === "custom") {
    return provider;
  }
  return null;
}

function normalizeImportMode(value: unknown): MarketplaceImportMode | null {
  const mode = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (mode === "import_only") return "import_only";
  if (mode === "import_and_ai" || mode === "import_with_ai") return "import_and_ai";
  return null;
}

function buildImportReportFromJob(
  job: JobSummary,
  items: JobItemSummary[],
  fallback?: { provider?: ImportLaunchProvider | null; mode?: MarketplaceImportMode | null; selectedCount?: number | null }
): CompletedImportReport {
  return {
    job,
    items,
    summary: summarizeImportJobItems(items),
    provider: fallback?.provider ?? normalizeImportProvider(job.marketplaceSlug),
    mode: fallback?.mode ?? normalizeImportMode(job.mode),
    selectedCount: fallback?.selectedCount ?? job.requestedItems ?? items.length,
  };
}

function ImportChooserModal({
  onChoose,
  onClose,
}: {
  onChoose: (choice: ImportDestinationId) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const title = lang === "en" ? "Choose import destination" : "Wybierz miejsce importu";
  const close = lang === "en" ? "Close" : "Zamknij";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#020617] shadow-[0_30px_80px_rgba(2,6,23,0.65)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.3),_transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/80">Import</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label={close}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid gap-3 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,1))] p-6 sm:grid-cols-2">
          {getVisibleImportDestinations().map((destination) => (
            <button
              key={destination.id}
              onClick={() => onChoose(destination.id)}
              className={`rounded-2xl border bg-white/5 px-5 py-5 text-left transition hover:bg-white/10 ${destination.accent}`}
            >
              <div className="text-lg font-semibold text-white">{destination.label}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                {destination.kind === "file" ? "XLS/CSV" : destination.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined, lang: "pl" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDurationLabel(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds ?? NaN) || seconds == null) return "0s";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rem = total % 60;
  if (!minutes) return `${rem}s`;
  return `${minutes}m ${String(rem).padStart(2, "0")}s`;
}

function readSourceString(sourceItem: unknown, key: string) {
  if (!sourceItem || typeof sourceItem !== "object" || Array.isArray(sourceItem)) return "";
  const value = (sourceItem as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function getRemoteLabel(item: JobItemSummary, result: ReturnType<typeof normalizeImportJobResult>, index: number) {
  return result.remoteId
    || readSourceString(item.sourceItem, "remoteId")
    || readSourceString(item.sourceItem, "asin")
    || readSourceString(item.sourceItem, "ean")
    || `row-${index + 1}`;
}

function getItemLabel(item: JobItemSummary, result: ReturnType<typeof normalizeImportJobResult>, index: number) {
  return result.existingProductTitle
    || result.message
    || item.errorMessage
    || item.currentMessage
    || readSourceString(item.sourceItem, "title")
    || `row-${index + 1}`;
}

function ImportProgressCard({ job, selectedCount }: { job: JobSummary; selectedCount: number | null }) {
  const { lang } = useLang();
  const copy = COPY[lang];
  const progress = Math.max(0, Math.min(100, job.progressPercent ?? 0));

  return (
    <div className={importProgressClasses.card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={importProgressClasses.title}>{copy.activeTitle}</div>
          <div className={importProgressClasses.body}>{job.currentMessage || copy.activeDesc}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {selectedCount != null && (
            <span className={importProgressClasses.chip}>
              {selectedCount} {copy.rows}
            </span>
          )}
          <span className={importProgressClasses.chip}>{progress}%</span>
          <span className={importProgressClasses.chipSoft}>{formatDurationLabel(job.elapsedSeconds)}</span>
        </div>
      </div>
      <div className={importProgressClasses.track}>
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ImportReportCard({
  report,
  latest,
  onClose,
  onOpenProduct,
}: {
  report: CompletedImportReport;
  latest?: boolean;
  onClose?: () => void;
  onOpenProduct: (productId: number) => void;
}) {
  const { lang } = useLang();
  const copy = COPY[lang];
  const modeLabel = report.mode ? (isImportModeWithAi(report.mode) ? copy.modeAi : copy.modeOnly) : null;
  const reportDate = report.job.finishedAt || report.job.updatedAt || report.job.createdAt || "";

  return (
    <div className={importReportClasses.card}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={importReportClasses.title}>
            {latest ? copy.latestTitle : copy.recentTitle}
          </div>
          <div className={importReportClasses.meta}>
            <span>{report.selectedCount} {copy.selected}</span>
            {report.provider && <span>{report.provider}</span>}
            {modeLabel && <span>{modeLabel}</span>}
            {reportDate && <span>{formatDate(reportDate, lang)}</span>}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className={importReportClasses.closeButton}>
            {copy.close}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          [copy.imported, report.summary.importedCount, "imported"],
          [copy.duplicates, report.summary.duplicateCount, "duplicates"],
          [copy.failed, report.summary.failedCount, "failed"],
          [copy.total, report.summary.totalCount, "total"],
        ].map(([label, value, kind]) => (
          <div key={String(label)} className={`rounded-2xl border px-4 py-3 ${getImportMetricClass(kind as ImportMetricKind)}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {report.summary.duplicates.length > 0 && (
        <div className={importReportClasses.duplicatePanel}>
          <div className={importReportClasses.duplicateTitle}>{copy.duplicateSkips}</div>
          <div className="mt-2 space-y-2">
            {report.summary.duplicates.slice(0, 5).map((item, index) => (
              <div key={`${item.remoteId || "duplicate"}-${index}`} className={importReportClasses.duplicateRow}>
                <span className={importReportClasses.duplicateId}>{item.remoteId || "remote"}</span>
                <span>{item.existingProductTitle || copy.existingProduct}</span>
                {item.existingProductId ? (
                  <button onClick={() => onOpenProduct(item.existingProductId as number)} className={importReportClasses.duplicateButton}>
                    {copy.open} #{item.existingProductId}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {report.items.length === 0 ? (
          <div className={importReportClasses.empty}>
            {copy.noItems}
          </div>
        ) : (
          report.items.slice(0, latest ? 6 : 4).map((item, index) => {
            const result = normalizeImportJobResult(item.resultJson);
            const statusLabel = result.status || item.status || "queued";
            const productId = getImportJobOpenProductId(item);

            return (
              <div key={`${item.id ?? index}-${getRemoteLabel(item, result, index)}-${statusLabel}`} className={importReportClasses.itemRow}>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={importReportClasses.itemId}>
                    {getRemoteLabel(item, result, index)}
                  </span>
                  <span className={importReportClasses.itemLabel}>{getItemLabel(item, result, index)}</span>
                  {productId ? (
                    <button onClick={() => onOpenProduct(productId)} className={importReportClasses.openButton}>
                      {copy.open} #{productId}
                    </button>
                  ) : null}
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${getImportStatusClass(statusLabel)}`}>
                  {statusLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ImportWorkspace() {
  const router = useRouter();
  const { lang } = useLang();
  const copy = COPY[lang];
  const importDescription = copy.desc
    .replace(", Allegro lub Amazon", " lub Allegro")
    .replace(", or Amazon", "");
  const [importChoice, setImportChoice] = useState<ImportDestinationId | "chooser" | null>(null);
  const [activeImportJob, setActiveImportJob] = useState<JobSummary | null>(null);
  const [completedReport, setCompletedReport] = useState<CompletedImportReport | null>(null);
  const [lastLaunch, setLastLaunch] = useState<{ provider: ImportLaunchProvider; mode: MarketplaceImportMode; selectedCount: number } | null>(null);
  const [reports, setReports] = useState<CompletedImportReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeJobs, setActiveJobs] = useState<Array<{ job: JobSummary; items: JobItemSummary[] }>>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobItems = useCallback(async (jobId: string) => {
    const res = await fetch(`${API}/api/jobs/${jobId}/items`, { headers: authHeaders(), cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac itemow joba");
    return Array.isArray(json.data)
      ? json.data.map((item: Partial<JobItemSummary>) => normalizeJobItemSummary(item)).filter(Boolean) as JobItemSummary[]
      : [];
  }, []);

  const loadRecentReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${API}/api/jobs?scope=recent`, { headers: authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac historii importow");
      const jobs: JobSummary[] = Array.isArray(json.data)
        ? json.data
            .map((item: Partial<JobSummary>) => normalizeJobSummary(item))
            .filter((job: JobSummary | null): job is JobSummary => Boolean(job))
            .filter((job: JobSummary) => isImportJobType(job))
            .slice(0, 8)
        : [];
      const nextReports = await Promise.all(jobs.map(async (job) => {
        let items: JobItemSummary[] = [];
        try {
          items = await loadJobItems(job.id);
        } catch {}
        return buildImportReportFromJob(job, items);
      }));
      setReports(nextReports);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [loadJobItems]);

  const loadActiveJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/jobs?scope=active`, { headers: authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac aktywnych jobow");
      const jobs: JobSummary[] = Array.isArray(json.data)
        ? json.data
            .map((item: Partial<JobSummary>) => normalizeJobSummary(item))
            .filter((job: JobSummary | null): job is JobSummary => Boolean(job))
            .filter((job: JobSummary) => isImportJobType(job))
        : [];
      const entries = await Promise.all(jobs.map(async (job) => ({
        job,
        items: await loadJobItems(job.id),
      })));
      setActiveJobs(entries);
    } catch {
      setActiveJobs([]);
    }
  }, [loadJobItems]);

  const finalizeImportJob = useCallback(async (job: JobSummary) => {
    let items: JobItemSummary[] = [];
    try {
      items = await loadJobItems(job.id);
    } catch (err) {
      console.error("Import report load failed:", getErrorMessage(err, "Nie udalo sie pobrac itemow joba"));
    }
    setCompletedReport(buildImportReportFromJob(job, items, {
      provider: lastLaunch?.provider ?? null,
      mode: lastLaunch?.mode ?? null,
      selectedCount: lastLaunch?.selectedCount ?? items.length,
    }));
    setActiveImportJob(null);
    await Promise.all([loadActiveJobs(), loadRecentReports()]);
  }, [lastLaunch, loadActiveJobs, loadJobItems, loadRecentReports]);

  useEffect(() => {
    void loadRecentReports();
    void loadActiveJobs();
    const timer = setInterval(() => {
      void loadActiveJobs();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadActiveJobs, loadRecentReports]);

  useEffect(() => {
    if (!activeImportJob?.id) return;

    let cancelled = false;
    const stopPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/jobs/${activeImportJob.id}`, { headers: authHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac statusu joba importu");
        const nextJob = normalizeJobSummary(json.data);
        if (!nextJob || cancelled) return;
        if (nextJob.status === "done" || nextJob.status === "error") {
          stopPolling();
          await finalizeImportJob(nextJob);
          return;
        }
        setActiveImportJob(nextJob);
        void loadActiveJobs();
      } catch (err) {
        if (cancelled) return;
        setActiveImportJob((current) => current ? {
          ...current,
          status: "error",
          currentMessage: getErrorMessage(err, "Nie udalo sie pobrac statusu joba importu"),
        } : current);
        stopPolling();
      }
    };

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeImportJob?.id, finalizeImportJob, loadActiveJobs]);

  const handleQueued = useCallback(({ job, provider, mode, selectedCount }: QueuedImportPayload) => {
    const nextJob = normalizeJobSummary(job);
    setLastLaunch({ provider, mode, selectedCount });
    setCompletedReport(null);
    setImportChoice(null);
    if (nextJob) setActiveImportJob(nextJob);
    void loadActiveJobs();
  }, [loadActiveJobs]);

  const backgroundImportJob = activeJobs.find((entry) => isImportJobType(entry.job))?.job ?? null;
  const visibleImportJob = activeImportJob ?? backgroundImportJob;
  const importJobActive = !!visibleImportJob && visibleImportJob.status !== "done" && visibleImportJob.status !== "error";
  const recentReports = completedReport
    ? reports.filter((report) => report.job.id !== completedReport.job.id)
    : reports;

  return (
    <div className="space-y-5">
      {importChoice === "chooser" && (
        <ImportChooserModal
          onClose={() => setImportChoice(null)}
          onChoose={(choice) => setImportChoice(choice)}
        />
      )}

      {(importChoice === "mediaexpert" || importChoice === "empik" || importChoice === "custom") && (
        <FileMarketplaceImportPanel
          marketplace={importChoice}
          onBack={() => setImportChoice("chooser")}
          onClose={() => setImportChoice(null)}
          onQueued={handleQueued}
        />
      )}

      {(importChoice === "allegro" || importChoice === "amazon") && (
        <MarketplaceSourceImportModal
          initialProvider={importChoice}
          onClose={() => setImportChoice(null)}
          onQueued={handleQueued}
        />
      )}

      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">{copy.eyebrow}</div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{importDescription}</p>
          </div>
          <button
            onClick={() => setImportChoice("chooser")}
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
          >
            {copy.start}
          </button>
        </div>
      </section>

      {importJobActive && visibleImportJob && (
        <ImportProgressCard job={visibleImportJob} selectedCount={lastLaunch?.selectedCount ?? visibleImportJob.requestedItems ?? null} />
      )}

      {completedReport && (
        <ImportReportCard
          report={completedReport}
          latest
          onClose={() => setCompletedReport(null)}
          onOpenProduct={(productId) => router.push(`/dashboard/products/${productId}`)}
        />
      )}

      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">{copy.recentTitle}</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{importDescription}</p>
          </div>
          <button
            onClick={() => { if (!loadingReports) void loadRecentReports(); }}
            aria-disabled={loadingReports}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              loadingReports ? "bg-slate-200 text-slate-500" : "bg-[var(--text-primary)] text-[var(--bg-card)] hover:opacity-90"
            }`}
          >
            {copy.refresh}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loadingReports ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              {copy.loading}
            </div>
          ) : recentReports.length === 0 && !importJobActive && !completedReport ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              {copy.empty}
            </div>
          ) : (
            recentReports.map((report) => (
              <ImportReportCard
                key={report.job.id}
                report={report}
                onOpenProduct={(productId) => router.push(`/dashboard/products/${productId}`)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
