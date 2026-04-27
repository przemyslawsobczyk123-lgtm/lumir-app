export type ImportMetricKind = "imported" | "duplicates" | "failed" | "total";

export const importReportClasses = {
  card: "rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-4 shadow-sm shadow-black/5 dark:shadow-black/20",
  title: "text-sm font-semibold text-[var(--text-primary)]",
  meta: "mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]",
  closeButton: "rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]",
  empty: "rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm text-[var(--text-secondary)]",
  itemRow: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm",
  itemId: "rounded-full bg-[var(--bg-card)] px-2 py-1 text-[11px] font-mono text-[var(--text-secondary)]",
  itemLabel: "text-[var(--text-primary)]",
  openButton: "rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-card-hover)]",
  duplicatePanel: "mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/30 dark:bg-amber-500/10",
  duplicateTitle: "text-sm font-semibold text-amber-900 dark:text-amber-200",
  duplicateRow: "flex flex-wrap items-center gap-2 text-xs text-amber-900 dark:text-amber-100",
  duplicateId: "rounded-full bg-amber-100 px-2 py-1 font-mono text-amber-900 dark:bg-amber-500/15 dark:text-amber-100",
  duplicateButton: "rounded-full border border-amber-300 bg-amber-100 px-2 py-1 font-semibold text-amber-700 transition hover:bg-amber-200 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20",
} as const;

const METRIC_CLASSES: Record<ImportMetricKind, string> = {
  imported: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  duplicates: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  failed: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
  total: "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
};

export function getImportMetricClass(kind: ImportMetricKind) {
  return METRIC_CLASSES[kind];
}

export function getImportStatusClass(status: string | null) {
  if (status === "imported" || status === "done") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "duplicate") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (status === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
}

export const importProgressClasses = {
  card: "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-400/30 dark:bg-sky-500/10",
  title: "text-sm font-semibold text-sky-900 dark:text-sky-200",
  body: "text-xs text-sky-700 dark:text-sky-300",
  chip: "rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  chipSoft: "rounded-full bg-sky-100 px-2 py-1 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  track: "mt-3 h-2 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60",
} as const;
