"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAmazonUiEnabled, resolveMarketplaceSlugForMvp } from "../mvp-feature-flags";

import { ExportReadinessTable } from "./ExportReadinessTable";
import { ExportRunHistoryCard } from "./ExportRunHistoryCard";
import {
  canDownloadMiraklExportFile,
  canRunMarketplacePreflight,
  canStartExportRun,
  DEFAULT_ALLEGRO_EXPORT_FIELDS,
  getVisibleExportMarketplaceOptions,
  getExportReadinessPresentation,
  getSelectableExportReadinessIds,
  normalizeExportPreflightResult,
  normalizeExportReadinessRows,
  normalizeExportRunRows,
  parseExportApiSelection,
  type AllegroExportField,
  type AllegroExportFields,
  type ExportReadinessFilter,
  type ExportPreflightResult,
} from "./export-api-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AMAZON_UI_ENABLED = isAmazonUiEnabled();

const ALLEGRO_FIELD_LABELS: Record<AllegroExportField, string> = {
  title: "Tytul",
  description: "Opis",
  price: "Cena",
  stock: "Stock",
};

const ALLEGRO_FIELD_KEYS = Object.keys(ALLEGRO_FIELD_LABELS) as AllegroExportField[];

const ALLEGRO_FIELD_PRESETS: Array<{ key: string; label: string; fields: AllegroExportFields }> = [
  {
    key: "price-stock",
    label: "Cena + stock",
    fields: { title: false, description: false, price: true, stock: true },
  },
  {
    key: "content",
    label: "Tresc",
    fields: { title: true, description: true, price: false, stock: false },
  },
  {
    key: "full",
    label: "Pelny sync",
    fields: { title: true, description: true, price: true, stock: true },
  },
];

type AllegroAccountOption = {
  id: number;
  environment: string;
  allegro_login?: string | null;
  status?: string | null;
};

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readJsonOrThrow(response: Response) {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (typeof payload === "object" && payload && "error" in payload) {
      const error = (payload as { error?: unknown }).error;
      throw new Error(typeof error === "string" && error ? error : "Request failed");
    }
    throw new Error(`Request failed: ${response.status}`);
  }

  return payload;
}

function marketplaceHelperCopy(marketplaceSlug: string) {
  if (["mediaexpert", "empik"].includes(marketplaceSlug)) {
    return {
      eyebrow: "Mirakl XLSX",
      body: "Preflight sprawdza kategorie, wymagane atrybuty, opis HTML i zdjecia. Export pobiera plik XLSX per kategoria.",
    };
  }

  if (marketplaceSlug === "amazon") {
    return {
      eyebrow: "Validation",
      body: "Amazon dzisiaj pokazuje readiness. Write-side run zostaje zablokowany do kolejnego adaptera.",
    };
  }

  return {
    eyebrow: "Allegro API",
    body: "Istniejace oferty ida jako update wybranych pol. Nowe oferty ida jako INACTIVE po preflight.",
  };
}

function fieldsEqual(left: AllegroExportFields, right: AllegroExportFields) {
  return ALLEGRO_FIELD_KEYS.every((field) => left[field] === right[field]);
}

function isMiraklMarketplace(marketplaceSlug: string) {
  return marketplaceSlug === "mediaexpert" || marketplaceSlug === "empik";
}

function getMarketplaceLabel(marketplaceSlug: string) {
  return getVisibleExportMarketplaceOptions(AMAZON_UI_ENABLED).find((option) => option.value === marketplaceSlug)?.label || marketplaceSlug;
}

function getDownloadFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] || fallback;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportApiWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const initialSelection = useMemo(
    () => parseExportApiSelection(searchString),
    [searchString]
  );
  const marketplaceOptions = useMemo(() => getVisibleExportMarketplaceOptions(AMAZON_UI_ENABLED), []);
  const [marketplaceSlug, setMarketplaceSlug] = useState(resolveMarketplaceSlugForMvp(initialSelection.marketplaceSlug || "allegro", AMAZON_UI_ENABLED));
  const [scopedProductIds, setScopedProductIds] = useState<number[]>(initialSelection.productIds);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection.productIds);
  const [statusFilter, setStatusFilter] = useState<ExportReadinessFilter>("all");
  const [rows, setRows] = useState(() => normalizeExportReadinessRows([]));
  const [runs, setRuns] = useState(() => normalizeExportRunRows([]));
  const [allegroAccounts, setAllegroAccounts] = useState<AllegroAccountOption[]>([]);
  const [selectedAllegroAccountId, setSelectedAllegroAccountId] = useState<number | null>(initialSelection.accountId);
  const [confirmNeedsReview, setConfirmNeedsReview] = useState(!!initialSelection.confirmNeedsReview);
  const [allegroFields, setAllegroFields] = useState<AllegroExportFields>(initialSelection.fields || DEFAULT_ALLEGRO_EXPORT_FIELDS);
  const [loading, setLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    const nextSelection = parseExportApiSelection(searchString);
    setMarketplaceSlug(resolveMarketplaceSlugForMvp(nextSelection.marketplaceSlug || "allegro", AMAZON_UI_ENABLED));
    setScopedProductIds(nextSelection.productIds);
    setSelectedIds(nextSelection.productIds);
    setSelectedAllegroAccountId(nextSelection.accountId);
    setConfirmNeedsReview(!!nextSelection.confirmNeedsReview);
    setAllegroFields(nextSelection.fields || DEFAULT_ALLEGRO_EXPORT_FIELDS);
    setPreflight(null);
  }, [searchString]);

  const toggleAllegroField = (field: AllegroExportField) => {
    setAllegroFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
    setPreflight(null);
    setRunResult(null);
  };

  useEffect(() => {
    let cancelled = false;

    const loadAccounts = async () => {
      try {
        const payload = await fetch(`${API}/api/seller/allegro/accounts`, {
          headers: authHeaders(),
          cache: "no-store",
        }).then(readJsonOrThrow);
        if (cancelled) return;

        const nextAccounts = (
          typeof payload === "object" && payload && "data" in payload && Array.isArray((payload as { data?: unknown }).data)
            ? (payload as { data: unknown[] }).data
            : []
        )
          .map((entry) => {
            const data = typeof entry === "object" && entry ? entry as Record<string, unknown> : {};
            return {
              id: Number(data.id || 0),
              environment: String(data.environment || "production").trim() || "production",
              allegro_login: typeof data.allegro_login === "string" ? data.allegro_login : null,
              status: typeof data.status === "string" ? data.status : null,
            };
          })
          .filter((account) => Number.isInteger(account.id) && account.id > 0);

        setAllegroAccounts(nextAccounts);
        setSelectedAllegroAccountId((current) => {
          if (current && nextAccounts.some((account) => account.id === current)) return current;
          const validProduction = nextAccounts.find((account) => account.environment === "production" && account.status === "valid");
          return validProduction?.id ?? nextAccounts[0]?.id ?? null;
        });
      } catch {
        if (!cancelled) {
          setAllegroAccounts([]);
        }
      }
    };

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const readinessUrl = new URL(`${API}/api/marketplace-export/readiness`);
        readinessUrl.searchParams.set("marketplace", marketplaceSlug);
        if (marketplaceSlug === "allegro" && selectedAllegroAccountId) {
          readinessUrl.searchParams.set("accountId", String(selectedAllegroAccountId));
        }
        if (scopedProductIds.length > 0) {
          readinessUrl.searchParams.set("productIds", scopedProductIds.join(","));
        }

        const runsUrl = new URL(`${API}/api/marketplace-export/runs`);

        const [readinessPayload, runsPayload] = await Promise.all([
          fetch(readinessUrl.toString(), { headers: authHeaders(), cache: "no-store" }).then(readJsonOrThrow),
          fetch(runsUrl.toString(), { headers: authHeaders(), cache: "no-store" }).then(readJsonOrThrow),
        ]);

        if (cancelled) return;

        const nextRows = normalizeExportReadinessRows(
          typeof readinessPayload === "object" && readinessPayload && "data" in readinessPayload
            ? (readinessPayload as { data?: unknown }).data
            : []
        );
        const nextRuns = normalizeExportRunRows(
          typeof runsPayload === "object" && runsPayload && "data" in runsPayload
            ? (runsPayload as { data?: unknown }).data
            : []
        ).filter((run) => run.marketplaceSlug === marketplaceSlug);

        setRows(nextRows);
        setRuns(nextRuns);
        setSelectedIds((current) => getSelectableExportReadinessIds(nextRows, current));
      } catch (loadError) {
        if (cancelled) return;
        setRows([]);
        setRuns([]);
        setError(loadError instanceof Error ? loadError.message : "Nie udalo sie zaladowac Export");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [marketplaceSlug, scopedProductIds, selectedAllegroAccountId]);

  const copy = marketplaceHelperCopy(marketplaceSlug);
  const marketplaceLabel = getMarketplaceLabel(marketplaceSlug);
  const miraklMode = isMiraklMarketplace(marketplaceSlug);
  const presentations = rows.map(getExportReadinessPresentation);
  const readyCount = presentations.filter((row) => row.bucket === "ready").length;
  const reviewCount = presentations.filter((row) => row.bucket === "needs_review").length;
  const blockedCount = presentations.filter((row) => row.bucket === "blocked").length;
  const selectedCount = selectedIds.length;
  const activePreset = ALLEGRO_FIELD_PRESETS.find((preset) => fieldsEqual(preset.fields, allegroFields));
  const canRunPreflight = canRunMarketplacePreflight({
    marketplaceSlug,
    accountId: selectedAllegroAccountId,
    selectedCount,
    loading: preflightLoading,
  });
  const canRunExport = !!preflight && canStartExportRun({
    marketplaceSlug,
    accountId: selectedAllegroAccountId,
    eligibleCount: preflight.eligibleCount,
    loading: runLoading,
  });
  const canDownloadMirakl = !!preflight && canDownloadMiraklExportFile({
    marketplaceSlug,
    eligibleCount: preflight.eligibleCount,
    loading: runLoading,
  });
  const canRunPrimaryExportAction = miraklMode
    ? canDownloadMirakl && (preflight?.groups.length ?? 0) <= 1
    : canRunExport;

  async function handleRunPreflight() {
    if (!canRunPreflight) return;

    setPreflightLoading(true);
    setError(null);
    setRunResult(null);

    try {
      const payload = await fetch(`${API}/api/marketplace-export/preflight`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          marketplaceSlug,
          accountId: marketplaceSlug === "allegro" ? selectedAllegroAccountId : null,
          productIds: getSelectableExportReadinessIds(rows, selectedIds),
          confirmNeedsReview,
          fields: marketplaceSlug === "allegro" ? allegroFields : null,
        }),
      }).then(readJsonOrThrow);

      setPreflight(
        normalizeExportPreflightResult(
          typeof payload === "object" && payload && "data" in payload
            ? (payload as { data?: unknown }).data
            : null
        )
      );
    } catch (preflightError) {
      setPreflight(null);
      setError(preflightError instanceof Error ? preflightError.message : "Preflight fail");
    } finally {
      setPreflightLoading(false);
    }
  }

  async function handleStartRun() {
    if (!preflight || runLoading) return;

    const productIds = preflight.eligibleItems.map((item) => item.productId);
    if (!canStartExportRun({
      marketplaceSlug,
      accountId: selectedAllegroAccountId,
      eligibleCount: productIds.length,
      loading: runLoading,
    })) {
      return;
    }

    setRunLoading(true);
    setError(null);
    setRunResult(null);

    try {
      const payload = await fetch(`${API}/api/marketplace-export/runs`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          marketplaceSlug,
          accountId: selectedAllegroAccountId,
          productIds,
          mode: "publish",
          confirmNeedsReview,
          fields: marketplaceSlug === "allegro" ? allegroFields : null,
        }),
      }).then(readJsonOrThrow);
      const data = typeof payload === "object" && payload && "data" in payload
        ? payload as { data?: { runId?: number; jobId?: string } }
        : { data: null };

      setRunResult(`Run #${data.data?.runId ?? "-"} dodany do kolejki${data.data?.jobId ? ` (${data.data.jobId})` : ""}.`);

      const runsPayload = await fetch(`${API}/api/marketplace-export/runs`, {
        headers: authHeaders(),
        cache: "no-store",
      }).then(readJsonOrThrow);
      const nextRuns = normalizeExportRunRows(
        typeof runsPayload === "object" && runsPayload && "data" in runsPayload
          ? (runsPayload as { data?: unknown }).data
          : []
      ).filter((run) => run.marketplaceSlug === marketplaceSlug);
      setRuns(nextRuns);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Export run fail");
    } finally {
      setRunLoading(false);
    }
  }

  async function handleDownloadMiraklFile(productIds: number[], category?: string) {
    if (!miraklMode || productIds.length === 0 || runLoading) return;

    setRunLoading(true);
    setError(null);
    setRunResult(null);

    try {
      const response = await fetch(`${API}/api/marketplace-export/file`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          marketplaceSlug,
          productIds,
          category: category || "",
        }),
      });

      if (!response.ok) {
        let message = "Export XLSX fail";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string") message = payload.error;
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      const fileName = getDownloadFileName(response, `${marketplaceSlug}_export_${Date.now()}.xlsx`);
      downloadBlob(blob, fileName);
      setRunResult(`Pobrano plik ${fileName}.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Export XLSX fail");
    } finally {
      setRunLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-400">
              Export
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Centrum exportu {marketplaceLabel}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
              Allegro publikuje przez API. Media Expert i Empik pobieraja plik Mirakl XLSX gotowy do uploadu.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {marketplaceOptions.map((option) => {
                const active = marketplaceSlug === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-disabled={!option.enabled}
                    onClick={() => {
                      if (!option.enabled) return;
                      setMarketplaceSlug(option.value);
                      setPreflight(null);
                      setRunResult(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-indigo-400 bg-indigo-500/20 text-white"
                        : option.enabled
                          ? "border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                          : "cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-tertiary)] opacity-70"
                    }`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{option.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
              {copy.eyebrow}
            </div>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              {copy.body}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                <div className="text-[10px] uppercase tracking-[0.16em]">Gotowe</div>
                <div className="mt-1 text-xl font-semibold">{readyCount}</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                <div className="text-[10px] uppercase tracking-[0.16em]">Review</div>
                <div className="mt-1 text-xl font-semibold">{reviewCount}</div>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                <div className="text-[10px] uppercase tracking-[0.16em]">Blokady</div>
                <div className="mt-1 text-xl font-semibold">{blockedCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_auto] xl:items-end">
          {marketplaceSlug === "allegro" && (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Konto Allegro
              <select
                value={selectedAllegroAccountId ?? ""}
                onChange={(event) => {
                  setSelectedAllegroAccountId(event.target.value ? Number(event.target.value) : null);
                  setPreflight(null);
                  setRunResult(null);
                }}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium tracking-normal text-[var(--text-primary)] outline-none transition focus:border-indigo-400"
              >
                <option value="">Wybierz konto</option>
                {allegroAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.allegro_login || "Konto Allegro"} ({account.environment}, {account.status || "unknown"})
                  </option>
                ))}
              </select>
            </label>
          )}

          {marketplaceSlug === "allegro" && (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Preset pol
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALLEGRO_FIELD_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setAllegroFields(preset.fields);
                        setPreflight(null);
                        setRunResult(null);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        activePreset?.key === preset.key
                          ? "border-indigo-400 bg-indigo-500 text-white"
                          : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ALLEGRO_FIELD_KEYS.map((field) => {
                  const active = allegroFields[field];
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleAllegroField(field)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-indigo-400 bg-indigo-500/25 text-white"
                          : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {ALLEGRO_FIELD_LABELS[field]}
                    </button>
                  );
                })}
                <label className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={confirmNeedsReview}
                    onChange={(event) => {
                      setConfirmNeedsReview(event.target.checked);
                      setPreflight(null);
                      setRunResult(null);
                    }}
                    className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-card)] text-indigo-600"
                  />
                  Potwierdz review AI
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              aria-disabled={!canRunPreflight}
              onClick={() => {
                if (!canRunPreflight) return;
                void handleRunPreflight();
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                !canRunPreflight
                  ? "cursor-not-allowed bg-indigo-200 text-indigo-500"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {preflightLoading ? "Preflight..." : `Preflight (${selectedCount})`}
            </button>

            <button
              type="button"
              aria-disabled={selectedCount === 0}
              onClick={() => {
                if (selectedCount === 0) return;
                setSelectedIds([]);
                setPreflight(null);
              }}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                selectedCount === 0
                  ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              Wyczysc
            </button>

            {scopedProductIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setScopedProductIds([]);
                  setPreflight(null);
                }}
                className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15"
              >
                Ostatnie 50
              </button>
            )}
          </div>
        </div>

        {scopedProductIds.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            Scope z handoffu: {scopedProductIds.length} produktow z poprzedniego widoku. Selection mozesz dalej edytowac lokalnie.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <ExportReadinessTable
        marketplaceSlug={marketplaceSlug}
        marketplaceLabel={marketplaceLabel}
        rows={rows}
        loading={loading}
        selectedIds={selectedIds}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSelectedIdsChange={(nextIds) => {
          setSelectedIds(nextIds);
          setPreflight(null);
        }}
        onOpenProduct={(productId) => router.push(`/dashboard/products/${productId}`)}
      />

      {preflight && (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
                Preflight
              </div>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                Plan exportu dla {preflight.marketplaceSlug || marketplaceSlug}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {miraklMode
                  ? "Backend sprawdzil wymagane atrybuty, opis HTML, zdjecia i kategorie."
                  : "Backend policzyl realne diffs i blokady dla wybranych pol."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-[220px]">
              <button
                type="button"
                aria-disabled={!canRunPrimaryExportAction}
                onClick={() => {
                  if (!canRunPrimaryExportAction) return;
                  if (miraklMode) {
                    void handleDownloadMiraklFile(
                      preflight.eligibleItems.map((item) => item.productId),
                      preflight.groups[0]?.classification
                    );
                    return;
                  }
                  void handleStartRun();
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  canRunPrimaryExportAction
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                }`}
              >
                {miraklMode
                  ? runLoading ? "Pobieram XLSX..." : preflight.groups.length > 1 ? "Pobierz per kategoria"
                    : "Pobierz XLSX"
                  : runLoading ? "Dodaje run..." : "Uruchom export"}
              </button>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
                {miraklMode
                  ? preflight.groups.length > 1
                    ? "Wybrane produkty sa w kilku kategoriach. Pobierz osobny XLSX dla kazdej kategorii."
                    : preflight.eligibleCount > 0
                      ? "Plik XLSX wezmie tylko eligible pozycje."
                      : "Brak pozycji gotowych do pliku."
                  : preflight.eligibleCount > 0
                    ? "Run wezmie tylko eligible pozycje."
                    : "Brak pozycji gotowych do exportu."}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Gotowe</div>
              <div className="mt-2 text-2xl font-semibold">{preflight.eligibleCount}</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Blokady</div>
              <div className="mt-2 text-2xl font-semibold">{preflight.blockedCount}</div>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sky-100">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                {miraklMode ? "Format" : "Wybrane pola"}
              </div>
              <div className="mt-2 text-sm font-semibold">
                {miraklMode
                  ? "Mirakl XLSX"
                  : ALLEGRO_FIELD_KEYS.filter((field) => allegroFields[field]).map((field) => ALLEGRO_FIELD_LABELS[field]).join(", ") || "Brak"}
              </div>
            </div>
          </div>

          {runResult && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {runResult}
            </div>
          )}

          {preflight.groups.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Grupy klasyfikacji
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preflight.groups.map((group) => (
                  <div
                    key={`${group.classification}:${group.count}`}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {group.classification} <span className="ml-1 text-[var(--text-secondary)]">({group.count})</span>
                    {miraklMode && (
                      <button
                        type="button"
                        aria-disabled={runLoading}
                        onClick={() => {
                          if (runLoading) return;
                          void handleDownloadMiraklFile(group.productIds, group.classification);
                        }}
                        className={`ml-3 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          runLoading
                            ? "cursor-not-allowed bg-slate-700 text-slate-400"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        XLSX
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {preflight.blockedItems.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Blocked w preflight
              </div>
              <div className="mt-3 space-y-2">
                {preflight.blockedItems.map((item) => (
                  <div
                    key={`blocked:${item.productId}`}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                  >
                    Produkt #{item.productId}: {item.blockers.join(", ") || "Brak detali blokera"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <ExportRunHistoryCard
        marketplaceSlug={marketplaceSlug}
        runs={runs}
        loading={loading}
      />
    </div>
  );
}
