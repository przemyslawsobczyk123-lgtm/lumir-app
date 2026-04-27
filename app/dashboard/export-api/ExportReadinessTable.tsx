import { useState } from "react";

import {
  canSelectExportReadinessRow,
  filterExportReadinessRows,
  getExportReadinessPresentation,
  type ExportOperationFilter,
  type ExportOperationTone,
  type ExportReadinessFilter,
  type ExportReadinessRow,
} from "./export-api-helpers";

type ExportReadinessTableProps = {
  marketplaceSlug: string;
  marketplaceLabel: string;
  rows: ExportReadinessRow[];
  loading: boolean;
  selectedIds: number[];
  statusFilter: ExportReadinessFilter;
  onStatusFilterChange: (filter: ExportReadinessFilter) => void;
  onSelectedIdsChange: (ids: number[]) => void;
  onOpenProduct: (productId: number) => void;
};

const FILTER_OPTIONS: Array<{ value: ExportReadinessFilter; label: string }> = [
  { value: "all", label: "Wszystko" },
  { value: "ready", label: "Gotowe" },
  { value: "needs_review", label: "Review" },
  { value: "blocked", label: "Blokady" },
];

const OPERATION_FILTER_OPTIONS: Array<{ value: ExportOperationFilter; label: string }> = [
  { value: "all", label: "Wszystkie operacje" },
  { value: "existing", label: "Aktualizacje" },
  { value: "create", label: "Nowe oferty" },
  { value: "conflict", label: "Konflikty" },
  { value: "missing_link", label: "Brak linku" },
];

function getToneClasses(tone: ExportOperationTone) {
  if (tone === "ready") {
    return {
      badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
      row: "hover:border-emerald-400/30",
    };
  }

  if (tone === "warning") {
    return {
      badge: "border-amber-400/25 bg-amber-500/10 text-amber-100",
      row: "hover:border-amber-400/30",
    };
  }

  if (tone === "danger") {
    return {
      badge: "border-rose-400/25 bg-rose-500/10 text-rose-100",
      row: "hover:border-rose-400/30",
    };
  }

  return {
    badge: "border-sky-400/25 bg-sky-500/10 text-sky-100",
    row: "hover:border-sky-400/30",
  };
}

function getReasonChips(row: ExportReadinessRow) {
  return [
    ...row.blockers.map((label) => ({ label, tone: "danger" as const })),
    ...row.warnings.map((label) => ({ label, tone: "warning" as const })),
    ...row.missingRequiredFields.map((label) => ({ label, tone: "danger" as const })),
  ].slice(0, 4);
}

