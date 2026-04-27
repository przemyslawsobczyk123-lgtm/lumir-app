import { isAmazonUiEnabled, withoutAmazonWhenDisabled } from "../mvp-feature-flags.ts";

export type ExportReadinessStatus = "ready" | "needs_review" | "blocked";
export type ExportReadinessFilter = "all" | ExportReadinessStatus;
export type ExportOperationFilter = "all" | "existing" | "create" | "conflict" | "missing_link";
export type ExportReadinessOperation = Exclude<ExportOperationFilter, "all"> | "other";
export type ExportRunTone = "info" | "warning" | "ready" | "danger";
export type ExportOperationTone = "info" | "warning" | "ready" | "danger";
export type AllegroExportField = "title" | "description" | "price" | "stock";
export type AllegroExportFields = Record<AllegroExportField, boolean>;

export type ExportMarketplaceOption = {
  value: "allegro" | "mediaexpert" | "empik" | "amazon";
  label: string;
  enabled: boolean;
  badge: string;
};

const ALLEGRO_EXPORT_FIELD_KEYS: AllegroExportField[] = ["title", "description", "price", "stock"];

export const EXPORT_MARKETPLACE_OPTIONS: ExportMarketplaceOption[] = [
  { value: "allegro", label: "Allegro", enabled: true, badge: "API publish" },
  { value: "mediaexpert", label: "Media Expert", enabled: true, badge: "Mirakl XLSX" },
  { value: "empik", label: "Empik", enabled: true, badge: "Mirakl XLSX" },
  { value: "amazon", label: "Amazon", enabled: false, badge: "Validation next" },
];

export function getVisibleExportMarketplaceOptions(amazonEnabled = isAmazonUiEnabled()) {
  return withoutAmazonWhenDisabled(EXPORT_MARKETPLACE_OPTIONS, (item) => item.value, amazonEnabled);
}

export const DEFAULT_ALLEGRO_EXPORT_FIELDS: AllegroExportFields = {
  title: true,
  description: true,
  price: true,
  stock: true,
};

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
  targetKind: string | null;
  remoteOfferId: string | null;
  remoteListingRef: string | null;
  externalId: string | null;
  diffCount: number;
};

export type ExportReadinessPresentation = {
  bucket: ExportReadinessStatus;
  label: string;
  description: string;
  actionLabel: string;
  tone: ExportOperationTone;
  selectable: boolean;
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
    targetKind: string | null;
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

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}

function normalizeIntegerArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number.parseInt(String(entry || ""), 10))
    .filter((entry, index, array) => Number.isInteger(entry) && entry > 0 && array.indexOf(entry) === index);
}

export function normalizeAllegroExportFields(value: unknown, fallback: AllegroExportFields = DEFAULT_ALLEGRO_EXPORT_FIELDS): AllegroExportFields {
  if (typeof value === "string") {
    const selected = new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean));
    if (selected.size > 0) {
      return {
        title: selected.has("title"),
        description: selected.has("description"),
        price: selected.has("price"),
        stock: selected.has("stock"),
      };
    }
  }

  const data = toRecord(value);
  if (Object.keys(data).length > 0) {
    return {
      title: !!data.title,
      description: !!data.description,
      price: !!data.price,
      stock: !!data.stock,
    };
  }

  return { ...fallback };
}

function serializeAllegroExportFields(fields?: AllegroExportFields | null) {
  const normalized = normalizeAllegroExportFields(fields || null);
  const selected = ALLEGRO_EXPORT_FIELD_KEYS.filter((key) => normalized[key]);
  return selected.length > 0 ? selected.join(",") : "none";
}

