import { isAmazonUiEnabled, withoutAmazonWhenDisabled } from "../mvp-feature-flags.ts";
import { parseProductIntegrations, type ProductIntegration } from "../products/ui-helpers.ts";

export type ExportReadinessStatus = "ready" | "needs_review" | "blocked";
export type ExportReadinessFilter = "all" | ExportReadinessStatus;
export type ExportOperationFilter = "all" | "existing" | "create" | "conflict" | "missing_link";
export type ExportReadinessOperation = Exclude<ExportOperationFilter, "all"> | "other";
export type ExportRunTone = "info" | "warning" | "ready" | "danger";
export type ExportOperationTone = "info" | "warning" | "ready" | "danger";
export type AllegroExportField = "title" | "description" | "price" | "stock";
export type AllegroExportFields = Record<AllegroExportField, boolean>;
export type ExportWizardStepState = "done" | "active" | "pending";
export type ExportWorkspaceTabId = "products" | "history";

export type ExportMarketplaceOption = {
  value: "allegro" | "mediaexpert" | "empik" | "amazon";
  label: string;
  enabled: boolean;
  badge: string;
};

export type ExportDestinationOption = ExportMarketplaceOption & {
  subtitle: string;
  accent: string;
};

export type OperationDiagnostic = {
  severity: string | null;
  title: string | null;
  message: string | null;
  code: string | null;
  hint: string | null;
  details: string | null;
  retryable: boolean | null;
  source: string | null;
};

const ALLEGRO_EXPORT_FIELD_KEYS: AllegroExportField[] = ["title", "description", "price", "stock"];

export const EXPORT_MARKETPLACE_OPTIONS: ExportMarketplaceOption[] = [
  { value: "allegro", label: "Allegro", enabled: true, badge: "API publish" },
  { value: "mediaexpert", label: "Media Expert", enabled: true, badge: "Mirakl XLSX" },
  { value: "empik", label: "Empik", enabled: true, badge: "Mirakl XLSX" },
  { value: "amazon", label: "Amazon", enabled: false, badge: "Validation next" },
];

const EXPORT_DESTINATION_ORDER: ExportMarketplaceOption["value"][] = ["mediaexpert", "empik", "allegro", "amazon"];

const EXPORT_DESTINATION_ACCENTS: Record<ExportMarketplaceOption["value"], string> = {
  mediaexpert: "border-amber-400/80 hover:border-amber-300",
  empik: "border-rose-400/80 hover:border-rose-300",
  allegro: "border-emerald-400/80 hover:border-emerald-300",
  amazon: "border-sky-400/80 hover:border-sky-300",
};

const EXPORT_DESTINATION_SUBTITLES: Record<ExportMarketplaceOption["value"], string> = {
  mediaexpert: "MIRAKL XLSX",
  empik: "MIRAKL XLSX",
  allegro: "ALLEGRO API",
  amazon: "VALIDATION",
};

export function getVisibleExportMarketplaceOptions(amazonEnabled = isAmazonUiEnabled()) {
  return withoutAmazonWhenDisabled(EXPORT_MARKETPLACE_OPTIONS, (item) => item.value, amazonEnabled);
}

export function getExportDestinationOptions(amazonEnabled = isAmazonUiEnabled()): ExportDestinationOption[] {
  const visibleByValue = new Map(
    getVisibleExportMarketplaceOptions(amazonEnabled).map((option) => [option.value, option])
  );

  return EXPORT_DESTINATION_ORDER
    .map((value) => visibleByValue.get(value))
    .filter((option): option is ExportMarketplaceOption => Boolean(option))
    .map((option) => ({
      ...option,
      subtitle: EXPORT_DESTINATION_SUBTITLES[option.value],
      accent: EXPORT_DESTINATION_ACCENTS[option.value],
    }));
}

