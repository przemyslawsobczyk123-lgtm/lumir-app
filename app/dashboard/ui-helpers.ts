type Lang = "pl" | "en";

type DashboardCards = {
  inProgress: number;
  ready: number;
  exported: number;
  errors: number;
};

type DashboardProducts = {
  total: number;
  pending: number;
  mapped: number;
  needs_review: number;
  exported: number;
};

type DashboardImports = {
  processing: number;
  done: number;
  error: number;
};

export type DashboardSummarySnapshot = {
  cards: DashboardCards;
  products: DashboardProducts;
  imports: DashboardImports;
};

export type DashboardFocus = {
  kind: "errors" | "processing" | "ready" | "catalog";
  count: number;
};

export function formatDashboardCount(value: number, lang: Lang) {
  return value.toLocaleString(lang === "pl" ? "pl-PL" : "en-US");
}

export function getTotalImportCount(imports: DashboardImports) {
  return imports.processing + imports.done + imports.error;
}

export function getDashboardFocus(summary: DashboardSummarySnapshot): DashboardFocus {
  if (summary.cards.errors > 0) {
    return { kind: "errors", count: summary.cards.errors };
  }

  if (summary.cards.inProgress > 0) {
    return { kind: "processing", count: summary.cards.inProgress };
  }

  if (summary.cards.ready > 0) {
    return { kind: "ready", count: summary.cards.ready };
  }

  return { kind: "catalog", count: summary.products.total };
}
