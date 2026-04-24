export type AmazonValidationIssue = {
  code: string;
  field: string;
  severity: string;
  message: string;
};

export type AmazonPropertyGroup = {
  key: string;
  title: string;
  propertyNames: string[];
};

export type AmazonProductTypeDefinition = {
  productType: string;
  schemaVersion: string;
  requirements: string;
  requirementsEnforced: string;
  requiredFields: string[];
  propertyGroups: AmazonPropertyGroup[];
  properties: Record<string, unknown>;
};

export type AmazonValidationPreview = {
  snapshotId: number;
  accountId: number;
  marketplaceId: string;
  marketplaceCode: string;
  productType: string;
  schemaVersion: string;
  status: string;
  requiredFields: string[];
  propertyGroups: AmazonPropertyGroup[];
  issues: AmazonValidationIssue[];
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry || "")).filter(Boolean) : [];
}

function normalizePropertyGroups(value: unknown): AmazonPropertyGroup[] {
  return Array.isArray(value)
    ? value
        .map((entry) => {
          const group = asRecord(entry);
          return {
            key: String(group.key || ""),
            title: String(group.title || group.key || ""),
            propertyNames: toStringArray(group.propertyNames),
          };
        })
        .filter((group) => group.key || group.title || group.propertyNames.length > 0)
    : [];
}

export function normalizeAmazonProductTypeDefinition(raw: unknown): AmazonProductTypeDefinition {
  const definition = asRecord(raw);
  return {
    productType: String(definition.productType || ""),
    schemaVersion: String(definition.schemaVersion || "LATEST"),
    requirements: String(definition.requirements || ""),
    requirementsEnforced: String(definition.requirementsEnforced || ""),
    requiredFields: toStringArray(definition.requiredFields),
    propertyGroups: normalizePropertyGroups(definition.propertyGroups),
    properties:
      definition.properties && typeof definition.properties === "object"
        ? (definition.properties as Record<string, unknown>)
        : {},
  };
}

export function normalizeAmazonValidationPreview(raw: unknown): AmazonValidationPreview {
  const preview = asRecord(raw);
  return {
    snapshotId: toNumber(preview.snapshotId),
    accountId: toNumber(preview.accountId),
    marketplaceId: String(preview.marketplaceId || ""),
    marketplaceCode: String(preview.marketplaceCode || ""),
    productType: String(preview.productType || ""),
    schemaVersion: String(preview.schemaVersion || "LATEST"),
    status: String(preview.status || "invalid"),
    requiredFields: toStringArray(preview.requiredFields),
    propertyGroups: normalizePropertyGroups(preview.propertyGroups),
    issues: Array.isArray(preview.issues)
      ? preview.issues.map((value) => {
          const issue = asRecord(value);
          return {
            code: String(issue.code || ""),
            field: String(issue.field || ""),
            severity: String(issue.severity || ""),
            message: String(issue.message || ""),
          };
        })
      : [],
    payload: preview.payload && typeof preview.payload === "object"
      ? preview.payload as Record<string, unknown>
      : {},
    createdAt: String(preview.createdAt || ""),
    updatedAt: String(preview.updatedAt || ""),
  };
}

export function normalizeAmazonValidationHistory(raw: unknown): AmazonValidationPreview[] {
  return Array.isArray(raw) ? raw.map((entry) => normalizeAmazonValidationPreview(entry)) : [];
}