export function getExportMarketplaceTabClass(active: boolean, enabled: boolean) {
  const base = "rounded-xl border p-3 text-left transition";

  if (active) {
    return `${base} border-indigo-500 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 [html.dark_&]:border-indigo-300 [html.dark_&]:from-indigo-400 [html.dark_&]:to-violet-500 [html.dark_&]:shadow-violet-950/50`;
  }

  if (enabled) {
    return `${base} border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-primary)] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900 [html.dark_&]:hover:border-[#818cf8]/70 [html.dark_&]:hover:bg-[#1f2450] [html.dark_&]:hover:text-[#e0e7ff]`;
  }

  return `${base} cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-tertiary)] opacity-70`;
}

const EXPORT_TONE_CLASSES = {
  ready: {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-900 [html.dark_&]:border-emerald-300/45 [html.dark_&]:bg-emerald-400/10 [html.dark_&]:text-emerald-100",
    panel: "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/10 [html.dark_&]:border-emerald-300/45 [html.dark_&]:bg-emerald-400/10 [html.dark_&]:text-emerald-100 [html.dark_&]:shadow-emerald-950/20",
    row: "hover:border-emerald-300 hover:bg-emerald-50 [html.dark_&]:hover:border-emerald-300/45 [html.dark_&]:hover:bg-emerald-400/[0.04]",
  },
  warning: {
    badge: "border-amber-300 bg-amber-50 text-amber-900 [html.dark_&]:border-amber-300/45 [html.dark_&]:bg-amber-400/10 [html.dark_&]:text-amber-100",
    panel: "border-amber-300 bg-amber-50 text-amber-900 shadow-sm shadow-amber-900/10 [html.dark_&]:border-amber-300/45 [html.dark_&]:bg-amber-400/10 [html.dark_&]:text-amber-100 [html.dark_&]:shadow-amber-950/20",
    row: "hover:border-amber-300 hover:bg-amber-50 [html.dark_&]:hover:border-amber-300/45 [html.dark_&]:hover:bg-amber-400/[0.04]",
  },
  danger: {
    badge: "border-rose-300 bg-rose-50 text-rose-900 [html.dark_&]:border-rose-300/45 [html.dark_&]:bg-rose-400/10 [html.dark_&]:text-rose-100",
    panel: "border-rose-300 bg-rose-50 text-rose-900 shadow-sm shadow-rose-900/10 [html.dark_&]:border-rose-300/45 [html.dark_&]:bg-rose-400/10 [html.dark_&]:text-rose-100 [html.dark_&]:shadow-rose-950/20",
    row: "hover:border-rose-300 hover:bg-rose-50 [html.dark_&]:hover:border-rose-300/45 [html.dark_&]:hover:bg-rose-400/[0.04]",
  },
  info: {
    badge: "border-sky-300 bg-sky-50 text-sky-900 [html.dark_&]:border-sky-300/45 [html.dark_&]:bg-sky-400/10 [html.dark_&]:text-sky-100",
    panel: "border-sky-300 bg-sky-50 text-sky-900 shadow-sm shadow-sky-900/10 [html.dark_&]:border-sky-300/45 [html.dark_&]:bg-sky-400/10 [html.dark_&]:text-sky-100 [html.dark_&]:shadow-sky-950/20",
    row: "hover:border-sky-300 hover:bg-sky-50 [html.dark_&]:hover:border-sky-300/45 [html.dark_&]:hover:bg-sky-400/[0.04]",
  },
} as const satisfies Record<ExportOperationTone, { badge: string; panel: string; row: string }>;

export const exportHelperPanelClasses = {
  card: "rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm shadow-indigo-900/10 [html.dark_&]:border-white/10 [html.dark_&]:bg-slate-950/45 [html.dark_&]:shadow-xl [html.dark_&]:shadow-slate-950/25 [html.dark_&]:backdrop-blur",
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 [html.dark_&]:text-indigo-200",
  body: "mt-2 text-sm leading-6 text-indigo-900 [html.dark_&]:text-slate-200",
  ready: `rounded-xl border px-3 py-2 text-sm ${EXPORT_TONE_CLASSES.ready.panel}`,
  review: `rounded-xl border px-3 py-2 text-sm ${EXPORT_TONE_CLASSES.warning.panel}`,
  blocked: `rounded-xl border px-3 py-2 text-sm ${EXPORT_TONE_CLASSES.danger.panel}`,
} as const;

