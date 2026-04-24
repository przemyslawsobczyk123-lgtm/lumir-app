export type AIDraftStatus = "ready" | "review" | "blocked";

type DraftQualityInput = {
  marketplaceSlug?: unknown;
  overallConfidence?: unknown;
  selectedSourcesJson?: unknown;
  qualityJson?: unknown;
  reviewReasonsJson?: unknown;
  readinessJson?: unknown;
};

type CompactDraftInput = {
  marketplaceSlug?: unknown;
  overallConfidence?: unknown;
  reviewCount?: unknown;
  isReady?: unknown;
  ready?: unknown;
  status?: unknown;
};

type BulkResultInput = {
  qualityJson?: unknown;
  reviewReasonsJson?: unknown;
  readinessJson?: unknown;
};

export type DraftQualitySummary = {
  marketplaceSlug: string;
  status: AIDraftStatus;
  isReady: boolean;
  reviewReasons: string[];
  missingRequiredFields: string[];
  selectedSources: string[];
  enabledSources: string[];
  requiredFilled: number;
  requiredTotal: number;
  optionalFilled: number;
  optionalTotal: number;
  overallConfidence: number | null;
};

export type ListAIDraftBadge = {
  marketplaceSlug: string;
  status: AIDraftStatus;
  overallConfidence: number | null;
  reviewCount: number;
  isReady: boolean;
};

export type BulkReportItemState = {
  status: AIDraftStatus;
  reason: string | null;
  reviewReasons: string[];
  missingRequiredFields: string[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asInteger(value: unknown): number {
  const parsed = asNumber(value);
  return parsed == null ? 0 : Math.max(0, Math.round(parsed));
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return null;
}

function normalizeStatus(value: unknown, isReadyHint: boolean | null): AIDraftStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "ready") return "ready";
  if (normalized === "review" || normalized === "needs_review") return "review";
  if (normalized === "blocked") return "blocked";
  if (isReadyHint === true) return "ready";
  if (isReadyHint === false) return "blocked";
  return "blocked";
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}

function extractMissingRequiredFields(qualityJson: Record<string, unknown> | null, reviewReasons: string[]) {
  const direct = dedupe(asStringArray(qualityJson?.missingCriticalFields));
  if (direct.length > 0) return direct;

  const fromReasons = reviewReasons.flatMap((reason) => {
    const match = reason.match(/missing critical fields:\s*(.+)$/i);
    if (!match) return [];
    return match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });

  return dedupe(fromReasons);
}

function normalizeCompactDraft(input: CompactDraftInput): ListAIDraftBadge | null {
  const marketplaceSlug = typeof input.marketplaceSlug === "string" ? input.marketplaceSlug.trim() : "";
  if (!marketplaceSlug) return null;

  const isReadyHint = asBoolean(input.isReady ?? input.ready);

  return {
    marketplaceSlug,
    status: normalizeStatus(input.status, isReadyHint),
    overallConfidence: asNumber(input.overallConfidence),
    reviewCount: asInteger(input.reviewCount),
    isReady: isReadyHint ?? false,
  };
}

export function normalizeDraftQualitySummary(input: DraftQualityInput | null | undefined): DraftQualitySummary {
  const qualityJson = asObject(input?.qualityJson);
  const readinessJson = asObject(input?.readinessJson);
  const sources = asObject(qualityJson?.sources);
  const coverage = asObject(qualityJson?.coverage);
  const reviewReasons = asStringArray(input?.reviewReasonsJson);
  const isReadyHint = asBoolean(readinessJson?.isReady ?? readinessJson?.ready);
  const selectedSources = asStringArray(sources?.selected);

  return {
    marketplaceSlug: typeof input?.marketplaceSlug === "string" ? input.marketplaceSlug : "",
    status: normalizeStatus(readinessJson?.status, isReadyHint ?? (reviewReasons.length === 0 ? true : false)),
    isReady: isReadyHint ?? reviewReasons.length === 0,
    reviewReasons,
    missingRequiredFields: extractMissingRequiredFields(qualityJson, reviewReasons),
    selectedSources: dedupe(selectedSources.length > 0 ? selectedSources : asStringArray(input?.selectedSourcesJson)),
    enabledSources: dedupe(asStringArray(sources?.enabled)),
    requiredFilled: asInteger(coverage?.requiredFilled),
    requiredTotal: asInteger(coverage?.requiredTotal),
    optionalFilled: asInteger(coverage?.optionalFilled),
    optionalTotal: asInteger(coverage?.optionalTotal),
    overallConfidence: asNumber(input?.overallConfidence),
  };
}

export function normalizeListAIDraftBadge(
  input: unknown,
  preferredMarketplaceSlug?: string | null
): ListAIDraftBadge | null {
  const drafts = Array.isArray(input)
    ? input.map((item) => normalizeCompactDraft(asObject(item) ?? {})).filter(Boolean) as ListAIDraftBadge[]
    : [];

  if (drafts.length === 0) return null;

  const preferred = typeof preferredMarketplaceSlug === "string" ? preferredMarketplaceSlug.trim() : "";
  if (preferred) {
    const match = drafts.find((draft) => draft.marketplaceSlug === preferred);
    if (match) return match;
  }

  const rank: Record<AIDraftStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return drafts.reduce((worst, current) => {
    if (!worst) return current;
    if (rank[current.status] < rank[worst.status]) return current;

    if (rank[current.status] === rank[worst.status]) {
      if ((current.reviewCount ?? 0) > (worst.reviewCount ?? 0)) return current;
      if ((current.overallConfidence ?? Infinity) < (worst.overallConfidence ?? Infinity)) return current;
    }

    return worst;
  }, drafts[0] as ListAIDraftBadge);
}

export function extractBulkReportItemState(input: unknown): BulkReportItemState | null {
  const raw = asObject(input);
  if (!raw) return null;

  const normalizedInput = raw as BulkResultInput;
  const qualityJson = asObject(normalizedInput.qualityJson);
  const readinessJson = asObject(normalizedInput.readinessJson);
  const reviewReasons = asStringArray(normalizedInput.reviewReasonsJson);
  const isReadyHint = asBoolean(readinessJson?.isReady ?? readinessJson?.ready);
  const missingRequiredFields = extractMissingRequiredFields(qualityJson, reviewReasons);
  const reason = reviewReasons[0] ?? (missingRequiredFields[0] ? `Missing critical fields: ${missingRequiredFields.join(", ")}` : null);

  return {
    status: normalizeStatus(readinessJson?.status, isReadyHint ?? (reason ? false : true)),
    reason,
    reviewReasons,
    missingRequiredFields,
  };
}
