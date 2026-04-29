import {
  getExportRunTone,
  getExportRunToneClass,
  type ExportRunRow,
  type OperationDiagnostic,
} from "./export-api-helpers";

type ExportRunHistoryCardProps = {
  marketplaceSlug: string;
  runs: ExportRunRow[];
  loading: boolean;
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
    <div className="min-w-0 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-950 [html.dark_&]:border-[#fb7185]/45 [html.dark_&]:bg-[#3f101c] [html.dark_&]:text-[#fecdd3]">
      <div className="break-words font-semibold">{title}</div>
      {message && message !== title && <div className="mt-1 break-words">{message}</div>}
      {diagnostic?.hint && (
        <div className="mt-1 break-words text-rose-800 [html.dark_&]:text-[#fecdd3]/85">
          Hint: {diagnostic.hint}
        </div>
      )}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="max-w-full rounded-full border border-rose-300 bg-white/70 px-2 py-0.5 font-mono text-[10px] text-rose-900 [html.dark_&]:border-[#fb7185]/45 [html.dark_&]:bg-[#111827] [html.dark_&]:text-[#fecdd3]"
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
          <pre className="mt-1 max-h-28 overflow-hidden whitespace-pre-wrap break-words rounded-lg bg-white/70 px-2 py-1 font-mono text-[11px] leading-5 text-rose-950 [html.dark_&]:bg-[#111827] [html.dark_&]:text-[#fecdd3]">
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
}: ExportRunHistoryCardProps) {
  return (
    <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Run history
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Historia batch runow dla {marketplaceSlug}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Audit, statusy i retry bazuja na pozycjach runa. Retry bierze tylko pozycje error.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Laduje run history...
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 text-sm text-[var(--text-secondary)]">
          Brak runow dla tego marketplace. Uruchom preflight, potem export.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {runs.map((run) => {
            const tone = getExportRunTone(run.status);

            return (
              <article
                key={run.id}
                className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-[var(--text-primary)]">
                        Run #{run.id}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getExportRunToneClass(tone)}`}>
                        {run.status}
                      </span>
                      <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                        {run.mode}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      eligible {run.eligibleCount} • blocked {run.blockedCount} • created {formatRunDate(run.createdAt)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-[var(--text-secondary)]">
                    account {run.accountId ?? "-"}<br />
                    updated {formatRunDate(run.updatedAt)}
                  </div>
                </div>
                {run.failedItems.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      Diagnostyka pozycji
                    </div>
                    <div className="mt-3 grid gap-2">
                      {run.failedItems.slice(0, 5).map((item, index) => (
                        <div
                          key={`${run.id}:${item.id ?? item.productId ?? index}`}
                          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
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
                      <div className="mt-2 text-xs text-[var(--text-secondary)]">
                        +{run.failedItems.length - 5} wiecej pozycji z bledem
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
