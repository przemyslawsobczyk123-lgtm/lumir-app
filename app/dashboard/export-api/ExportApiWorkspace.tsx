"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ExportReadinessTable } from "./ExportReadinessTable";
import { ExportRunHistoryCard } from "./ExportRunHistoryCard";
import {
  normalizeExportReadinessRows,
  normalizeExportRunRows,
  parseExportApiSelection,
  type ExportReadinessFilter,
  type ExportPreflightResult,
} from "./export-api-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MARKETPLACE_OPTIONS = [
  { value: "allegro", label: "Allegro" },
  { value: "amazon", label: "Amazon" },
] as const;

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

function normalizePreflight(input: unknown): ExportPreflightResult | null {
  if (typeof input !== "object" || !input) return null;

  const data = input as Record<string, unknown>;
  const eligibleItems = Array.isArray(data.eligibleItems) ? data.eligibleItems : [];
  const blockedItems = Array.isArray(data.blockedItems) ? data.blockedItems : [];
  const groups = Array.isArray(data.groups) ? data.groups : [];

  return {
    marketplaceSlug: typeof data.marketplaceSlug === "string" ? data.marketplaceSlug : "",
    eligibleCount: Number(data.eligibleCount || 0),
    blockedCount: Number(data.blockedCount || 0),
    eligibleItems: eligibleItems
      .map((item) => {
        const entry = typeof item === "object" && item ? item as Record<string, unknown> : {};
        return {
          productId: Number(entry.productId || 0),
          classification: typeof entry.classification === "string" && entry.classification.trim()
            ? entry.classification.trim()
            : "unclassified",
          warnings: Array.isArray(entry.warnings) ? entry.warnings.map((value) => String(value || "").trim()).filter(Boolean) : [],
        };
      })
      .filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    blockedItems: blockedItems
      .map((item) => {
        const entry = typeof item === "object" && item ? item as Record<string, unknown> : {};
        return {
          productId: Number(entry.productId || 0),
          blockers: Array.isArray(entry.blockers) ? entry.blockers.map((value) => String(value || "").trim()).filter(Boolean) : [],
        };
      })
      .filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    groups: groups
      .map((group) => {
        const entry = typeof group === "object" && group ? group as Record<string, unknown> : {};
        const productIds = Array.isArray(entry.productIds)
          ? entry.productIds
            .map((value) => Number.parseInt(String(value || ""), 10))
            .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index)
          : [];

        return {
          classification: typeof entry.classification === "string" && entry.classification.trim()
            ? entry.classification.trim()
            : "unclassified",
          count: Number(entry.count || productIds.length || 0),
          productIds,
        };
      })
      .filter((group) => group.count > 0),
  };
}

function marketplaceHelperCopy(marketplaceSlug: string) {
  if (marketplaceSlug === "amazon") {
    return {
      eyebrow: "Validation only",
      body: "Amazon wpiety do readiness i preflight, ale bez write-side run CTA w tym slice.",
    };
  }

  return {
    eyebrow: "Batch preflight",
    body: "Allegro batch flow pokazuje gotowosc i backend preflight. Realny run CTA czeka na worker coverage.",
  };
}

export function ExportApiWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const initialSelection = useMemo(
    () => parseExportApiSelection(searchString),
    [searchString]
  );
  const [marketplaceSlug, setMarketplaceSlug] = useState(initialSelection.marketplaceSlug || "allegro");
  const [scopedProductIds, setScopedProductIds] = useState<number[]>(initialSelection.productIds);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection.productIds);
  const [statusFilter, setStatusFilter] = useState<ExportReadinessFilter>("all");
  const [rows, setRows] = useState(() => normalizeExportReadinessRows([]));
  const [runs, setRuns] = useState(() => normalizeExportRunRows([]));
  const [loading, setLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null);

  useEffect(() => {
    const nextSelection = parseExportApiSelection(searchString);
    setMarketplaceSlug(nextSelection.marketplaceSlug || "allegro");
    setScopedProductIds(nextSelection.productIds);
    setSelectedIds(nextSelection.productIds);
    setPreflight(null);
  }, [searchString]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const readinessUrl = new URL(`${API}/api/marketplace-export/readiness`);
        readinessUrl.searchParams.set("marketplace", marketplaceSlug);
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
        const visibleRowIds = new Set(nextRows.map((row) => row.productId));
        setSelectedIds((current) => current.filter((id) => visibleRowIds.has(id)));
      } catch (loadError) {
        if (cancelled) return;
        setRows([]);
        setRuns([]);
        setError(loadError instanceof Error ? loadError.message : "Nie udalo sie zaladowac Export API");
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
  }, [marketplaceSlug, scopedProductIds]);

  const copy = marketplaceHelperCopy(marketplaceSlug);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "needs_review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const selectedCount = selectedIds.length;

  async function handleRunPreflight() {
    if (selectedIds.length === 0 || preflightLoading) return;

    setPreflightLoading(true);
    setError(null);

    try {
      const payload = await fetch(`${API}/api/marketplace-export/preflight`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          marketplaceSlug,
          productIds: selectedIds,
        }),
      }).then(readJsonOrThrow);

      setPreflight(
        normalizePreflight(
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-400">
              Export API
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              Batch export workspace per marketplace
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Jedno miejsce na readiness, preflight i historie runow. Konfiguracja kont i kategorii zostaje w
              sekcji Marketplace, a single-item review dalej siedzi na detail page produktu.
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
              {copy.eyebrow}
            </div>
            <p className="mt-2 text-sm text-indigo-100">
              {copy.body}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[220px] flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Marketplace
              <select
                value={marketplaceSlug}
                onChange={(event) => {
                  setMarketplaceSlug(event.target.value);
                  setPreflight(null);
                }}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm font-medium tracking-normal text-[var(--text-primary)] outline-none transition focus:border-indigo-400"
              >
                {MARKETPLACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2 self-end">
              <button
                type="button"
                aria-disabled={selectedCount === 0 || preflightLoading}
                onClick={() => {
                  if (selectedCount === 0 || preflightLoading) return;
                  void handleRunPreflight();
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  selectedCount === 0 || preflightLoading
                    ? "cursor-not-allowed bg-indigo-200 text-indigo-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {preflightLoading ? "Leci preflight..." : `Uruchom preflight (${selectedCount})`}
              </button>

              <button
                type="button"
                aria-disabled={selectedCount === 0}
                onClick={() => {
                  if (selectedCount === 0) return;
                  setSelectedIds([]);
                  setPreflight(null);
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  selectedCount === 0
                    ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)]"
                    : "border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                Wyczysc selection
              </button>

              {scopedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setScopedProductIds([]);
                    setPreflight(null);
                  }}
                  className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15"
                >
                  Pokaz ostatnie 50
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Ready <span className="ml-1 font-semibold">{readyCount}</span>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Needs review <span className="ml-1 font-semibold">{reviewCount}</span>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              Blocked <span className="ml-1 font-semibold">{blockedCount}</span>
            </div>
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
        <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
                Preflight summary
              </div>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {preflight.marketplaceSlug || marketplaceSlug}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Eligible: {preflight.eligibleCount}. Blocked: {preflight.blockedCount}. Grupowanie po klasyfikacji gotowe pod batch orchestration.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              Run CTA ukryte do czasu worker coverage dla `marketplace_export`.
            </div>
          </div>

          {preflight.groups.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Grupy klasyfikacji
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preflight.groups.map((group) => (
                  <div
                    key={`${group.classification}:${group.count}`}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {group.classification} <span className="ml-1 text-[var(--text-secondary)]">({group.count})</span>
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
                    className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
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
