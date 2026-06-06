import {
  getExportRunStatusLabel,
  getExportRunTone,
  getExportRunToneClass,
  isActiveExportRunStatus,
  type ExportRunRow,
  type OperationDiagnostic,
} from "./export-api-helpers";

type ExportRunHistoryCardProps = {
  marketplaceSlug: string;
  runs: ExportRunRow[];
  loading: boolean;
  error?: string | null;
};

function formatRunDate(value: string | null) {
  if (!value) return "brak timestamp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clipDiagnosticDetails(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 360 ? `${compact.slice(0, 360)}...` : compact;
}

function ExportDiagnosticBlock({
  diagnostic,
  fallbackMessage,
}: {
  diagnostic: OperationDiagnostic | null;
  fallbackMessage?: string | null;
}) {
  const title = diagnostic?.title || fallbackMessage || "Blad exportu";
  const message = diagnostic?.message || (diagnostic?.title ? fallbackMessage : null);
  const chips = [
    diagnostic?.retryable != null ? (diagnostic.retryable ? "retryable" : "no retry") : "",
    diagnostic?.code ? `code: ${diagnostic.code}` : "",
    diagnostic?.source ? `source: ${diagnostic.source}` : "",
  ].filter(Boolean);

  return (
    <div className="min-w-0 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-900 [html.dark_&]:border-rose-300/45 [html.dark_&]:bg-rose-400/10 [html.dark_&]:text-rose-100">
      <div className="break-words font-semibold">{title}</div>
      {message && message !== title && <div className="mt-1 break-words">{message}</div>}
      {diagnostic?.hint && (
        <div className="mt-1 break-words text-rose-800 [html.dark_&]:text-rose-100/85">
          Hint: {diagnostic.hint}
        </div>
      )}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="max-w-full rounded-full border border-rose-300 bg-white/70 px-2 py-0.5 font-mono text-[10px] text-rose-900 [html.dark_&]:border-rose-300/45 [html.dark_&]:bg-slate-950/70 [html.dark_&]:text-rose-100"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      {diagnostic?.details && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em]">
            Details
          </summary>
          <pre className="mt-1 max-h-28 overflow-hidden whitespace-pre-wrap break-words rounded-lg bg-white/70 px-2 py-1 font-mono text-[11px] leading-5 text-rose-900 [html.dark_&]:bg-slate-950/70 [html.dark_&]:text-rose-100">
            {clipDiagnosticDetails(diagnostic.details)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function ExportRunHistoryCard({
  marketplaceSlug,
  runs,
  loading,
  error,
}: ExportRunHistoryCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600 [html.dark_&]:text-indigo-200">
            Historia eksportow
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Ostatnie eksporty {marketplaceSlug}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Status pokazuje, czy worker podjal wysylke do marketplace.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Laduje historie...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 [html.dark_&]:border-amber-300/35 [html.dark_&]:bg-amber-400/10 [html.dark_&]:text-amber-100">
          Historia niedostepna. Produkty i preflight dzialaja dalej. {error}
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak eksportow dla tego marketplace.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border-default)] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)]">
          {runs.map((run) => {
            const tone = getExportRunTone(run.status);
            const activeRun = isActiveExportRunStatus(run.status);

            return (
              <article
                key={run.id}
                className="p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[var(--text-primary)]">#{run.id}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getExportRunToneClass(tone)}`}>
                        {getExportRunStatusLabel(run.status)}
                      </span>
                      <span className="text-[var(--text-secondary)]">Gotowe {run.eligibleCount}</span>
                      <span className="text-[var(--text-secondary)]">Blokady {run.blockedCount}</span>
                      <span className="text-[var(--text-tertiary)]">{formatRunDate(run.createdAt)}</span>
                    </div>
                    {activeRun && (
                      <div className="mt-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900 [html.dark_&]:border-sky-300/35 [html.dark_&]:bg-sky-400/10 [html.dark_&]:text-sky-100">
                        Czeka na worker. Do czasu startu workera produkty nie pojda do Allegro.
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] lg:text-right">
                    Konto {run.accountId ?? "-"}<br />
                    Aktualizacja {formatRunDate(run.updatedAt)}
                  </div>
                </div>
                {run.failedItems.length > 0 && (
                  <details className="mt-3" open={run.failedItems.length > 0 && tone === "danger"}>
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      Bledy pozycji ({run.failedItems.length})
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {run.failedItems.slice(0, 5).map((item, index) => (
                        <div
                          key={`${run.id}:${item.id ?? item.productId ?? index}`}
                          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="rounded-full bg-[var(--bg-body)] px-2 py-1 font-mono">
                              product #{item.productId ?? "-"}
                            </span>
                            <span className="rounded-full bg-[var(--bg-body)] px-2 py-1">
                              {item.status}
                            </span>
                          </div>
                          <ExportDiagnosticBlock
                            diagnostic={item.diagnostic}
                            fallbackMessage={item.errorMessage}
                          />
                        </div>
                      ))}
                    </div>
                    {run.failedItems.length > 5 && (
                      <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                        +{run.failedItems.length - 5} wiecej pozycji z bledem
                      </div>
                    )}
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
