import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterExportReadinessRows,
  getExportProductDisplayLabel,
  getExportProductIdentifierBadges,
  getExportReadyBulkSelectionControl,
  getExportReadinessPresentation,
  type ExportReadinessRow,
  type ExportReadinessStatus,
} from "./export-api-helpers";

type ExportReadinessTableProps = {
  marketplaceSlug: string;
  marketplaceLabel: string;
  rows: ExportReadinessRow[];
  loading: boolean;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onOpenProduct: (productId: number) => void;
  onGenerateAi: (productIds: number[]) => void;
  aiBusyIds: number[];
  aiError: string | null;
  filteredOutByCategoryCount?: number;
};

type ExportColumnKey = ExportReadinessStatus;

type ExportDisplayRow = {
  row: ExportReadinessRow;
  bucket: ExportColumnKey;
  label: string;
  description: string;
  acceptedReview: boolean;
};

const COLUMN_ORDER: ExportColumnKey[] = ["ready", "needs_review", "blocked"];

const COLUMN_TITLES: Record<ExportColumnKey, string> = {
  ready: "Gotowe do exportu",
  needs_review: "Wymaga review",
  blocked: "Braki do uzupelnienia",
};

const COLUMN_DESCRIPTIONS: Record<ExportColumnKey, string> = {
  ready: "Produkty spelniaja wymagania marketplace. Zaznacz i przejdz dalej.",
  needs_review: "Klik = akceptuj zmiane i odblokuj export.",
  blocked: "Generuj AI uzupelni atrybuty, opis i zdjecia automatycznie.",
};

