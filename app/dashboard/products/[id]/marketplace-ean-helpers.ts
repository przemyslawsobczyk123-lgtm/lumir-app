export const MARKETPLACE_EAN_VALIDATION_MESSAGE = "Należy uzupełnić poprawny EAN: 8, 13 lub 14 cyfr.";

const MIRAKL_MARKETPLACES = new Set(["mediaexpert", "empik"]);
const VALID_EAN_LENGTHS = new Set([8, 13, 14]);

type MarketplaceEanFieldLike = {
  fieldCode?: string | null;
  field_code?: string | null;
  label?: string | null;
};

type MarketplaceEanValidationInput = MarketplaceEanFieldLike & {
  marketplaceSlug?: string | null;
  value?: string | number | null;
};

type MarketplaceEanAttributeField = MarketplaceEanFieldLike & {
  field_code: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeMarketplaceEanDigits(value: unknown) {
  return normalizeText(value).replace(/\.0+$/, "").replace(/[^0-9]/g, "");
}

export function isMarketplaceEanField(field: MarketplaceEanFieldLike) {
  const fieldCode = normalizeText(field.fieldCode ?? field.field_code);
  const label = normalizeLower(field.label);
  return fieldCode === "Attr_SPEC_1"
    || fieldCode === "EAN"
    || label.includes("ean")
    || label.includes("gtin");
}

export function getMarketplaceEanValidation(input: MarketplaceEanValidationInput) {
  const normalizedValue = normalizeMarketplaceEanDigits(input.value);
  const applies = MIRAKL_MARKETPLACES.has(normalizeLower(input.marketplaceSlug))
    && isMarketplaceEanField(input);

  if (!applies || !normalizedValue) {
    return {
      applies,
      valid: true,
      normalizedValue,
      message: "",
    };
  }

  const valid = VALID_EAN_LENGTHS.has(normalizedValue.length);
  return {
    applies,
    valid,
    normalizedValue,
    message: valid ? "" : MARKETPLACE_EAN_VALIDATION_MESSAGE,
  };
}

export function getFirstInvalidMarketplaceEanAttribute(input: {
  marketplaceSlug?: string | null;
  fields: MarketplaceEanAttributeField[];
  values: Record<string, string | number | null | undefined>;
}) {
  for (const field of input.fields) {
    const validation = getMarketplaceEanValidation({
      marketplaceSlug: input.marketplaceSlug,
      fieldCode: field.field_code,
      label: field.label,
      value: input.values[field.field_code],
    });

    if (validation.applies && !validation.valid) {
      return {
        fieldCode: field.field_code,
        label: normalizeText(field.label) || field.field_code,
        message: validation.message,
      };
    }
  }

  return null;
}

export function applyProductEanToMarketplaceAttributes(input: {
  marketplaceSlug?: string | null;
  fields: MarketplaceEanAttributeField[];
  values: Record<string, string>;
  productEan?: string | number | null;
}) {
  let nextValues = input.values;

  for (const field of input.fields) {
    const productValidation = getMarketplaceEanValidation({
      marketplaceSlug: input.marketplaceSlug,
      fieldCode: field.field_code,
      label: field.label,
      value: input.productEan,
    });
    if (!productValidation.applies) {
      continue;
    }

    const nextValue = productValidation.valid ? productValidation.normalizedValue : "";
    if (String(input.values[field.field_code] ?? "") === nextValue) {
      continue;
    }

    if (nextValues === input.values) nextValues = { ...input.values };
    nextValues[field.field_code] = nextValue;
  }

  return nextValues;
}