const DIAGNOSTIC_LABELS: Record<string, string> = {
  duplicate_allegro_external_id: "Konflikt external.id z inna oferta",
  invalid_allegro_gtin: "Nowa oferta wymaga poprawnego GTIN",
  missing_description_html: "Brak opisu HTML",
  missing_image_html: "Brak zdjec w HTML",
  missing_mirakl_category: "Brak kategorii Mirakl",
  missing_mirakl_template: "Brak szablonu Mirakl",
  missing_required_mirakl_attributes: "Brakuje wymaganych atrybutow Mirakl",
  missing_remote_offer_link: "Brak powiazania z oferta Allegro",
  needs_review_confirmation: "Wymaga potwierdzenia review",
  no_selected_field_changes: "Brak zmian w wybranych polach",
  offer_update_preview_blocked: "Wybrane pola nie sa gotowe do publikacji",
  offer_update_preview_failed: "Nie udalo sie sprawdzic zmian Allegro",
  title_keyword_coverage: "Tytul wymaga lepszego SEO",
  minimum_parameter_coverage: "Brakuje czesci parametrow",
  manufacturer_code_support: "Kod producenta wymaga sprawdzenia",
  minimum_image_count: "Za malo zdjec",
  delivery_confirmed: "Dostawa wymaga potwierdzenia",
  margin_confirmed: "Marza wymaga potwierdzenia",
};

export function normalizeDiagnosticLabel(value: unknown) {
  let raw = "";

  if (typeof value === "string" || typeof value === "number") {
    raw = String(value || "").trim();
    return DIAGNOSTIC_LABELS[raw] || raw;
  }

  const data = toRecord(value);
  const direct = data.message || data.field || data.key || data.code || data.label || data.id;
  if (typeof direct === "string" || typeof direct === "number") {
    raw = String(direct || "").trim();
    return DIAGNOSTIC_LABELS[raw] || raw;
  }

  return "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeDiagnosticLabel)
    .filter(Boolean);
}

export function normalizeExportReadinessRows(input: unknown): ExportReadinessRow[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      const data = typeof row === "object" && row ? row as Record<string, unknown> : {};
      const remoteSnapshot = toRecord(data.remoteSnapshot);
      const diffRows = Array.isArray(data.diffRows) ? data.diffRows : [];
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
        targetKind: typeof remoteSnapshot.targetKind === "string" && remoteSnapshot.targetKind.trim()
          ? remoteSnapshot.targetKind.trim()
          : typeof data.targetKind === "string" && data.targetKind.trim()
            ? data.targetKind.trim()
            : null,
        remoteOfferId: typeof remoteSnapshot.remoteOfferId === "string" && remoteSnapshot.remoteOfferId.trim()
          ? remoteSnapshot.remoteOfferId.trim()
          : typeof data.remoteOfferId === "string" && data.remoteOfferId.trim()
            ? data.remoteOfferId.trim()
            : null,
        remoteListingRef: typeof remoteSnapshot.remoteListingRef === "string" && remoteSnapshot.remoteListingRef.trim()
          ? remoteSnapshot.remoteListingRef.trim()
          : typeof data.remoteListingRef === "string" && data.remoteListingRef.trim()
            ? data.remoteListingRef.trim()
            : null,
        externalId: typeof remoteSnapshot.externalId === "string" && remoteSnapshot.externalId.trim()
          ? remoteSnapshot.externalId.trim()
          : typeof data.externalId === "string" && data.externalId.trim()
            ? data.externalId.trim()
            : null,
        diffCount: diffRows.length,
      };
    })
    .filter((row) => Number.isInteger(row.productId) && row.productId > 0);
}