const COLUMN_CLASSES: Record<ExportColumnKey, { wrap: string; head: string; count: string }> = {
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

function getVisibleIssueLabels(row: ExportReadinessRow) {
  return [
    ...row.blockers,
    ...row.missingRequiredFields,
    ...row.warnings,
  ].slice(0, 3);
}

export function ExportReadinessTable({
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
}: ExportReadinessTableProps) {
  const [query, setQuery] = useState("");
  const readyHeaderCheckboxRef = useRef<HTMLInputElement>(null);
  const visibleRows = useMemo(
    () => filterExportReadinessRows(rows, { statusFilter: "all", operationFilter: "all", query }),
    [rows, query]
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const acceptedReviewIds = useMemo(() => {
    const ids = new Set<number>();
    rows.forEach((row) => {
      if (selectedIdSet.has(row.productId) && getExportReadinessPresentation(row).bucket === "needs_review") {
        ids.add(row.productId);
      }
    });
    return ids;
  }, [rows, selectedIdSet]);
  const displayRows = useMemo<ExportDisplayRow[]>(
    () => visibleRows.map((row) => {
      const presentation = getExportReadinessPresentation(row);
      const acceptedReview = presentation.bucket === "needs_review" && acceptedReviewIds.has(row.productId);

      return {
        row,
        bucket: acceptedReview ? "ready" : presentation.bucket,
        label: acceptedReview ? "Zaakceptowano review" : presentation.label,
        description: acceptedReview
          ? "Review zatwierdzone. Trafi do preflight z confirmNeedsReview."
          : presentation.description,
        acceptedReview,
      };
    }),
    [visibleRows, acceptedReviewIds]
  );
  const rowsByBucket = useMemo(() => {
    const grouped: Record<ExportColumnKey, ExportDisplayRow[]> = {
      ready: [],
      needs_review: [],
      blocked: [],
    };
    displayRows.forEach((row) => {
      grouped[row.bucket].push(row);
    });
    return grouped;
  }, [displayRows]);
  const readyBulkControl = getExportReadyBulkSelectionControl(visibleRows, selectedIds);
  const blockedIds = rowsByBucket.blocked.map((entry) => entry.row.productId);
  const aiBusy = aiBusyIds.length > 0;
  const canGenerateAi = blockedIds.length > 0 && !aiBusy;
  const summary = {
    ready: rowsByBucket.ready.length,
    needs_review: rowsByBucket.needs_review.length,
    blocked: rowsByBucket.blocked.length,
    total: displayRows.length,
  };

  useEffect(() => {
    if (readyHeaderCheckboxRef.current) {
      readyHeaderCheckboxRef.current.indeterminate = readyBulkControl.indeterminate;
    }
  }, [readyBulkControl.indeterminate]);

  const toggleProduct = (productId: number, selectable: boolean) => {
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
              {summary.total} produktow * {summary.ready} gotowe * {summary.needs_review} review * {summary.blocked} braki
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
              aria-disabled={!canGenerateAi}
              onClick={() => {
                if (canGenerateAi) onGenerateAi(blockedIds);
              }}
              className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${
                canGenerateAi
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "cursor-not-allowed bg-violet-200 text-violet-500"
              }`}
              title={blockedIds.length > 0 ? `Generuj AI dla ${blockedIds.length} produktow z brakami` : "Brak produktow z brakami"}
            >
              {aiBusy ? "Generuje AI..." : `Generuj AI dla ${blockedIds.length} brakow`}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {aiError}
          </div>
        )}

        {filteredOutByCategoryCount > 0 && (
          <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            Ukryto {filteredOutByCategoryCount} produktow, ktore nie maja kategorii dla {marketplaceLabel}. Produkty bez kategorii nie da sie wyeksportowac do tego marketplace. Otworz produkt i przypisz kategorie, aby pojawil sie tutaj.
          </div>
        )}
      </div>

      {displayRows.length === 0 ? (
        <div className="m-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak produktow dla tego marketplace lub filtra.
        </div>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {COLUMN_ORDER.map((bucket) => {
            const columnRows = rowsByBucket[bucket];
            const classes = COLUMN_CLASSES[bucket];
            const isReadyColumn = bucket === "ready";

            return (
              <div key={bucket} className={`flex flex-col rounded-2xl border ${classes.wrap}`}>
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isReadyColumn && (
                        <input
                          ref={readyHeaderCheckboxRef}
                          type="checkbox"
                          checked={readyBulkControl.allReadySelected}
                          aria-checked={readyBulkControl.ariaChecked}
                          aria-disabled={readyBulkControl.disabled}
                          aria-label={readyBulkControl.checkboxLabel}
                          onChange={() => {
                            if (readyBulkControl.disabled) return;
                            onSelectedIdsChange(readyBulkControl.selectedIds);
                          }}
                          className={`h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-card)] text-emerald-500 ${
                            readyBulkControl.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                          }`}
                        />
                      )}
                      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.head}`}>
                        {COLUMN_TITLES[bucket]}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      {COLUMN_DESCRIPTIONS[bucket]}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${classes.count}`}>
                    {columnRows.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 p-3">
                  {columnRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-6 text-center text-xs text-[var(--text-tertiary)]">
                      Pusto
                    </div>
                  ) : (
                    columnRows.map((entry) => {
                      const presentation = getExportReadinessPresentation(entry.row);
                      const selectable = presentation.selectable;
                      const checked = selectedIds.includes(entry.row.productId);
                      const issues = getVisibleIssueLabels(entry.row);
                      const aiBusyForRow = aiBusyIds.includes(entry.row.productId);
                      const label = getExportProductDisplayLabel(entry.row);
                      const badges = getExportProductIdentifierBadges(entry.row);

                      return (
                        <article
                          key={entry.row.productId}
                          className={`rounded-xl border bg-[var(--bg-body)] px-3 py-3 transition ${
                            checked ? "border-indigo-400/70 ring-1 ring-indigo-400/40" : "border-[var(--border-default)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {selectable && (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(entry.row.productId, selectable)}
                                className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--border-default)] bg-[var(--bg-card)] text-indigo-600"
                                aria-label={`Zaznacz ${label}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => onOpenProduct(entry.row.productId)}
                                className="block w-full truncate text-left text-sm font-semibold text-[var(--text-primary)] hover:text-indigo-300"
                                title={label}
                              >
                                {label}
                              </button>
                              {badges.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[var(--text-tertiary)]">
                                  {badges.map((badge) => (
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
                                {entry.row.classification || "bez klasyfikacji"}
                              </div>
                              {entry.acceptedReview && (
                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                  Review zaakceptowane
                                </div>
                              )}
                              {issues.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                                  {issues.map((issue) => (
                                    <li key={issue} className="truncate">
                                      - {issue}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.bucket === "blocked" && (
                              <button
                                type="button"
                                aria-disabled={aiBusyForRow}
                                onClick={() => {
                                  if (!aiBusyForRow) onGenerateAi([entry.row.productId]);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  aiBusyForRow
                                    ? "cursor-not-allowed bg-violet-200 text-violet-500"
                                    : "bg-violet-600 text-white hover:bg-violet-700"
                                }`}
                              >
                                {aiBusyForRow ? "AI..." : "Generuj AI"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenProduct(entry.row.productId)}
                              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                            >
                              Otworz produkt
                            </button>
                            {entry.bucket === "ready" && !checked && selectable && (
                              <button
                                type="button"
                                onClick={() => toggleProduct(entry.row.productId, true)}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Dodaj do exportu
                              </button>
                            )}
                            {entry.acceptedReview && (
                              <button
                                type="button"
                                onClick={() => toggleProduct(entry.row.productId, true)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Cofnij akceptacje
                              </button>
                            )}
                            {entry.bucket === "needs_review" && selectable && (
                              <button
                                type="button"
                                onClick={() => toggleProduct(entry.row.productId, true)}
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
