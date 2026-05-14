"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAmazonUiEnabled, resolveMarketplaceSlugForMvp } from "../mvp-feature-flags";

import { ExportProductsBoard } from "./ExportProductsBoard";
import { ExportRunHistoryCard } from "./ExportRunHistoryCard";
import {
  canDownloadMiraklExportFile,
  canRunMarketplacePreflight,
  canStartExportRun,
  DEFAULT_ALLEGRO_EXPORT_FIELDS,
  enrichExportReadinessRows,
  filterExportReadinessRowsForMarketplace,
  getExportMarketplaceTabClass,
  getExportProductDisplayLabel,
  getExportProductIdentifierBadges,
  getVisibleExportMarketplaceOptions,
  getSelectableExportReadinessIds,
  normalizeExportPreflightResult,
  normalizeExportProductSummaries,
  normalizeExportReadinessRows,
  normalizeExportRunRows,
  parseExportApiSelection,
  shouldConfirmReviewForSelection,
  type AllegroExportField,
  type AllegroExportFields,
  type ExportPreflightResult,
  type ExportProductSummary,
  type ExportRunRow,
} from "./export-api-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AMAZON_UI_ENABLED = isAmazonUiEnabled();
const EXPORT_READINESS_LIMIT = 100;

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

type WizardStep = "marketplace" | "products" | "export";
type WorkspaceTab = "wizard" | "history";

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

