export type ImportJobResultStatus = "imported" | "duplicate" | "error";
export type ActiveAIStatus = "queued" | "processing";

export type ImportJobItemLike = {
  productId?: number | null;
  status?: string | null;
  resultJson?: unknown;
};

export type JobWithItems = {
  job: {
    id: string;
    type?: string | null;
    status: string;
  };
  items: ImportJobItemLike[];
};

export type ProductImportBadgeInput = {
  id: number;
  rawData?: unknown;
  importMeta?: unknown;
};

export type ParsedImportMeta = {
  provider: string | null;
  remoteId: string | null;
  aiRequested: boolean;
};

export type ImportDuplicateRow = {
  provider: string | null;
  remoteId: string | null;
  existingProductId: number | null;
  existingProductTitle: string | null;
};

export type ImportJobSummary = {
  totalCount: number;
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  duplicates: ImportDuplicateRow[];
};

export type ProductImportBadgeState = {
  isImported: boolean;
  provider: string | null;
  aiStatus: ActiveAIStatus | null;
  importMeta: ParsedImportMeta | null;
};

export type NormalizedImportJobResult = {
  provider: string | null;
  remoteId: string | null;
  status: ImportJobResultStatus | null;
  productId: number | null;
  existingProductId: number | null;
  existingProductTitle: string | null;
  message?: string | null;
};

export function isImportModeWithAi(mode: unknown) {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  return normalized === "import_with_ai" || normalized === "import_and_ai";
}

export function isImportHubBackgroundJobType(type: unknown) {
  const normalized = typeof type === "string" ? type.trim() : "";
  return normalized === "products_import_marketplace"
    || normalized === "ai_generate_bulk"
    || normalized === "ai_generate_single";
}

export function hasReportableImportJobItem(item: ImportJobItemLike) {
  if (item.productId != null) return true;

  const result = normalizeImportJobResult(item.resultJson);
  return result.status === "imported" || result.status === "duplicate" || result.status === "error" || item.status === "error";
}

export function summarizeImportJobItems(items: ImportJobItemLike[]): ImportJobSummary {
  return items.reduce<ImportJobSummary>(
    (summary, item) => {
      const result = normalizeImportJobResult(item.resultJson);
      summary.totalCount += 1;

      if (result.status === "imported") {
        summary.importedCount += 1;
      }

      if (result.status === "duplicate") {
        summary.duplicateCount += 1;
        summary.duplicates.push({
          provider: result.provider,
          remoteId: result.remoteId,
          existingProductId: result.existingProductId,
          existingProductTitle: result.existingProductTitle,
        });
      }

      if (result.status === "error" || (item.status === "error" && !result.status)) {
        summary.failedCount += 1;
      }

      return summary;
    },
    {
      totalCount: 0,
      importedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      duplicates: [],
    }
  );
}

export function getProductImportBadgeState(
  product: ProductImportBadgeInput,
  jobsWithItems: JobWithItems[]
): ProductImportBadgeState {
  const importMeta = parseImportMeta(product.rawData) || parseImportMeta({ importMeta: product.importMeta });
  let provider = importMeta?.provider ?? null;
  let isImported = Boolean(provider);
  let aiStatus: ActiveAIStatus | null = null;

  for (const entry of jobsWithItems) {
    const matchingItem = entry.items.find((item) => isJobItemForProduct(item, product.id));
    if (!matchingItem) continue;

    if (!isImported && entry.job.type === "products_import_marketplace") {
      const result = normalizeImportJobResult(matchingItem.resultJson);
      if (result.status === "imported") {
        isImported = true;
        provider = result.provider;
      }
    }

    if (!aiStatus && (entry.job.type === "ai_generate_bulk" || entry.job.type === "ai_generate_single")) {
      aiStatus = entry.job.status === "queued" ? "queued" : "processing";
    }
  }

  return {
    isImported,
    provider,
    aiStatus,
    importMeta,
  };
}

function isJobItemForProduct(item: ImportJobItemLike, productId: number) {
  const result = normalizeImportJobResult(item.resultJson);
  if (result.productId != null) return result.productId === productId;
  return item.productId === productId;
}

export function parseImportMeta(rawData: unknown): ParsedImportMeta | null {
  const rawObject = parseUnknownObject(rawData);
  const importMeta = parseUnknownObject(rawObject?.importMeta);
  if (!importMeta) return null;

  return {
    provider: normalizeOptionalString(importMeta.provider),
    remoteId: normalizeOptionalString(importMeta.remoteId),
    aiRequested: Boolean(importMeta.aiRequested),
  };
}

export function normalizeImportJobResult(input: unknown): NormalizedImportJobResult {
  const rawObject = parseUnknownObject(input);
  if (!rawObject) {
    return {
      provider: null,
      remoteId: null,
      status: null,
      productId: null,
      existingProductId: null,
      existingProductTitle: null,
      message: null,
    };
  }

  const normalizedStatus = normalizeOptionalString(rawObject.status) as ImportJobResultStatus | null;

  return {
    provider: normalizeOptionalString(rawObject.provider),
    remoteId: normalizeOptionalString(rawObject.remoteId),
    status: normalizedStatus,
    productId: normalizeNumber(rawObject.productId),
    existingProductId: normalizeNumber(rawObject.existingProductId),
    existingProductTitle: normalizeOptionalString(rawObject.existingProductTitle),
    message: normalizeOptionalString(rawObject.message),
  };
}

function parseUnknownObject(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
