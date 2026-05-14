"use client";

import { useMemo, useState } from "react";

import {
  filterExportReadinessRows,
  getExportReadinessPresentation,
  type ExportReadinessRow,
} from "./export-api-helpers";

type ExportProductsBoardProps = {
  marketplaceSlug: string;
  marketplaceLabel: string;
  rows: ExportReadinessRow[];
  loading: boolean;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onOpenProduct: (productId: number) => void;
  onGenerateAi: (productIds: number[]) => Promise<void> | void;
  aiBusyIds: number[];
  aiError: string | null;
};

type Bucket = "ready" | "needs_review" | "blocked";

type BoardCard = {
  row: ExportReadinessRow;
  bucket: Bucket;
  label: string;
  description: string;
};

const BUCKET_TITLES: Record<Bucket, string> = {
  ready: "Gotowe do exportu",
  needs_review: "Wymaga review",
  blocked: "Braki do uzupelnienia",
};

const BUCKET_HINTS: Record<Bucket, string> = {
  ready: "Produkty spelniaja wymagania marketplace. Zaznacz i przejdz dalej.",
  needs_review: "Klik = akceptuj zmiane i odblokuj export.",
  blocked: "Generuj AI uzupelni atrybuty, opis i zdjecia automatycznie.",
};

const BUCKET_TONE: Record<Bucket, { wrap: string; head: string; count: string }> = {
  ready: {
    wrap: "border-emerald-400/60 bg-emerald-500/5",
    head: "text-emerald-300",
    count: "bg-emerald-500/15 text-emerald-100",
  },
  needs_review: {
    wrap: "border-amber-400/60 bg-amber-500/5",
    head: "text-amber-300",
    count: "bg-amber-500/15 text-amber-100",
  },
  blocked: {
    wrap: "border-rose-400/60 bg-rose-500/5",
    head: "text-rose-300",
    count: "bg-rose-500/15 text-rose-100",
  },
};

function toBoardCards(rows: ExportReadinessRow[]): BoardCard[] {
  return rows.map((row) => {
    const presentation = getExportReadinessPresentation(row);
    return {
      row,
      bucket: presentation.bucket,
      label: presentation.label,
      description: presentation.description,
    };
  });
}

function getCardReasons(row: ExportReadinessRow) {
  return [
    ...row.blockers,
    ...row.missingRequiredFields,
    ...row.warnings,
  ].slice(0, 3);
}

export function ExportProductsBoard({
  marketplaceSlug: _marketplaceSlug,
  marketplaceLabel,
  rows,
  loading,
  selectedIds,
  onSelectedIdsChange,
  onOpenProduct,
  onGenerateAi,
  aiBusyIds,
  aiError,
}: ExportProductsBoardProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return filterExportReadinessRows(rows, {
      statusFilter: "all",
      operationFilter: "all",
      query,
    });
  }, [rows, query]);

  const cards = useMemo(() => toBoardCards(filtered), [filtered]);

  const grouped = useMemo(() => {
    const result: Record<Bucket, BoardCard[]> = {
      ready: [],
      needs_review: [],
      blocked: [],
    };
    for (const card of cards) {
      result[card.bucket].push(card);
    }
    return result;
  }, [cards]);

  const totals = {
    ready: grouped.ready.length,
    needs_review: grouped.needs_review.length,
    blocked: grouped.blocked.length,
    total: cards.length,
  };

  const blockedIds = grouped.blocked.map((card) => card.row.productId);
  const someAiBusy = aiBusyIds.length > 0;
  const canBulkAi = blockedIds.length > 0 && !someAiBusy;

  const toggleSelect = (productId: number, selectable: boolean) => {
    if (!selectable) {
      onOpenProduct(productId);
      return;
    }
    if (selectedIds.includes(productId)) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== productId));
      return;
    }
    onSelectedIdsChange([...selectedIds, productId]);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
        Laduje produkty do exportu {marketplaceLabel}...
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-default)] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
              Krok 2 z 3
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              Produkty do exportu {marketplaceLabel}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {totals.total} produktow • {totals.ready} gotowe • {totals.needs_review} review • {totals.blocked} braki
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj produktu, ID, blokady..."
              className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400 sm:w-72"
            />
            <button
              type="button"
              aria-disabled={!canBulkAi}
              onClick={() => {
                if (!canBulkAi) return;
                void onGenerateAi(blockedIds);
              }}
              className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${
                canBulkAi
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "cursor-not-allowed bg-violet-200 text-violet-500"
              }`}
              title={blockedIds.length > 0 ? `Generuj AI dla ${blockedIds.length} produktow z brakami` : "Brak produktow z brakami"}
            >
              {someAiBusy ? "Generuje AI..." : `Generuj AI dla ${blockedIds.length} brakow`}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {aiError}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="m-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak produktow dla tego marketplace lub filtra.
        </div>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {(["ready", "needs_review", "blocked"] as Bucket[]).map((bucket) => {
            const bucketCards = grouped[bucket];
            const tone = BUCKET_TONE[bucket];

            return (
              <div
                key={bucket}
                className={`flex flex-col rounded-2xl border ${tone.wrap}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3">
                  <div>
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.head}`}>
                      {BUCKET_TITLES[bucket]}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      {BUCKET_HINTS[bucket]}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone.count}`}>
                    {bucketCards.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 p-3">
                  {bucketCards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-6 text-center text-xs text-[var(--text-tertiary)]">
                      Pusto
                    </div>
                  ) : (
                    bucketCards.map((card) => {
                      const presentation = getExportReadinessPresentation(card.row);
                      const selectable = presentation.selectable;
                      const checked = selectedIds.includes(card.row.productId);
                      const reasons = getCardReasons(card.row);
                      const aiBusy = aiBusyIds.includes(card.row.productId);

                      return (
                        <article
                          key={card.row.productId}
                          className={`rounded-xl border bg-[var(--bg-body)] px-3 py-3 transition ${
                            checked
                              ? "border-indigo-400/70 ring-1 ring-indigo-400/40"
                              : "border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {selectable && (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelect(card.row.productId, selectable)}
                                className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--border-default)] bg-[var(--bg-card)] text-indigo-600"
                                aria-label={`Zaznacz produkt ${card.row.productId}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => onOpenProduct(card.row.productId)}
                                className="truncate text-left text-sm font-semibold text-[var(--text-primary)] hover:text-indigo-300"
                              >
                                Produkt #{card.row.productId}
                              </button>
                              <div className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                                {card.row.classification || "bez klasyfikacji"}
                              </div>

                              {reasons.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                                  {reasons.map((reason) => (
                                    <li key={reason} className="truncate">
                                      • {reason}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {bucket === "blocked" && (
                              <button
                                type="button"
                                aria-disabled={aiBusy}
                                onClick={() => {
                                  if (aiBusy) return;
                                  void onGenerateAi([card.row.productId]);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  aiBusy
                                    ? "cursor-not-allowed bg-violet-200 text-violet-500"
                                    : "bg-violet-600 text-white hover:bg-violet-700"
                                }`}
                              >
                                {aiBusy ? "AI..." : "Generuj AI"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenProduct(card.row.productId)}
                              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                            >
                              Otworz produkt
                            </button>
                            {bucket === "ready" && !checked && selectable && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(card.row.productId, true)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Dodaj do exportu
                              </button>
                            )}
                            {bucket === "needs_review" && selectable && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(card.row.productId, true)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  checked
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-amber-500 text-white hover:bg-amber-600"
                                }`}
                              >
                                {checked ? "Zaakceptowano" : "Akceptuj"}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
