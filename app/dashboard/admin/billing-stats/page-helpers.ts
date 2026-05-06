export type BillingStatsSortBy =
  | "seller"
  | "balance"
  | "revenue"
  | "paidCredits"
  | "creditsUsed"
  | "payments"
  | "lifetimePurchased"
  | "lifetimeUsed"
  | "lastPayment";

export type BillingStatsSortDir = "asc" | "desc";

export const BILLING_STATS_SORT_FIELDS: BillingStatsSortBy[] = [
  "revenue",
  "creditsUsed",
  "paidCredits",
  "payments",
  "balance",
  "lifetimePurchased",
  "lifetimeUsed",
  "lastPayment",
  "seller",
];

const SORT_FIELD_SET = new Set<string>(BILLING_STATS_SORT_FIELDS);

export function normalizeBillingStatsSortBy(value: unknown): BillingStatsSortBy {
  const candidate = String(value || "").trim();
  return SORT_FIELD_SET.has(candidate) ? (candidate as BillingStatsSortBy) : "revenue";
}

export function normalizeBillingStatsSortDir(value: unknown): BillingStatsSortDir {
  return String(value || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

export function buildBillingStatsQuery(input: {
  month: string;
  page: number;
  limit: number;
  search: string;
  sortBy: BillingStatsSortBy;
  sortDir: BillingStatsSortDir;
}) {
  const params = new URLSearchParams();
  params.set("month", input.month);
  params.set("page", String(input.page));
  params.set("limit", String(input.limit));
  params.set("sortBy", normalizeBillingStatsSortBy(input.sortBy));
  params.set("sortDir", normalizeBillingStatsSortDir(input.sortDir));
  const search = input.search.trim();
  if (search) params.set("search", search);
  return params.toString();
}

export function getBillingStatsFilterSummary(
  input: {
    month: string;
    search: string;
    sortBy: BillingStatsSortBy;
    sortDir: BillingStatsSortDir;
  },
  copy: {
    month: string;
    search: string;
    sort: string;
    sortLabels: Record<BillingStatsSortBy, string>;
    sortDirections: Record<BillingStatsSortDir, string>;
  },
) {
  const summary = [
    { key: "month", label: copy.month, value: input.month },
  ];
  const search = input.search.trim();

  if (search) {
    summary.push({ key: "search", label: copy.search, value: search });
  }

  summary.push({
    key: "sort",
    label: copy.sort,
    value: `${copy.sortLabels[input.sortBy]}, ${copy.sortDirections[input.sortDir]}`,
  });

  return summary;
}

export function getBillingStatsThemeClasses() {
  return {
    page: "mx-auto w-full max-w-7xl space-y-6 px-6 py-8",
    accessPage: "mx-auto w-full max-w-6xl px-6 py-8",
    hero: "rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]",
    eyebrow: "text-[11px] font-semibold uppercase tracking-[0.26em] text-indigo-500",
    title: "mt-3 text-3xl font-semibold text-[var(--text-heading)]",
    subtitle: "mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]",
    label: "grid gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]",
    compactLabel: "grid gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]",
    input: "h-11 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:bg-[var(--bg-input)] focus:ring-4 focus:ring-indigo-500/10",
    searchInput: "min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400 focus:bg-[var(--bg-input)] focus:ring-4 focus:ring-indigo-500/10",
    select: "h-10 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:bg-[var(--bg-input)] focus:ring-4 focus:ring-indigo-500/10",
    secondaryButton: "rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)]",
    panel: "overflow-hidden rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]",
    panelHeader: "space-y-3 border-b border-[var(--border-default)] p-4",
    filterLabel: "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]",
    filterPill: "rounded-full border border-[var(--border-default)] bg-[var(--bg-input-alt)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]",
    filterPillLabel: "text-[var(--text-tertiary)]",
    pageText: "text-sm text-[var(--text-secondary)]",
    tableHeader: "bg-[var(--bg-table-header)] text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]",
    tableBody: "divide-y divide-[var(--border-light)] text-[var(--text-table-value)]",
    tableRow: "hover:bg-[var(--bg-card-hover)]",
    sellerName: "font-semibold text-[var(--text-heading)]",
    sellerMeta: "mt-1 text-xs text-[var(--text-secondary)]",
    sellerCompany: "mt-1 text-xs text-[var(--text-tertiary)]",
    strongCell: "px-4 py-4 font-semibold text-[var(--text-heading)]",
    mutedCell: "px-4 py-4 text-xs text-[var(--text-secondary)]",
    emptyCell: "px-4 py-12 text-center text-[var(--text-secondary)]",
    pagination: "flex items-center justify-between border-t border-[var(--border-default)] px-4 py-3",
    pagerButton: "rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold transition",
    pagerButtonEnabled: "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]",
    pagerButtonDisabled: "cursor-not-allowed text-[var(--text-muted)]",
  };
}