function normalizedLower(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizedSearch(value: unknown) {
  return normalizedLower(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDiagnostic(row: ExportReadinessRow, token: string) {
  const normalized = normalizedLower(token);
  return [...row.blockers, ...row.warnings, ...row.missingRequiredFields]
    .some((entry) => normalizedLower(entry).includes(normalized));
}

export function getExportOperationFilter(row: ExportReadinessRow): ExportReadinessOperation {
  const classification = normalizedLower(row.classification);
  const targetKind = normalizedLower(row.targetKind);
  const isConflict = classification === "duplicate-offer-conflict"
    || targetKind === "conflict"
    || hasDiagnostic(row, "Konflikt external.id");
  const isMissingLink = (classification === "existing-offer-update" && !row.remoteOfferId && targetKind !== "existing")
    || hasDiagnostic(row, "Brak powiazania");
  const isExistingUpdate = classification === "existing-offer-update" || targetKind === "existing";
  const isCreate = classification === "new-offer-create" || targetKind === "create";

  if (isConflict) return "conflict";
  if (isMissingLink) return "missing_link";
  if (isExistingUpdate) return "existing";
  if (isCreate) return "create";

  return "other";
}

function getExportReadinessSearchHaystack(row: ExportReadinessRow) {
  const presentation = getExportReadinessPresentation(row);
  return normalizedSearch([
    row.marketplaceSlug,
    row.productId,
    row.accountId,
    row.marketplaceId,
    row.status,
    row.summary,
    row.classification,
    row.targetKind,
    row.remoteOfferId,
    row.remoteListingRef,
    row.externalId,
    row.diffCount,
    presentation.label,
    presentation.description,
    getExportOperationFilter(row),
    ...row.blockers,
    ...row.warnings,
    ...row.missingRequiredFields,
  ].filter((value) => value !== null && value !== undefined).join(" "));
}

function matchesExportReadinessQuery(row: ExportReadinessRow, query: string) {
  const terms = normalizedSearch(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = getExportReadinessSearchHaystack(row);
  return terms.every((term) => haystack.includes(term));
}

export function filterExportReadinessRows(
  rows: ExportReadinessRow[],
  filters: {
    statusFilter?: ExportReadinessFilter;
    operationFilter?: ExportOperationFilter;
    query?: string;
  }
) {
  const statusFilter = filters.statusFilter || "all";
  const operationFilter = filters.operationFilter || "all";
  const query = filters.query || "";

  return rows.filter((row) => {
    if (statusFilter !== "all" && getExportReadinessPresentation(row).bucket !== statusFilter) return false;
    if (operationFilter !== "all" && getExportOperationFilter(row) !== operationFilter) return false;
    return matchesExportReadinessQuery(row, query);
  });
}

export function getExportReadinessPresentation(row: ExportReadinessRow): ExportReadinessPresentation {
  const classification = normalizedLower(row.classification);
  const targetKind = normalizedLower(row.targetKind);
  const isMiraklFile = classification === "mirakl-xlsx-category" || targetKind === "file";
  const hasRemoteOffer = !!row.remoteOfferId || targetKind === "existing";
  const isExistingUpdate = classification === "existing-offer-update" || targetKind === "existing";
  const isCreate = classification === "new-offer-create" || targetKind === "create";
  const isConflict = classification === "duplicate-offer-conflict"
    || targetKind === "conflict"
    || hasDiagnostic(row, "Konflikt external.id");

  if (isConflict) {
    return {
      bucket: "blocked",
      label: "Konflikt oferty",
      description: "Ta sama oferta Allegro jest przypisana do innego produktu LuMir.",
      actionLabel: "Napraw konflikt",
      tone: "danger",
      selectable: false,
    };
  }

  if (isMiraklFile) {
    if (row.status === "ready") {
      return {
        bucket: "ready",
        label: "Gotowe do XLSX",
        description: "Produkt ma kategorie, wymagane atrybuty, opis HTML i zdjecia do pliku Mirakl.",
        actionLabel: "Zaznacz do XLSX",
        tone: "ready",
        selectable: true,
      };
    }

    return {
      bucket: "blocked",
      label: "Braki w XLSX",
      description: row.summary || "Produkt wymaga atrybutow, opisu albo zdjec przed exportem Mirakl.",
      actionLabel: "Otworz produkt",
      tone: "danger",
      selectable: false,
    };
  }

  if (isExistingUpdate && hasRemoteOffer) {
    if (row.requiresConfirmation || row.status === "needs_review") {
      return {
        bucket: "needs_review",
        label: "Wymaga potwierdzenia",
        description: "Istniejaca oferta Allegro. Po potwierdzeniu review preflight sprawdzi wybrane pola.",
        actionLabel: "Zaznacz po review",
        tone: "warning",
        selectable: true,
      };
    }

    return {
      bucket: "ready",
      label: "Gotowe do aktualizacji",
      description: "Istniejaca oferta Allegro. Preflight sprawdzi zmiany tylko w wybranych polach.",
      actionLabel: "Zaznacz do update",
      tone: "ready",
      selectable: true,
    };
  }

  if (isExistingUpdate && !hasRemoteOffer) {
    return {
      bucket: "blocked",
      label: "Brak powiazania oferty",
      description: "Produkt nie ma pewnego linku do oferty Allegro.",
      actionLabel: "Otworz produkt",
      tone: "danger",
      selectable: false,
    };
  }

  if (isCreate) {
    if (row.status === "ready") {
      return {
        bucket: "ready",
        label: "Gotowe do utworzenia",
        description: "Preflight przygotuje nowa oferte Allegro jako INACTIVE.",
        actionLabel: "Zaznacz do create",
        tone: "ready",
        selectable: true,
      };
    }

    if (row.status === "needs_review" || row.requiresConfirmation) {
      return {
        bucket: "needs_review",
        label: "Wymaga potwierdzenia",
        description: "Nowa oferta wymaga akceptacji przed publish.",
        actionLabel: "Zaznacz po review",
        tone: "warning",
        selectable: true,
      };
    }

    return {
      bucket: "blocked",
      label: "Nowa oferta zablokowana",
      description: "Brakuje danych wymaganych przez Allegro.",
      actionLabel: "Otworz produkt",
      tone: "danger",
      selectable: false,
    };
  }

  if (row.status === "ready") {
    return {
      bucket: "ready",
      label: "Gotowe",
      description: row.summary || "Produkt gotowy do preflight.",
      actionLabel: "Zaznacz",
      tone: "ready",
      selectable: true,
    };
  }

  if (row.status === "needs_review") {
    return {
      bucket: "needs_review",
      label: "Wymaga potwierdzenia",
      description: row.summary || "Produkt wymaga review przed exportem.",
      actionLabel: "Zaznacz po review",
      tone: "warning",
      selectable: true,
    };
  }

  return {
    bucket: "blocked",
    label: "Zablokowane",
    description: row.summary || "Produkt wymaga poprawek przed exportem.",
    actionLabel: "Otworz produkt",
    tone: "danger",
    selectable: false,
  };
}

export function canSelectExportReadinessRow(row: ExportReadinessRow) {
  return getExportReadinessPresentation(row).selectable;
}

export function getSelectableExportReadinessIds(rows: ExportReadinessRow[], candidateIds: number[]) {
  const selectableIds = new Set(rows.filter(canSelectExportReadinessRow).map((row) => row.productId));
  return candidateIds.filter((id, index, array) => selectableIds.has(id) && array.indexOf(id) === index);
}

export function normalizeExportPreflightResult(input: unknown): ExportPreflightResult | null {
  if (typeof input !== "object" || !input) return null;

  const data = input as Record<string, unknown>;
  const eligibleItems = Array.isArray(data.eligibleItems) ? data.eligibleItems : [];
  const blockedItems = Array.isArray(data.blockedItems) ? data.blockedItems : [];
  const groups = Array.isArray(data.groups) ? data.groups : [];

  return {
    marketplaceSlug: typeof data.marketplaceSlug === "string" ? data.marketplaceSlug : "",
    eligibleCount: Number(data.eligibleCount || 0),
    blockedCount: Number(data.blockedCount || 0),
    eligibleItems: eligibleItems
      .map((item) => {
        const entry = toRecord(item);
        return {
          productId: Number(entry.productId || 0),
          classification: typeof entry.classification === "string" && entry.classification.trim()
            ? entry.classification.trim()
            : "unclassified",
          warnings: normalizeStringArray(entry.warnings),
          targetKind: typeof entry.targetKind === "string" && entry.targetKind.trim()
            ? entry.targetKind.trim()
            : null,
        };
      })
      .filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    blockedItems: blockedItems
      .map((item) => {
        const entry = toRecord(item);
        return {
          productId: Number(entry.productId || 0),
          blockers: normalizeStringArray(entry.blockers),
        };
      })
      .filter((item) => Number.isInteger(item.productId) && item.productId > 0),
    groups: groups
      .map((group) => {
        const entry = toRecord(group);
        const productIds = normalizeIntegerArray(entry.productIds);

        return {
          classification: typeof entry.classification === "string" && entry.classification.trim()
            ? entry.classification.trim()
            : "unclassified",
          count: Number(entry.count || productIds.length || 0),
          productIds,
        };
      })
      .filter((group) => group.count > 0),
  };
}

export function canStartExportRun(input: {
  marketplaceSlug: string;
  accountId: number | null;
  eligibleCount: number;
  loading: boolean;
}) {
  return input.marketplaceSlug === "allegro"
    && !!input.accountId
    && input.eligibleCount > 0
    && !input.loading;
}

export function canRunMarketplacePreflight(input: {
  marketplaceSlug: string;
  accountId: number | null;
  selectedCount: number;
  loading: boolean;
}) {
  if (input.marketplaceSlug === "allegro") {
    return !!input.accountId
      && input.selectedCount > 0
      && !input.loading;
  }

  if (["mediaexpert", "empik"].includes(input.marketplaceSlug)) {
    return input.selectedCount > 0 && !input.loading;
  }

  return false;
}

export function canDownloadMiraklExportFile(input: {
  marketplaceSlug: string;
  eligibleCount: number;
  loading: boolean;
}) {
  return ["mediaexpert", "empik"].includes(input.marketplaceSlug)
    && input.eligibleCount > 0
    && !input.loading;
}

export function serializeExportApiSelection(input: { marketplaceSlug: string; productIds: number[]; accountId?: number | null; confirmNeedsReview?: boolean; fields?: AllegroExportFields | null }) {
  const marketplaceSlug = encodeURIComponent(String(input.marketplaceSlug || "").trim());
  const productIds = normalizeIntegerArray(input.productIds).join(",");
  const accountId = Number(input.accountId || 0);
  const confirmNeedsReview = !!input.confirmNeedsReview;
  const fields = input.fields ? serializeAllegroExportFields(input.fields) : "";

  return `marketplace=${marketplaceSlug}&productIds=${productIds}${Number.isInteger(accountId) && accountId > 0 ? `&accountId=${accountId}` : ""}${confirmNeedsReview ? "&confirmNeedsReview=1" : ""}${fields ? `&fields=${encodeURIComponent(fields)}` : ""}`;
}

export function parseExportApiSelection(queryString: string) {
  const params = new URLSearchParams(String(queryString || ""));
  const marketplaceSlug = String(params.get("marketplace") || "").trim();
  const productIds = normalizeIntegerArray(String(params.get("productIds") || "").split(","));
  const accountId = Number.parseInt(String(params.get("accountId") || ""), 10);
  const confirmNeedsReview = ["1", "true", "yes", "on"].includes(String(params.get("confirmNeedsReview") || "").trim().toLowerCase());
  const fields = normalizeAllegroExportFields(params.get("fields"));

  return {
    marketplaceSlug,
    productIds,
    accountId: Number.isInteger(accountId) && accountId > 0 ? accountId : null,
    confirmNeedsReview,
    fields,
  };
}

export function buildExportApiHref(input: { marketplaceSlug: string; productIds: number[]; accountId?: number | null; confirmNeedsReview?: boolean; fields?: AllegroExportFields | null }) {
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