export function getExportOperationToneClasses(tone: ExportOperationTone) {
  const classes = EXPORT_TONE_CLASSES[tone];
  return {
    badge: classes.badge,
    row: classes.row,
  };
}

export function getExportRunToneClass(tone: ExportRunTone) {
  return EXPORT_TONE_CLASSES[tone].badge;
}

export function getExportReasonChipClass(tone: "warning" | "danger") {
  return EXPORT_TONE_CLASSES[tone].badge;
}

export const exportPreflightSummaryClasses = {
  ready: `rounded-xl border p-4 ${EXPORT_TONE_CLASSES.ready.panel}`,
  blocked: `rounded-xl border p-4 ${EXPORT_TONE_CLASSES.danger.panel}`,
  info: `rounded-xl border p-4 ${EXPORT_TONE_CLASSES.info.panel}`,
} as const;

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
  productTitle: string | null;
  productEan: string | null;
  productSku: string | null;
  marketplaceCategoryPath: string | null;
  hasMarketplaceMapping: boolean;
};

export type ExportProductSummary = {
  id: number;
  title: string | null;
  ean: string | null;
  sku: string | null;
  integrations: ProductIntegration[];
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
  items: ExportRunItemRow[];
  failedItems: ExportRunItemRow[];
};

export type ExportRunItemRow = {
  id: number | null;
  productId: number | null;
  status: string;
  errorMessage: string | null;
  diagnostic: OperationDiagnostic | null;
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

export type CompactExportIssue = {
  label: string;
  tone: "warning" | "danger";
};

export type NormalizedExportErrorDetails = {
  message: string;
  preflight: ExportPreflightResult | null;
};

export type ExportWizardStep = {
  index: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  state: ExportWizardStepState;
};

export type ExportWorkspaceTab = {
  id: ExportWorkspaceTabId;
  label: string;
  description: string;
  count: number | null;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeIntegerArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number.parseInt(String(entry || ""), 10))
    .filter((entry, index, array) => Number.isInteger(entry) && entry > 0 && array.indexOf(entry) === index);
}

function normalizeOptionalString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function normalizeNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDiagnosticDetails(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (value == null) return null;

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function parseOperationDiagnostic(input: unknown): OperationDiagnostic | null {
  let rawObject = toPlainRecord(input);

  if (!rawObject && typeof input === "string") {
    try {
      rawObject = toPlainRecord(JSON.parse(input) as unknown);
    } catch {
      rawObject = null;
    }
  }

  if (!rawObject) return null;

  const diagnostic: OperationDiagnostic = {
    severity: normalizeOptionalString(rawObject.severity),
    title: normalizeOptionalString(rawObject.title),
    message: normalizeOptionalString(rawObject.message),
    code: normalizeOptionalString(rawObject.code),
    hint: normalizeOptionalString(rawObject.hint),
    details: normalizeDiagnosticDetails(rawObject.details),
    retryable: typeof rawObject.retryable === "boolean" ? rawObject.retryable : null,
    source: normalizeOptionalString(rawObject.source),
  };

  const hasDisplayValue = Boolean(
    diagnostic.severity
      || diagnostic.title
      || diagnostic.message
      || diagnostic.code
      || diagnostic.hint
      || diagnostic.details
      || diagnostic.source
  );

  return hasDisplayValue ? diagnostic : null;
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
  price_confirmed: "Potwierdz aktualna cene przed publikacja",
  price_valid: "Cena produktu jest niepoprawna",
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
        productTitle: normalizeOptionalString(data.productTitle)
          ?? normalizeOptionalString(toRecord(data.product).title),
        productEan: normalizeOptionalString(data.productEan)
          ?? normalizeOptionalString(toRecord(data.product).ean),
        productSku: normalizeOptionalString(data.productSku)
          ?? normalizeOptionalString(toRecord(data.product).sku),
        marketplaceCategoryPath: normalizeOptionalString(data.marketplaceCategoryPath)
          ?? normalizeOptionalString(data.categoryPath),
        hasMarketplaceMapping: typeof data.hasMarketplaceMapping === "boolean"
          ? data.hasMarketplaceMapping
          : Boolean(normalizeOptionalString(data.marketplaceCategoryPath) ?? normalizeOptionalString(data.categoryPath)),
      };
    })
    .filter((row) => Number.isInteger(row.productId) && row.productId > 0);
}

