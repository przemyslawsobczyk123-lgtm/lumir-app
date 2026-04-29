export type ImportMetricKind = "imported" | "duplicates" | "failed" | "total";

export const importReportClasses = {
  card: "rounded-2xl border border-slate-300 bg-[var(--bg-card)] px-4 py-4 shadow-md shadow-slate-900/10 ring-1 ring-slate-200 [html.dark_&]:border-[#334155] [html.dark_&]:ring-[#334155] [html.dark_&]:shadow-black/25",
  title: "text-sm font-semibold text-[var(--text-primary)]",
  meta: "mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 [html.dark_&]:text-[#94a3b8]",
  closeButton: "rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]",
  empty: "rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm text-[var(--text-secondary)]",
  itemRow: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm [html.dark_&]:border-[#334155] [html.dark_&]:bg-[#111827]",
  itemId: "rounded-full bg-white px-2 py-1 text-[11px] font-mono text-slate-600 [html.dark_&]:bg-[#1f2937] [html.dark_&]:text-[#cbd5e1]",
  itemLabel: "text-[var(--text-primary)] [html.dark_&]:text-[#e2e8f0]",
  openButton: "rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-900 transition hover:bg-slate-50 [html.dark_&]:border-[#475569] [html.dark_&]:bg-[#1f2937] [html.dark_&]:text-[#e2e8f0] [html.dark_&]:hover:bg-[#334155]",
  duplicatePanel: "mt-4 rounded-2xl border border-amber-400 bg-amber-100 px-4 py-3 [html.dark_&]:border-[#f59e0b]/70 [html.dark_&]:bg-[#3b2a08]",
  duplicateTitle: "text-sm font-semibold text-amber-950 [html.dark_&]:text-[#fde68a]",
  duplicateRow: "flex flex-wrap items-center gap-2 text-xs text-amber-950 [html.dark_&]:text-[#fde68a]",
  duplicateId: "rounded-full bg-amber-200 px-2 py-1 font-mono text-amber-950 [html.dark_&]:bg-[#4a3107] [html.dark_&]:text-[#fde68a]",
  duplicateButton: "rounded-full border border-amber-500 bg-amber-200 px-2 py-1 font-semibold text-amber-950 transition hover:bg-amber-300 [html.dark_&]:border-[#f59e0b]/70 [html.dark_&]:bg-[#4a3107] [html.dark_&]:text-[#fde68a] [html.dark_&]:hover:bg-[#5f3f09]",
} as const;

const METRIC_CLASSES: Record<ImportMetricKind, string> = {
  imported: "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm shadow-emerald-900/10 [html.dark_&]:border-[#34d399]/70 [html.dark_&]:bg-[#052e2b] [html.dark_&]:text-[#a7f3d0] [html.dark_&]:shadow-black/20",
  duplicates: "border-amber-400 bg-amber-100 text-amber-900 shadow-sm shadow-amber-900/10 [html.dark_&]:border-[#f59e0b]/70 [html.dark_&]:bg-[#3b2a08] [html.dark_&]:text-[#fde68a] [html.dark_&]:shadow-black/20",
  failed: "border-rose-400 bg-rose-100 text-rose-900 shadow-sm shadow-rose-900/10 [html.dark_&]:border-[#fb7185]/70 [html.dark_&]:bg-[#3f101c] [html.dark_&]:text-[#fecdd3] [html.dark_&]:shadow-black/20",
  total: "border-indigo-300 bg-indigo-100 text-indigo-900 shadow-sm shadow-indigo-900/10 [html.dark_&]:border-[#818cf8]/70 [html.dark_&]:bg-[#17172f] [html.dark_&]:text-[#c7d2fe] [html.dark_&]:shadow-black/20",
};

export function getImportMetricClass(kind: ImportMetricKind) {
  return METRIC_CLASSES[kind];
}

export function getImportStatusClass(status: string | null) {
  if (status === "imported" || status === "done") {
    return "border-emerald-400 bg-emerald-100 text-emerald-900 [html.dark_&]:border-[#34d399]/70 [html.dark_&]:bg-[#052e2b] [html.dark_&]:text-[#a7f3d0]";
  }
  if (status === "duplicate") {
    return "border-amber-400 bg-amber-100 text-amber-900 [html.dark_&]:border-[#f59e0b]/70 [html.dark_&]:bg-[#3b2a08] [html.dark_&]:text-[#fde68a]";
  }
  if (status === "error") {
    return "border-rose-400 bg-rose-100 text-rose-900 [html.dark_&]:border-[#fb7185]/70 [html.dark_&]:bg-[#3f101c] [html.dark_&]:text-[#fecdd3]";
  }
  return "border-slate-300 bg-slate-100 text-slate-800 [html.dark_&]:border-[#475569] [html.dark_&]:bg-[#1f2937] [html.dark_&]:text-[#cbd5e1]";
}

export const importProgressClasses = {
  card: "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 [html.dark_&]:border-[#38bdf8]/55 [html.dark_&]:bg-[#082f49]",
  title: "text-sm font-semibold text-sky-900 [html.dark_&]:text-[#bae6fd]",
  body: "text-xs text-sky-700 [html.dark_&]:text-[#7dd3fc]",
  chip: "rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700 [html.dark_&]:bg-[#0c4a6e] [html.dark_&]:text-[#bae6fd]",
  chipSoft: "rounded-full bg-sky-100 px-2 py-1 text-sky-700 [html.dark_&]:bg-[#0c4a6e] [html.dark_&]:text-[#bae6fd]",
  track: "mt-3 h-2 overflow-hidden rounded-full bg-sky-100 [html.dark_&]:bg-[#0f172a]",
} as const;
