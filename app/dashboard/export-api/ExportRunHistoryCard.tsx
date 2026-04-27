import { getExportRunTone, type ExportRunRow } from "./export-api-helpers";

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

function getToneClasses(tone: ReturnType<typeof getExportRunTone>) {
  if (tone === "ready") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "danger") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  if (tone === "warning") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  return "border-sky-400/20 bg-sky-500/10 text-sky-100";
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
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getToneClasses(tone)}`}>
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
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