export function normalizeExportProductSummaries(input: unknown): ExportProductSummary[] {
  if (!Array.isArray(input)) return [];

  const seenIds = new Set<number>();
  const rows: ExportProductSummary[] = [];

  input.forEach((entry) => {
    const data = toRecord(entry);
    const id = Number(data.id || 0);
    if (!Number.isInteger(id) || id <= 0 || seenIds.has(id)) return;

    seenIds.add(id);
    rows.push({
      id,
      title: normalizeOptionalString(data.title),
      ean: normalizeOptionalString(data.ean),
      sku: normalizeOptionalString(data.sku),
      integrations: parseProductIntegrations(typeof data.integrations === "string" ? data.integrations : null),
    });
  });

  return rows;
}

function normalizeExportProductSummaryMap(products: ExportProductSummary[] | Map<number, ExportProductSummary>) {
  if (products instanceof Map) return products;

  const productById = new Map<number, ExportProductSummary>();
  products.forEach((product) => {
    productById.set(product.id, product);
  });
  return productById;
}

export function enrichExportReadinessRows(
  rows: ExportReadinessRow[],
  products: ExportProductSummary[] | Map<number, ExportProductSummary>
) {
  const productById = normalizeExportProductSummaryMap(products);

  return rows.map((row) => {
    const product = productById.get(row.productId);
    if (!product) return row;

    const integration = product.integrations.find((item) => item.slug === row.marketplaceSlug);
    const marketplaceCategoryPath = integration?.categoryPath?.trim() || row.marketplaceCategoryPath || null;

    return {
      ...row,
      productTitle: row.productTitle || product.title,
      productEan: row.productEan || product.ean,
      productSku: row.productSku || product.sku,
      marketplaceCategoryPath,
      hasMarketplaceMapping: row.hasMarketplaceMapping
        || Boolean(integration?.categoryPath?.trim())
        || Boolean(marketplaceCategoryPath),
    };
  });
}

export function filterExportReadinessRowsForMarketplace(
  rows: ExportReadinessRow[],
  marketplaceSlug: string,
  options: { enrichmentReady?: boolean } = {}
) {
  if (!options.enrichmentReady || !marketplaceSlug) return rows;
  return rows.filter((row) => (!row.marketplaceSlug || row.marketplaceSlug === marketplaceSlug) && row.hasMarketplaceMapping);
}

export function getExportProductDisplayLabel(row: ExportReadinessRow) {
  return row.productTitle || `Produkt #${row.productId}`;
}