async function loadMarketplaceRunHistory(marketplaceSlug: string): Promise<ExportRunRow[]> {
  const runsPayload = await fetch(`${API}/api/marketplace-export/runs`, {
    headers: authHeaders(),
    cache: "no-store",
  }).then(readJsonOrThrow);

  const listedRuns = normalizeExportRunRows(
    typeof runsPayload === "object" && runsPayload && "data" in runsPayload
      ? (runsPayload as { data?: unknown }).data
      : []
  ).filter((run) => run.marketplaceSlug === marketplaceSlug);

  return Promise.all(listedRuns.map(async (run) => {
    try {
      const detailPayload = await fetch(`${API}/api/marketplace-export/runs/${run.id}`, {
        headers: authHeaders(),
        cache: "no-store",
      }).then(readJsonOrThrow);
      const detailed = normalizeExportRunRows([
        typeof detailPayload === "object" && detailPayload && "data" in detailPayload
          ? (detailPayload as { data?: unknown }).data
          : null,
      ])[0];
      return detailed ?? run;
    } catch {
      return run;
    }
  }));
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
  const [tab, setTab] = useState<WorkspaceTab>("wizard");
  const [step, setStep] = useState<WizardStep>(
    initialSelection.marketplaceSlug ? "products" : "marketplace"
  );
  const [marketplaceSlug, setMarketplaceSlug] = useState(resolveMarketplaceSlugForMvp(initialSelection.marketplaceSlug || "allegro", AMAZON_UI_ENABLED));
  const [scopedProductIds, setScopedProductIds] = useState<number[]>(initialSelection.productIds);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection.productIds);
  const [rows, setRows] = useState(() => normalizeExportReadinessRows([]));
  const [productSummaries, setProductSummaries] = useState<ExportProductSummary[]>([]);
  const [productSummariesReady, setProductSummariesReady] = useState(false);
  const [readinessPage, setReadinessPage] = useState(1);
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
  const [aiBusyIds, setAiBusyIds] = useState<number[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const nextSelection = parseExportApiSelection(searchString);
    setMarketplaceSlug(resolveMarketplaceSlugForMvp(nextSelection.marketplaceSlug || "allegro", AMAZON_UI_ENABLED));
    setScopedProductIds(nextSelection.productIds);
    setSelectedIds(nextSelection.productIds);
    setSelectedAllegroAccountId(nextSelection.accountId);
    setConfirmNeedsReview(!!nextSelection.confirmNeedsReview);
    setAllegroFields(nextSelection.fields || DEFAULT_ALLEGRO_EXPORT_FIELDS);
    setPreflight(null);
    setReadinessPage(1);
    setStep(nextSelection.marketplaceSlug ? "products" : "marketplace");
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
      setProductSummariesReady(false);

      try {
        const readinessUrl = new URL(`${API}/api/marketplace-export/readiness`);
        readinessUrl.searchParams.set("marketplace", marketplaceSlug);
        if (marketplaceSlug === "allegro" && selectedAllegroAccountId) {
          readinessUrl.searchParams.set("accountId", String(selectedAllegroAccountId));
        }
        if (scopedProductIds.length > 0) {
          readinessUrl.searchParams.set("productIds", scopedProductIds.join(","));
        } else {
          readinessUrl.searchParams.set("page", String(readinessPage));
          readinessUrl.searchParams.set("limit", String(EXPORT_READINESS_LIMIT));
        }

        const [readinessPayload, nextRuns] = await Promise.all([
          fetch(readinessUrl.toString(), { headers: authHeaders(), cache: "no-store" }).then(readJsonOrThrow),
          loadMarketplaceRunHistory(marketplaceSlug),
        ]);

        if (cancelled) return;

        const nextRows = normalizeExportReadinessRows(
          typeof readinessPayload === "object" && readinessPayload && "data" in readinessPayload
            ? (readinessPayload as { data?: unknown }).data
            : []
        );
        setRows(nextRows);
        setRuns(nextRuns);
        setSelectedIds((current) => getSelectableExportReadinessIds(nextRows, current));

        // Enrich rows with product names, EAN and marketplace category mapping.
        // We fetch a focused list scoped to the readiness rows so the request stays bounded.
        const productIdsForEnrichment = nextRows.map((row) => row.productId);
        if (productIdsForEnrichment.length === 0) {
          setProductSummaries([]);
          setProductSummariesReady(true);
        } else {
          try {
            const productsUrl = new URL(`${API}/api/products/list`);
            productsUrl.searchParams.set("marketplace", marketplaceSlug);
            productsUrl.searchParams.set("page", "1");
            productsUrl.searchParams.set("limit", String(Math.max(productIdsForEnrichment.length, 50)));
            const productsPayload = await fetch(productsUrl.toString(), {
              headers: authHeaders(),
              cache: "no-store",
            }).then(readJsonOrThrow);

            if (cancelled) return;

            const summaries = normalizeExportProductSummaries(
              typeof productsPayload === "object" && productsPayload && "data" in productsPayload
                ? (productsPayload as { data?: unknown }).data
                : []
            );
            setProductSummaries(summaries);
            setProductSummariesReady(true);
          } catch {
            if (cancelled) return;
            // Enrichment is best-effort; rows still render with ID fallback.
            setProductSummaries([]);
            setProductSummariesReady(false);
          }
        }
      } catch (loadError) {
        if (cancelled) return;
        setRows([]);
        setRuns([]);
        setProductSummaries([]);
        setProductSummariesReady(false);
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
  }, [marketplaceSlug, scopedProductIds, selectedAllegroAccountId, readinessPage, reloadKey]);

  const marketplaceLabel = getMarketplaceLabel(marketplaceSlug);
  const miraklMode = isMiraklMarketplace(marketplaceSlug);
  const selectedCount = selectedIds.length;
  const activePreset = ALLEGRO_FIELD_PRESETS.find((preset) => fieldsEqual(preset.fields, allegroFields));

  const enrichedRows = useMemo(
    () => enrichExportReadinessRows(rows, productSummaries),
    [rows, productSummaries]
  );

  const visibleRows = useMemo(
    () => filterExportReadinessRowsForMarketplace(enrichedRows, marketplaceSlug, {
      enrichmentReady: productSummariesReady && productSummaries.length > 0,
    }),
    [enrichedRows, marketplaceSlug, productSummariesReady, productSummaries.length]
  );

  const filteredOutByCategory = enrichedRows.length - visibleRows.length;

  const effectiveConfirmNeedsReview = useMemo(
    () => shouldConfirmReviewForSelection(visibleRows, selectedIds, confirmNeedsReview),
    [visibleRows, selectedIds, confirmNeedsReview]
  );

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
          productIds: getSelectableExportReadinessIds(visibleRows, selectedIds),
          confirmNeedsReview: effectiveConfirmNeedsReview,
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
          confirmNeedsReview: effectiveConfirmNeedsReview,
          fields: marketplaceSlug === "allegro" ? allegroFields : null,
        }),
      }).then(readJsonOrThrow);
      const data = typeof payload === "object" && payload && "data" in payload
        ? payload as { data?: { runId?: number; jobId?: string } }
        : { data: null };

      setRunResult(`Run #${data.data?.runId ?? "-"} dodany do kolejki${data.data?.jobId ? ` (${data.data.jobId})` : ""}.`);

      setRuns(await loadMarketplaceRunHistory(marketplaceSlug));
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

  async function handleGenerateAi(productIds: number[]) {
    if (productIds.length === 0) return;

    const limited = productIds.slice(0, 10);
    if (limited.length < productIds.length) {
      setAiInfo(`Generuje AI dla pierwszych ${limited.length} produktow z ${productIds.length}. Powtorz dla reszty.`);
    } else {
      setAiInfo(null);
    }

    setAiBusyIds((current) => Array.from(new Set([...current, ...limited])));
    setAiError(null);

    try {
      const payload = await fetch(`${API}/api/products/generate-ai-bulk`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          productIds: limited,
          marketplaceSlug,
          mode: "all",
          useAllegro: false,
          useIcecat: false,
          useAmazon: false,
        }),
      }).then(readJsonOrThrow);

      const jobId = (payload as { data?: { job?: { id?: string } } } | null)?.data?.job?.id;
      setAiInfo(jobId
        ? `Job AI #${jobId} uruchomiony dla ${limited.length} produktow. Odswiez za chwile.`
        : `AI uruchomione dla ${limited.length} produktow.`);

      // refresh readiness po krotkim opoznieniu zeby AI zdazyl zapisac zmiany
      setTimeout(() => {
        setReloadKey((value) => value + 1);
      }, 4000);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Nie udalo sie uruchomic AI");
    } finally {
      setAiBusyIds((current) => current.filter((id) => !limited.includes(id)));
    }
  }

  const selectedProductCount = selectedIds.length;
  const stepsDone = {
    marketplace: !!marketplaceSlug && (marketplaceSlug !== "allegro" || !!selectedAllegroAccountId),
    products: selectedProductCount > 0,
    export: false,
  };

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-400">
              Export
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {tab === "history" ? "Historia exportow" : `Eksportuj produkty do ${marketplaceLabel}`}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Allegro publikuje przez API. Media Expert i Empik zwracaja gotowy plik Mirakl XLSX.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("wizard")}
              className={`rounded-lg px-4 py-2 font-semibold transition ${
                tab === "wizard" ? "bg-indigo-600 text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Eksport
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`rounded-lg px-4 py-2 font-semibold transition ${
                tab === "history" ? "bg-indigo-600 text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Historia ({runs.length})
            </button>
          </div>
        </div>

        {tab === "wizard" && (
          <div className="mt-5">
            <ol className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <StepperItem
                index={1}
                label="Marketplace"
                hint={marketplaceLabel}
                state={step === "marketplace" ? "active" : stepsDone.marketplace ? "done" : "todo"}
                onClick={() => setStep("marketplace")}
              />
              <StepperConnector />
              <StepperItem
                index={2}
                label="Produkty"
                hint={selectedProductCount > 0 ? `${selectedProductCount} zaznaczonych` : "wybierz lub generuj AI"}
                state={step === "products" ? "active" : selectedProductCount > 0 && step === "export" ? "done" : "todo"}
                onClick={() => stepsDone.marketplace && setStep("products")}
              />
              <StepperConnector />
              <StepperItem
                index={3}
                label="Eksport"
                hint={preflight ? `${preflight.eligibleCount} gotowe` : "preflight + pobierz"}
                state={step === "export" ? "active" : "todo"}
                onClick={() => selectedProductCount > 0 && setStep("export")}
              />
            </ol>
          </div>
        )}

        {error && tab === "wizard" && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
        {aiInfo && tab === "wizard" && (
          <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            {aiInfo}
          </div>
        )}
      </header>

      {tab === "history" && (
        <ExportRunHistoryCard
          marketplaceSlug={marketplaceSlug}
          runs={runs}
          loading={loading}
        />
      )}

      {tab === "wizard" && step === "marketplace" && (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Krok 1 z 3
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Wybierz marketplace
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Decyduje o formacie exportu i wymaganych atrybutach.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    setReadinessPage(1);
                  }}
                  className={getExportMarketplaceTabClass(active, option.enabled)}
                >
                  <div className="text-base font-semibold">{option.label}</div>
                  <div className={`mt-1 text-xs ${active ? "text-indigo-100" : "text-[var(--text-secondary)]"}`}>
                    {option.badge}
                  </div>
                </button>
              );
            })}
          </div>

          {marketplaceSlug === "allegro" && (
            <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4">
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

              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Zaawansowane: pola synchronizacji
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
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
              </details>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              aria-disabled={!stepsDone.marketplace}
              onClick={() => stepsDone.marketplace && setStep("products")}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                stepsDone.marketplace
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "cursor-not-allowed bg-indigo-200 text-indigo-500"
              }`}
            >
              Dalej: produkty
            </button>
          </div>
        </section>
      )}

      {tab === "wizard" && step === "products" && (
        <>
          <ExportProductsBoard
            marketplaceSlug={marketplaceSlug}
            marketplaceLabel={marketplaceLabel}
            rows={visibleRows}
            loading={loading}
            selectedIds={selectedIds}
            onSelectedIdsChange={(nextIds) => {
              setSelectedIds(nextIds);
              setPreflight(null);
            }}
            onOpenProduct={(productId) => router.push(`/dashboard/products/${productId}`)}
            onGenerateAi={handleGenerateAi}
            aiBusyIds={aiBusyIds}
            aiError={aiError}
            filteredOutByCategoryCount={filteredOutByCategory}
          />

          {scopedProductIds.length > 0 && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Pokazano {scopedProductIds.length} produktow z poprzedniego widoku.{" "}
              <button
                type="button"
                onClick={() => {
                  setScopedProductIds([]);
                  setPreflight(null);
                  setReadinessPage(1);
                }}
                className="font-semibold underline hover:text-white"
              >
                Pokaz wszystkie
              </button>
            </div>
          )}

          {scopedProductIds.length === 0 && (readinessPage > 1 || rows.length >= EXPORT_READINESS_LIMIT) && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
              <span>Strona {readinessPage} · max {EXPORT_READINESS_LIMIT} wynikow</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-disabled={readinessPage === 1}
                  onClick={() => {
                    if (readinessPage === 1) return;
                    setReadinessPage((current) => Math.max(1, current - 1));
                    setPreflight(null);
                  }}
                  className={`rounded-xl border px-3 py-2 font-semibold transition ${
                    readinessPage === 1
                      ? "cursor-not-allowed border-[var(--border-default)] text-[var(--text-tertiary)]"
                      : "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  Poprzednia
                </button>
                <button
                  type="button"
                  aria-disabled={rows.length < EXPORT_READINESS_LIMIT}
                  onClick={() => {
                    if (rows.length < EXPORT_READINESS_LIMIT) return;
                    setReadinessPage((current) => current + 1);
                    setPreflight(null);
                  }}
                  className={`rounded-xl border px-3 py-2 font-semibold transition ${
                    rows.length < EXPORT_READINESS_LIMIT
                      ? "cursor-not-allowed border-[var(--border-default)] text-[var(--text-tertiary)]"
                      : "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  Nastepna
                </button>
              </div>
            </div>
          )}

          <div className="sticky bottom-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("marketplace")}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            >
              Wstecz
            </button>
            <button
              type="button"
              aria-disabled={selectedCount === 0}
              onClick={() => {
                if (selectedCount === 0) return;
                void handleRunPreflight();
                setStep("export");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                selectedCount > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "cursor-not-allowed bg-emerald-200 text-emerald-700"
              }`}
            >
              {selectedCount > 0 ? `Dalej: eksportuj ${selectedCount}` : "Zaznacz produkty"}
            </button>
          </div>
        </>
      )}

      {tab === "wizard" && step === "export" && (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Krok 3 z 3
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Eksport do {marketplaceLabel}
          </h2>

          {preflightLoading && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Sprawdzam atrybuty, opisy i zdjecia ({selectedCount} produktow)...
            </p>
          )}

          {!preflightLoading && !preflight && (
            <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
              Brak danych preflight.{" "}
              <button
                type="button"
                onClick={() => void handleRunPreflight()}
                className="font-semibold text-indigo-300 underline"
              >
                Uruchom ponownie
              </button>
            </div>
          )}

          {preflight && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryCell
                  tone="ready"
                  label="Gotowe do exportu"
                  value={preflight.eligibleCount}
                />
                <SummaryCell
                  tone="danger"
                  label="Zablokowane"
                  value={preflight.blockedCount}
                />
                <SummaryCell
                  tone="info"
                  label={miraklMode ? "Format pliku" : "Wybrane pola"}
                  textValue={
                    miraklMode
                      ? "Mirakl XLSX"
                      : ALLEGRO_FIELD_KEYS.filter((field) => allegroFields[field])
                          .map((field) => ALLEGRO_FIELD_LABELS[field])
                          .join(", ") || "Brak"
                  }
                />
              </div>

              {preflight.groups.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    {miraklMode ? "Plik podzielony na kategorie" : "Grupy"}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {preflight.groups.map((group) => (
                      <div
                        key={`${group.classification}:${group.count}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{group.classification}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{group.count} produktow</div>
                        </div>
                        {miraklMode && (
                          <button
                            type="button"
                            aria-disabled={runLoading}
                            onClick={() => {
                              if (runLoading) return;
                              void handleDownloadMiraklFile(group.productIds, group.classification);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              runLoading
                                ? "cursor-not-allowed bg-slate-700 text-slate-400"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            Pobierz XLSX
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preflight.blockedItems.length > 0 && (
                <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {preflight.blockedItems.length} produktow zablokowanych w preflight
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("products")}
                      className="shrink-0 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                    >
                      Wroc do kroku 2
                    </button>
                  </div>
                  <p className="mt-1 text-rose-100/80">
                    Powody blokad ponizej. Otworz produkt aby go naprawic, albo uzyj Generuj AI.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {preflight.blockedItems.map((item) => {
                      const matchingRow = enrichedRows.find((row) => row.productId === item.productId);
                      const displayName = matchingRow ? getExportProductDisplayLabel(matchingRow) : `Produkt #${item.productId}`;
                      const badges = matchingRow ? getExportProductIdentifierBadges(matchingRow) : [`#${item.productId}`];
                      const reasons = item.blockers.length > 0
                        ? item.blockers
                        : matchingRow
                          ? [...matchingRow.blockers, ...matchingRow.missingRequiredFields].slice(0, 3)
                          : [];
                      const aiBusy = aiBusyIds.includes(item.productId);
                      return (
                        <li
                          key={item.productId}
                          className="rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-rose-50" title={displayName}>
                                {displayName}
                              </div>
                              {badges.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-rose-100/80">
                                  {badges.map((badge) => (
                                    <span
                                      key={badge}
                                      className="rounded-full border border-rose-300/30 bg-rose-500/20 px-2 py-0.5 font-mono"
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {reasons.length > 0 && (
                                <ul className="mt-2 space-y-0.5 text-xs text-rose-50/90">
                                  {reasons.slice(0, 4).map((reason) => (
                                    <li key={reason}>• {reason}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                aria-disabled={aiBusy}
                                onClick={() => {
                                  if (aiBusy) return;
                                  void handleGenerateAi([item.productId]);
                                }}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                  aiBusy
                                    ? "cursor-not-allowed bg-violet-200 text-violet-500"
                                    : "bg-violet-600 text-white hover:bg-violet-700"
                                }`}
                              >
                                {aiBusy ? "AI..." : "Generuj AI"}
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/products/${item.productId}`)}
                                className="rounded-lg border border-rose-300/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-50 hover:bg-rose-500/30"
                              >
                                Otworz
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {runResult && (
                <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {runResult}
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep("products")}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            >
              Wstecz
            </button>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                aria-disabled={!canRunPreflight || preflightLoading}
                onClick={() => {
                  if (!canRunPreflight || preflightLoading) return;
                  void handleRunPreflight();
                }}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  canRunPreflight && !preflightLoading
                    ? "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                    : "cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)]"
                }`}
              >
                {preflightLoading ? "Sprawdzam..." : "Sprawdz ponownie"}
              </button>

              <button
                type="button"
                aria-disabled={!canRunPrimaryExportAction}
                onClick={() => {
                  if (!canRunPrimaryExportAction) return;
                  if (miraklMode) {
                    void handleDownloadMiraklFile(
                      preflight!.eligibleItems.map((item) => item.productId),
                      preflight!.groups[0]?.classification
                    );
                    return;
                  }
                  void handleStartRun();
                }}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  canRunPrimaryExportAction
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "cursor-not-allowed bg-emerald-200 text-emerald-700"
                }`}
              >
                {miraklMode
                  ? runLoading
                    ? "Pobieram XLSX..."
                    : (preflight?.groups.length ?? 0) > 1
                      ? "Pobierz per kategoria"
                      : "Pobierz XLSX"
                  : runLoading
                    ? "Wysylam..."
                    : "Uruchom export"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

type StepperState = "todo" | "active" | "done";

function StepperItem({
  index,
  label,
  hint,
  state,
  onClick,
}: {
  index: number;
  label: string;
  hint?: string;
  state: StepperState;
  onClick?: () => void;
}) {
  const baseCircle = "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition";
  const circleTone = state === "active"
    ? "bg-indigo-600 text-white"
    : state === "done"
      ? "bg-emerald-500 text-white"
      : "bg-[var(--bg-body)] text-[var(--text-tertiary)] border border-[var(--border-default)]";
  const labelTone = state === "active"
    ? "text-[var(--text-primary)]"
    : state === "done"
      ? "text-emerald-300"
      : "text-[var(--text-secondary)]";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-[var(--bg-card-hover)]"
      >
        <span className={`${baseCircle} ${circleTone}`}>
          {state === "done" ? "✓" : index}
        </span>
        <span className="flex flex-col">
          <span className={`text-sm font-semibold ${labelTone}`}>{label}</span>
          {hint && <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>}
        </span>
      </button>
    </li>
  );
}

function StepperConnector() {
  return (
    <li aria-hidden="true" className="hidden h-px flex-1 bg-[var(--border-default)] sm:block" />
  );
}

function SummaryCell({
  tone,
  label,
  value,
  textValue,
}: {
  tone: "ready" | "danger" | "info";
  label: string;
  value?: number;
  textValue?: string;
}) {
  const toneClass =
    tone === "ready"
      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
      : tone === "danger"
        ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
        : "border-sky-400/60 bg-sky-500/10 text-sky-100";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">
        {textValue ?? value ?? 0}
      </div>
    </div>
  );
}
