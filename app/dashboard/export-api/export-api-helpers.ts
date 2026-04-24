export type ExportReadinessStatus = "ready" | "needs_review" | "blocked";
export type ExportReadinessFilter = "all" | ExportReadinessStatus;
export type ExportRunTone = "info" | "warning" | "ready" | "danger";

export type ExportReadinessRow = {
  marketplaceSlug: string;
  productId: number;
  accountId: number | null;
  marketplaceId: string | null;
  status: ExportReadinessStatus;
  publishEligible: boolean;
  requiresConfirmation: boolean;
  score: number;
  summary: string;
  blockers: string[];
  warnings: string[];
  missingRequiredFields: string[];
  coverage: number | null;
  classification: string | null;
  snapshotId: number | null;
};

export type ExportRunRow = {
  id: number;
  marketplaceSlug: string;
  accountId: number | null;
  mode: string;
  status: string;
  eligibleCount: number;
  blockedCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ExportPreflightResult = {
  marketplaceSlug: string;
  eligibleCount: number;
  blockedCount: number;
  eligibleItems: Array<{
    productId: number;
    classification: string;
    warnings: string[];
  }>;
  blockedItems: Array<{
    productId: number;
    blockers: string[];
  }>;
  groups: Array<{
    classification: string;
    count: number;
    productIds: number[];
  }>;
};

function normalizeIntegerArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number.parseInt(String(entry || ""), 10))
    .filter((entry, index, array) => Number.isInteger(entry) && entry > 0 && array.indexOf(entry) === index);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

export function normalizeExportReadinessRows(input: unknown): ExportReadinessRow[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      const data = typeof row === "object" && row ? row as Record<string, unknown> : {};
      const rawStatus = String(data.status || "").trim().toLowerCase();
      const status: ExportReadinessStatus = rawStatus === "blocked"
        ? "blocked"
        : rawStatus === "needs_review"
          ? "needs_review"
          : "ready";

      return {
        marketplaceSlug: typeof data.marketplaceSlug === "string" ? data.marketplaceSlug.trim() : "",
        productId: Number(data.productId || 0),
        accountId: Number.isInteger(Number(data.accountId)) && Number(data.accountId) > 0 ? Number(data.accountId) : null,
        marketplaceId: typeof data.marketplaceId === "string" && data.marketplaceId.trim()
          ? data.marketplaceId.trim()
          : null,
        status,
        publishEligible: !!data.publishEligible,
        requiresConfirmation: !!data.requiresConfirmation,
        score: Number(data.score || 0),
        summary: typeof data.summary === "string" ? data.summary.trim() : "",
        blockers: normalizeStringArray(data.blockers),
        warnings: normalizeStringArray(data.warnings),
        missingRequiredFields: normalizeStringArray(data.missingRequiredFields),
        coverage: Number.isFinite(Number(data.coverage)) ? Number(data.coverage) : null,
        classification: typeof data.classification === "string" && data.classification.trim()
          ? data.classification.trim()
          : null,
        snapshotId: Number.isInteger(Number(data.snapshotId)) && Number(data.snapshotId) > 0 ? Number(data.snapshotId) : null,
      };
    })
    .filter((row) => Number.isInteger(row.productId) && row.productId > 0);
}

export function serializeExportApiSelection(input: { marketplaceSlug: string; productIds: number[] }) {
  const marketplaceSlug = encodeURIComponent(String(input.marketplaceSlug || "").trim());
  const productIds = normalizeIntegerArray(input.productIds).join(",");

  return `marketplace=${marketplaceSlug}&productIds=${productIds}`;
}

export function parseExportApiSelection(queryString: string) {
  const params = new URLSearchParams(String(queryString || ""));
  const marketplaceSlug = String(params.get("marketplace") || "").trim();
  const productIds = normalizeIntegerArray(String(params.get("productIds") || "").split(","));

  return {
    marketplaceSlug,
    productIds,
  };
}

export function buildExportApiHref(input: { marketplaceSlug: string; productIds: number[] }) {
  return `/dashboard/export-api?${serializeExportApiSelection(input)}`;
}

export function normalizeExportRunRows(input: unknown): ExportRunRow[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      const data = typeof row === "object" && row ? row as Record<string, unknown> : {};
      const summary = typeof data.summary === "object" && data.summary ? data.summary as Record<string, unknown> : {};

      return {
        id: Number(data.id || 0),
        marketplaceSlug: String(data.marketplaceSlug || "").trim(),
        accountId: Number.isInteger(Number(data.accountId)) && Number(data.accountId) > 0 ? Number(data.accountId) : null,
        mode: String(data.mode || "publish").trim() || "publish",
        status: String(data.status || "queued").trim() || "queued",
        eligibleCount: Number(summary.eligibleCount || 0),
        blockedCount: Number(summary.blockedCount || 0),
        createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
      };
    })
    .filter((row) => Number.isInteger(row.id) && row.id > 0);
}

export function getExportRunTone(status: string): ExportRunTone {
  const normalized = String(status || "").trim().toLowerCase();

  if (["failed", "error", "blocked"].includes(normalized)) {
    return "danger";
  }

  if (["done", "success"].includes(normalized)) {
    return "ready";
  }

  if (["running", "processing", "retrying"].includes(normalized)) {
    return "warning";
  }

  return "info";
}