export function getExportProductIdentifierBadges(row: ExportReadinessRow) {
  const badges = [`#${row.productId}`];
  if (row.productEan) {
    badges.push(`EAN ${row.productEan}`);
  } else if (row.productSku) {
    badges.push(`SKU ${row.productSku}`);
  }
  if (row.marketplaceCategoryPath) badges.push(row.marketplaceCategoryPath);
  return badges;
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

export function getDefaultExportSelectionIds(
  rows: ExportReadinessRow[],
  options: { includeReview?: boolean } = {}
) {
  return rows
    .filter(canSelectExportReadinessRow)
    .filter((row) => options.includeReview || getExportReadinessPresentation(row).bucket === "ready")
    .map((row) => row.productId);
}

export function getReadyExportSelectionToggle(rows: ExportReadinessRow[], selectedIds: number[]) {
  const readyIds = getDefaultExportSelectionIds(rows);
  const selectedIdSet = new Set(selectedIds);
  const readyIdSet = new Set(readyIds);
  const allReadySelected = readyIds.length > 0 && readyIds.every((id) => selectedIdSet.has(id));

  return {
    readyIds,
    allReadySelected,
    selectedIds: allReadySelected
      ? selectedIds.filter((id) => !readyIdSet.has(id))
      : Array.from(new Set([...selectedIds, ...readyIds])),
  };
}

export function shouldConfirmReviewForSelection(
  rows: ExportReadinessRow[],
  selectedIds: number[],
  confirmNeedsReview: boolean
) {
  if (confirmNeedsReview) return true;
  if (selectedIds.length === 0) return false;

  const selectedIdSet = new Set(selectedIds);
  return rows.some((row) => selectedIdSet.has(row.productId) && getExportReadinessPresentation(row).bucket === "needs_review");
}

export function getExportReadyBulkSelectionControl(rows: ExportReadinessRow[], selectedIds: number[]) {
  const toggle = getReadyExportSelectionToggle(rows, selectedIds);
  const readyIdSet = new Set(toggle.readyIds);
  const selectedReadyCount = Array.from(new Set(selectedIds)).filter((id) => readyIdSet.has(id)).length;
  const readyCount = toggle.readyIds.length;
  const indeterminate = selectedReadyCount > 0 && !toggle.allReadySelected;

  return {
    readyIds: toggle.readyIds,
    readyCount,
    selectedReadyCount,
    allReadySelected: toggle.allReadySelected,
    indeterminate,
    ariaChecked: indeterminate ? "mixed" as const : toggle.allReadySelected,
    disabled: readyCount === 0,
    checkboxLabel: toggle.allReadySelected ? "Odznacz wszystkie gotowe" : "Zaznacz wszystkie gotowe",
    actionLabel: toggle.allReadySelected
      ? "Odznacz wszystkie gotowe"
      : `Zaznacz wszystkie gotowe (${readyCount})`,
    selectedIds: toggle.selectedIds,
  };
}

export function getExportWizardStep(input: {
  selectedCount: number;
  hasPreflight: boolean;
  hasRunResult: boolean;
}) {
  if (input.hasRunResult) return 4;
  if (input.hasPreflight) return 3;
  if (input.selectedCount > 0) return 2;
  return 1;
}

export function getExportWizardSteps(activeStep: number): ExportWizardStep[] {
  const steps: Array<Omit<ExportWizardStep, "state">> = [
    { index: 1, label: "Marketplace", description: "Kanal exportu" },
    { index: 2, label: "Produkty", description: "Gotowe pozycje" },
    { index: 3, label: "Braki", description: "Preflight" },
    { index: 4, label: "Export", description: "API albo XLSX" },
  ];

  return steps.map((step) => ({
    ...step,
    state: step.index < activeStep ? "done" : step.index === activeStep ? "active" : "pending",
  }));
}

export function getExportWorkspaceTabs(marketplaceLabel: string, historyCount?: number): ExportWorkspaceTab[] {
  const label = String(marketplaceLabel || "").trim() || "marketplace";
  const normalizedHistoryCount = typeof historyCount === "number" && historyCount > 0 ? historyCount : null;

  return [
    {
      id: "products",
      label: "Produkty",
      description: `Preflight i publikacja dla ${label}`,
      count: null,
    },
    {
      id: "history",
      label: `Historia ${label}`,
      description: `Ostatnie runy i bledy dla ${label}`,
      count: normalizedHistoryCount,
    },
  ];
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

export function getCompactExportIssues(row: ExportReadinessRow, limit = 3) {
  const all: CompactExportIssue[] = [
    ...row.blockers.map((label) => ({ label, tone: "danger" as const })),
    ...row.warnings.map((label) => ({ label, tone: "warning" as const })),
    ...row.missingRequiredFields.map((label) => ({ label, tone: "danger" as const })),
  ];
  const visible = all.slice(0, Math.max(0, limit));

  return {
    visible,
    hiddenCount: Math.max(0, all.length - visible.length),
    all,
  };
}

export function getExportPrimaryActionLabel(marketplaceSlug: string) {
  if (marketplaceSlug === "allegro") return "Publikuj / aktualizuj na Allegro";
  if (marketplaceSlug === "mediaexpert" || marketplaceSlug === "empik") return "Pobierz plik Excel";
  return "Export niedostepny";
}

export function isActiveExportRunStatus(status: string) {
  return ["queued", "processing", "running", "retrying"].includes(String(status || "").trim().toLowerCase());
}

export function getExportRunStatusLabel(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "queued") return "Czeka";
  if (normalized === "processing" || normalized === "running") return "W toku";
  if (normalized === "retrying") return "Retry";
  if (normalized === "done" || normalized === "success") return "Gotowe";
  if (normalized === "error" || normalized === "failed") return "Blad";
  if (normalized === "blocked") return "Blokada";
  return status || "unknown";
}

export function getExportClassificationLabel(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "existing-offer-update") return "Aktualizacje";
  if (normalized === "new-offer-create") return "Nowe oferty";
  if (normalized === "duplicate-offer-conflict") return "Konflikty";
  if (normalized === "mirakl-xlsx-category") return "Mirakl XLSX";
  if (normalized === "unclassified") return "Bez klasyfikacji";
  return String(value || "").trim() || "Bez klasyfikacji";
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return toPlainRecord(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
}

export function normalizeExportErrorDetails(input: unknown): NormalizedExportErrorDetails {
  const payload = toPlainRecord(input) ?? {};
  const rawDetails = payload.details;
  const details = toPlainRecord(rawDetails) ?? parseJsonRecord(rawDetails) ?? {};
  const preflightInput = details.preflight ?? payload.preflight;
  const message = normalizeOptionalString(payload.error)
    ?? normalizeOptionalString(payload.message)
    ?? "Request failed";

  return {
    message,
    preflight: normalizeExportPreflightResult(preflightInput),
  };
}

export function canStartExportRun(input: {
  marketplaceSlug: string;
  accountId: number | null;
  eligibleCount: number;
  loading: boolean;
  hasActiveRun?: boolean;
}) {
  return input.marketplaceSlug === "allegro"
    && !!input.accountId
    && input.eligibleCount > 0
    && !input.loading
    && !input.hasActiveRun;
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

function normalizeExportRunItemErrorMessage(entry: Record<string, unknown>, error: Record<string, unknown> | null) {
  if (typeof entry.error === "string" && entry.error.trim()) return entry.error.trim();
  return normalizeOptionalString(entry.errorMessage)
    ?? normalizeOptionalString(error?.message)
    ?? normalizeOptionalString(error?.error)
    ?? null;
}

function isFailedExportRunItem(item: ExportRunItemRow) {
  const status = normalizedLower(item.status);
  return status === "error" || status === "failed" || status === "blocked" || Boolean(item.diagnostic || item.errorMessage);
}

function normalizeExportRunItems(input: unknown): ExportRunItemRow[] {
  if (!Array.isArray(input)) return [];

  return input.map((item) => {
    const entry = toRecord(item);
    const error = toPlainRecord(entry.error);
    const diagnostic = parseOperationDiagnostic(entry.diagnostic) ?? parseOperationDiagnostic(error?.diagnostic);

    return {
      id: normalizeNumberOrNull(entry.id),
      productId: normalizeNumberOrNull(entry.productId),
      status: normalizeOptionalString(entry.status) ?? "unknown",
      errorMessage: normalizeExportRunItemErrorMessage(entry, error),
      diagnostic,
    };
  });
}

export function normalizeExportRunRows(input: unknown): ExportRunRow[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      const data = typeof row === "object" && row ? row as Record<string, unknown> : {};
      const summary = typeof data.summary === "object" && data.summary ? data.summary as Record<string, unknown> : {};
      const items = normalizeExportRunItems(data.items);

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
        items,
        failedItems: items.filter(isFailedExportRunItem),
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