export function ExportReadinessTable({
  marketplaceSlug,
  marketplaceLabel,
  rows,
  loading,
  selectedIds,
  statusFilter,
  onStatusFilterChange,
  onSelectedIdsChange,
  onOpenProduct,
}: ExportReadinessTableProps) {
  const [query, setQuery] = useState("");
  const [operationFilter, setOperationFilter] = useState<ExportOperationFilter>("all");
  const showOperationFilters = marketplaceSlug === "allegro";
  const effectiveOperationFilter = showOperationFilters ? operationFilter : "all";
  const visibleRows = filterExportReadinessRows(rows, {
    statusFilter,
    operationFilter: effectiveOperationFilter,
    query,
  });
  const selectableVisibleIds = visibleRows
    .filter(canSelectExportReadinessRow)
    .map((row) => row.productId);
  const allVisibleSelected = selectableVisibleIds.length > 0
    && selectableVisibleIds.every((id) => selectedIds.includes(id));
  const hasActiveLocalFilters = query.trim().length > 0 || effectiveOperationFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
        Laduje operacje exportu...
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-default)] p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Operacje
          </div>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Produkty do exportu {marketplaceLabel}
            </h2>
            <div className="text-sm text-[var(--text-secondary)]">
              {visibleRows.length} z {rows.length} wynikow
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
          <label className="flex min-w-0 flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Szukaj
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Produkt, ID oferty, external.id, powod blokady..."
              className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 text-sm font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400"
            />
          </label>

          <button
            type="button"
            aria-disabled={selectableVisibleIds.length === 0}
            onClick={() => {
              if (selectableVisibleIds.length === 0) return;
              if (allVisibleSelected) {
                onSelectedIdsChange(selectedIds.filter((id) => !selectableVisibleIds.includes(id)));
                return;
              }

              onSelectedIdsChange(Array.from(new Set([...selectedIds, ...selectableVisibleIds])));
            }}
            className={`h-11 self-end rounded-xl px-3 py-2 text-sm font-semibold transition ${
              selectableVisibleIds.length === 0
                ? "cursor-not-allowed border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)]"
                : "border border-indigo-400/50 bg-indigo-600/15 text-indigo-100 hover:bg-indigo-600/25"
            }`}
          >
            {allVisibleSelected ? "Odznacz widoczne" : `Zaznacz widoczne (${selectableVisibleIds.length})`}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Status
            </span>
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusFilterChange(option.value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  statusFilter === option.value
                    ? "bg-indigo-600 text-white"
                    : "border border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showOperationFilters && (
            <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Operacja
            </span>
            {OPERATION_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOperationFilter(option.value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  operationFilter === option.value
                    ? "bg-indigo-600 text-white"
                    : "border border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {option.label}
              </button>
            ))}
            {hasActiveLocalFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOperationFilter("all");
                  onStatusFilterChange("all");
                }}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
              >
                Reset filtr
              </button>
            )}
            </div>
          )}
          {!showOperationFilters && hasActiveLocalFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onStatusFilterChange("all");
              }}
              className="w-fit rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]"
            >
              Reset filtr
            </button>
          )}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="m-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak pozycji dla filtra.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                <th className="w-14 px-5 py-3 font-semibold">Sel</th>
                <th className="px-3 py-3 font-semibold">Produkt</th>
                <th className="px-3 py-3 font-semibold">Oferta Allegro</th>
                <th className="px-3 py-3 font-semibold">Operacja</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="w-44 px-5 py-3 font-semibold text-right">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const presentation = getExportReadinessPresentation(row);
                const tone = getToneClasses(presentation.tone);
                const checked = selectedIds.includes(row.productId);
                const selectable = presentation.selectable;
                const reasons = getReasonChips(row);

                return (
                  <tr
                    key={row.productId}
                    className={`border-t border-[var(--border-default)] bg-[var(--bg-body)] transition ${tone.row}`}
                  >
                    <td className="border-t border-[var(--border-default)] px-5 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-disabled={!selectable}
                        onChange={() => {
                          if (!selectable) return;
                          if (checked) {
                            onSelectedIdsChange(selectedIds.filter((id) => id !== row.productId));
                            return;
                          }

                          onSelectedIdsChange([...selectedIds, row.productId]);
                        }}
                        className={`h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-card)] text-indigo-600 ${
                          selectable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                        }`}
                      />
                    </td>
                    <td className="border-t border-[var(--border-default)] px-3 py-4 align-top">
                      <div className="font-semibold text-[var(--text-primary)]">
                        Produkt #{row.productId}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {row.classification || "bez klasyfikacji"}
                      </div>
                    </td>
                    <td className="border-t border-[var(--border-default)] px-3 py-4 align-top">
                      <div className="max-w-[260px] truncate text-sm font-medium text-[var(--text-primary)]">
                        {row.remoteListingRef || row.remoteOfferId || "-"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {row.remoteOfferId ? `ID ${row.remoteOfferId}` : row.externalId || "brak linku"}
                      </div>
                    </td>
                    <td className="border-t border-[var(--border-default)] px-3 py-4 align-top">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {presentation.label}
                      </div>
                      <div className="mt-1 max-w-[320px] text-xs leading-5 text-[var(--text-secondary)]">
                        {presentation.description}
                      </div>
                    </td>
                    <td className="border-t border-[var(--border-default)] px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}>
                        {presentation.bucket}
                      </span>
                      {reasons.length > 0 && (
                        <div className="mt-2 flex max-w-[360px] flex-wrap gap-1.5">
                          {reasons.map((reason) => (
                            <span
                              key={`${row.productId}:${reason.label}`}
                              className={`rounded-full border px-2 py-1 text-[11px] ${
                                reason.tone === "danger"
                                  ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                                  : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                              }`}
                            >
                              {reason.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="border-t border-[var(--border-default)] px-5 py-4 text-right align-top">
                      <button
                        type="button"
                        aria-disabled={!selectable}
                        onClick={() => {
                          if (!selectable) {
                            onOpenProduct(row.productId);
                            return;
                          }

                          if (checked) {
                            onSelectedIdsChange(selectedIds.filter((id) => id !== row.productId));
                            return;
                          }

                          onSelectedIdsChange([...selectedIds, row.productId]);
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          !selectable
                            ? "border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                            : checked
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {!selectable ? "Otworz produkt" : checked ? "Wybrany" : presentation.actionLabel}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
