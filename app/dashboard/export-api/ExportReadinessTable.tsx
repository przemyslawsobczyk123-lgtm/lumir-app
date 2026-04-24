import {
  type ExportReadinessFilter,
  type ExportReadinessRow,
} from "./export-api-helpers";

type ExportReadinessTableProps = {
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
  { value: "ready", label: "Ready" },
  { value: "needs_review", label: "Needs review" },
  { value: "blocked", label: "Blocked" },
];

function getRowTone(status: ExportReadinessRow["status"]) {
  if (status === "ready") {
    return {
      badge: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
      card: "border-emerald-500/15",
    };
  }

  if (status === "needs_review") {
    return {
      badge: "bg-amber-500/15 text-amber-200 border-amber-400/20",
      card: "border-amber-500/15",
    };
  }

  return {
    badge: "bg-rose-500/15 text-rose-200 border-rose-400/20",
    card: "border-rose-500/15",
  };
}

export function ExportReadinessTable({
  rows,
  loading,
  selectedIds,
  statusFilter,
  onStatusFilterChange,
  onSelectedIdsChange,
  onOpenProduct,
}: ExportReadinessTableProps) {
  const visibleRows = statusFilter === "all"
    ? rows
    : rows.filter((row) => row.status === statusFilter);
  const selectableVisibleIds = visibleRows
    .filter((row) => row.status !== "blocked")
    .map((row) => row.productId);
  const allVisibleSelected = selectableVisibleIds.length > 0
    && selectableVisibleIds.every((id) => selectedIds.includes(id));

  if (loading) {
    return (
      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]">
        Laduje readiness...
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Readiness
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Batch selection przed preflight
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Backend jest source of truth. Zaznaczysz tylko pozycje niezablokowane.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                statusFilter === option.value
                  ? "bg-indigo-600 text-white"
                  : "border border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              {option.label}
            </button>
          ))}
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
            className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
              selectableVisibleIds.length === 0
                ? "cursor-not-allowed border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-tertiary)]"
                : "border border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {allVisibleSelected ? "Odznacz widoczne" : "Zaznacz widoczne"}
          </button>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak wierszy dla aktualnego filtra.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleRows.map((row) => {
            const tone = getRowTone(row.status);
            const checked = selectedIds.includes(row.productId);
            const selectable = row.status !== "blocked";

            return (
              <article
                key={row.productId}
                className={`rounded-3xl border bg-[var(--bg-body)] p-4 transition ${tone.card}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-[var(--text-primary)]">
                        Produkt #{row.productId}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
                        {row.status}
                      </span>
                      {row.classification && (
                        <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          {row.classification}
                        </span>
                      )}
                    </div>

                    {row.summary && (
                      <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
                        {row.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {row.blockers.map((blocker) => (
                        <span
                          key={`blocker:${row.productId}:${blocker}`}
                          className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-100"
                        >
                          blocker: {blocker}
                        </span>
                      ))}
                      {row.warnings.map((warning) => (
                        <span
                          key={`warning:${row.productId}:${warning}`}
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-100"
                        >
                          warning: {warning}
                        </span>
                      ))}
                      {row.missingRequiredFields.map((field) => (
                        <span
                          key={`missing:${row.productId}:${field}`}
                          className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-100"
                        >
                          missing: {field}
                        </span>
                      ))}
                      {row.requiresConfirmation && (
                        <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100">
                          confirm publish later
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:min-w-[180px]">
                    <button
                      type="button"
                      aria-disabled={!selectable}
                      onClick={() => {
                        if (!selectable) return;

                        if (checked) {
                          onSelectedIdsChange(selectedIds.filter((id) => id !== row.productId));
                          return;
                        }

                        onSelectedIdsChange([...selectedIds, row.productId]);
                      }}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        !selectable
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : checked
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {!selectable ? "Zablokowany" : checked ? "Wybrany" : "Zaznacz"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenProduct(row.productId)}
                      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-card-hover)]"
                    >
                      Otworz produkt
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
