"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EXPORT_BUCKET_PAGE_SIZE,
  clampSearchQuery,
  filterExportReadinessRows,
  getExportProductDisplayLabel,
  getExportProductIdentifierBadges,
  getExportReadinessPresentation,
  paginateExportBucket,
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
  filteredOutByCategoryCount?: number;
};

type Bucket = "ready" | "needs_review" | "blocked";

type BoardCard = {
  row: ExportReadinessRow;
  bucket: Bucket;
  label: string;
  description: string;
  acceptedReview: boolean;
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

function toBoardCards(rows: ExportReadinessRow[], acceptedReviewIds: Set<number>): BoardCard[] {
  return rows.map((row) => {
    const presentation = getExportReadinessPresentation(row);
    const accepted = presentation.bucket === "needs_review" && acceptedReviewIds.has(row.productId);
    return {
      row,
      bucket: accepted ? "ready" : presentation.bucket,
      label: accepted ? "Zaakceptowano review" : presentation.label,
      description: accepted
        ? "Review zatwierdzone. Trafi do preflight z confirmNeedsReview."
        : presentation.description,
      acceptedReview: accepted,
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

const BUCKET_ORDER: Bucket[] = ["ready", "needs_review", "blocked"];

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
  filteredOutByCategoryCount = 0,
}: ExportProductsBoardProps) {
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [bucketVisible, setBucketVisible] = useState<Record<Bucket, number>>({
    ready: EXPORT_BUCKET_PAGE_SIZE,
    needs_review: EXPORT_BUCKET_PAGE_SIZE,
    blocked: EXPORT_BUCKET_PAGE_SIZE,
  });

  // Debounce search query so 10K-row haystack doesn't run on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(clampSearchQuery(queryInput));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  // When the underlying row set or search query changes, reset bucket pagination
  // so the user sees the freshest top-N results rather than scrolled-out history.
  useEffect(() => {
    setBucketVisible({
      ready: EXPORT_BUCKET_PAGE_SIZE,
      needs_review: EXPORT_BUCKET_PAGE_SIZE,
      blocked: EXPORT_BUCKET_PAGE_SIZE,
    });
  }, [rows, debouncedQuery]);

  const filtered = useMemo(() => {
    return filterExportReadinessRows(rows, {
      statusFilter: "all",
      operationFilter: "all",
      query: debouncedQuery,
    });
  }, [rows, debouncedQuery]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Rows that were originally in "needs_review" and the user already selected them
  // act as "accepted review" - they should visibly move to the "ready" column
  // and trigger preflight with confirmNeedsReview=true.
  const acceptedReviewIds = useMemo(() => {
    const accepted = new Set<number>();
    for (const row of rows) {
      if (!selectedSet.has(row.productId)) continue;
      if (getExportReadinessPresentation(row).bucket === "needs_review") {
        accepted.add(row.productId);
      }
    }
    return accepted;
  }, [rows, selectedSet]);

  const cards = useMemo(() => toBoardCards(filtered, acceptedReviewIds), [filtered, acceptedReviewIds]);

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

  const totalSelectable = grouped.ready.length + grouped.needs_review.length;
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

  const selectAllVisible = () => {
    const visibleSelectableIds = cards
      .filter((card) => card.bucket !== "blocked" && getExportReadinessPresentation(card.row).selectable)
      .map((card) => card.row.productId);
    if (visibleSelectableIds.length === 0) return;
    const merged = Array.from(new Set([...selectedIds, ...visibleSelectableIds]));
    onSelectedIdsChange(merged);
  };

  const clearSelection = () => {
    if (selectedIds.length === 0) return;
    onSelectedIdsChange([]);
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
              {selectedIds.length > 0 ? ` • ${selectedIds.length} zaznaczonych` : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Szukaj po nazwie, EAN, SKU, kategorii, blokadzie..."
              className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400 sm:w-80"
              maxLength={200}
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

        {totalSelectable > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>Akcje masowe:</span>
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-1.5 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            >
              Zaznacz wszystkie pasujace ({totalSelectable})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              aria-disabled={selectedIds.length === 0}
              className={`rounded-lg border px-3 py-1.5 font-semibold transition ${
                selectedIds.length === 0
                  ? "cursor-not-allowed border-[var(--border-default)] text-[var(--text-tertiary)]"
                  : "border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              Wyczysc zaznaczenie
            </button>
          </div>
        )}

        {aiError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {aiError}
          </div>
        )}

        {filteredOutByCategoryCount > 0 && (
          <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            Ukryto {filteredOutByCategoryCount} produktow bez kategorii dla {marketplaceLabel}.
            Otworz produkt i przypisz kategorie marketplace, aby pojawil sie na liscie.
          </div>
        )}

        {debouncedQuery && cards.length === 0 && rows.length > 0 && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Brak dopasowan dla &quot;{debouncedQuery}&quot;. Wyczysc filtr aby zobaczyc {rows.length} produktow.
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="m-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          {rows.length === 0
            ? "Brak produktow dla tego marketplace."
            : "Brak produktow dopasowanych do filtra."}
        </div>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {BUCKET_ORDER.map((bucket) => {
            const bucketCards = grouped[bucket];
            const tone = BUCKET_TONE[bucket];
            const slice = paginateExportBucket(bucketCards, bucketVisible[bucket]);

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
                  {slice.visible.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-6 text-center text-xs text-[var(--text-tertiary)]">
                      Pusto
                    </div>
                  ) : (
                    slice.visible.map((card) => {
                      const presentation = getExportReadinessPresentation(card.row);
                      const selectable = presentation.selectable;
                      const checked = selectedIds.includes(card.row.productId);
                      const reasons = getCardReasons(card.row);
                      const aiBusy = aiBusyIds.includes(card.row.productId);
                      const displayName = getExportProductDisplayLabel(card.row);
                      const identifierBadges = getExportProductIdentifierBadges(card.row);
                      const isAcceptedReview = card.acceptedReview;

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
                                aria-label={`Zaznacz ${displayName}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => onOpenProduct(card.row.productId)}
                                className="block w-full truncate text-left text-sm font-semibold text-[var(--text-primary)] hover:text-indigo-300"
                                title={displayName}
                              >
                                {displayName}
                              </button>
                              {identifierBadges.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[var(--text-tertiary)]">
                                  {identifierBadges.map((badge) => (
                                    <span
                                      key={badge}
                                      className="max-w-full truncate rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-0.5 font-mono"
                                      title={badge}
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                                {card.row.classification || "bez klasyfikacji"}
                              </div>

                              {isAcceptedReview && (
                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                  Review zaakceptowane
                                </div>
                              )}

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
                            {card.bucket === "blocked" && (
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
                            {card.bucket === "ready" && !checked && selectable && !isAcceptedReview && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(card.row.productId, true)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Dodaj do exportu
                              </button>
                            )}
                            {isAcceptedReview && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(card.row.productId, true)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Cofnij akceptacje
                              </button>
                            )}
                            {card.bucket === "needs_review" && selectable && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(card.row.productId, true)}
                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                              >
                                Akceptuj review
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}

                  {slice.hasMore && (
                    <button
                      type="button"
                      onClick={() =>
                        setBucketVisible((current) => ({
                          ...current,
                          [bucket]: (current[bucket] || EXPORT_BUCKET_PAGE_SIZE) + EXPORT_BUCKET_PAGE_SIZE,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                    >
                      Pokaz wiecej ({slice.hiddenCount})
                    </button>
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
