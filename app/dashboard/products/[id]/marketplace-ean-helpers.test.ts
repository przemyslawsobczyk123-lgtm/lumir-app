import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKETPLACE_EAN_VALIDATION_MESSAGE,
  applyProductEanToMarketplaceAttributes,
  getFirstInvalidMarketplaceEanAttribute,
  getMarketplaceEanValidation,
  isMarketplaceEanField,
} from "./marketplace-ean-helpers.ts";

test("getMarketplaceEanValidation accepts only EAN-8, EAN-13 and EAN-14 for Media Expert and Empik", () => {
  assert.deepEqual(getMarketplaceEanValidation({
    marketplaceSlug: "mediaexpert",
    fieldCode: "Attr_SPEC_1",
    label: "Kod EAN",
    value: "5903282706521",
  }), {
    applies: true,
    valid: true,
    normalizedValue: "5903282706521",
    message: "",
  });

  assert.deepEqual(getMarketplaceEanValidation({
    marketplaceSlug: "empik",
    fieldCode: "EAN",
    label: "EAN",
    value: "123456789012",
  }), {
    applies: true,
    valid: false,
    normalizedValue: "123456789012",
    message: MARKETPLACE_EAN_VALIDATION_MESSAGE,
  });

  assert.equal(getMarketplaceEanValidation({
    marketplaceSlug: "mediaexpert",
    fieldCode: "Attr_SPEC_1",
    label: "Kod EAN",
    value: "12345678",
  }).valid, true);

  assert.equal(getMarketplaceEanValidation({
    marketplaceSlug: "empik",
    fieldCode: "EAN",
    label: "EAN",
    value: "12345678901234",
  }).valid, true);
});

test("getFirstInvalidMarketplaceEanAttribute reports first invalid EAN attribute", () => {
  const result = getFirstInvalidMarketplaceEanAttribute({
    marketplaceSlug: "mediaexpert",
    fields: [
      { field_code: "Attr_SPEC_3", label: "SKU" },
      { field_code: "Attr_SPEC_1", label: "Kod EAN" },
    ],
    values: {
      Attr_SPEC_3: "SKU-1",
      Attr_SPEC_1: "123456789",
    },
  });

  assert.deepEqual(result, {
    fieldCode: "Attr_SPEC_1",
    label: "Kod EAN",
    message: MARKETPLACE_EAN_VALIDATION_MESSAGE,
  });
});

test("EAN validation ignores non EAN fields and Allegro", () => {
  assert.equal(isMarketplaceEanField({ fieldCode: "Attr_SPEC_1" }), true);
  assert.equal(isMarketplaceEanField({ label: "Numer GTIN" }), true);
  assert.equal(isMarketplaceEanField({ fieldCode: "Attr_SPEC_3", label: "Kod SKU sklepu" }), false);

  assert.deepEqual(getMarketplaceEanValidation({
    marketplaceSlug: "allegro",
    fieldCode: "Attr_SPEC_1",
    label: "Kod EAN",
    value: "123456789",
  }), {
    applies: false,
    valid: true,
    normalizedValue: "123456789",
    message: "",
  });
});

test("product EAN auto-fills empty or invalid Media Expert and Empik EAN attributes", () => {
  assert.deepEqual(applyProductEanToMarketplaceAttributes({
    marketplaceSlug: "mediaexpert",
    fields: [
      { field_code: "Attr_SPEC_1", label: "Kod EAN" },
      { field_code: "Attr_SPEC_3", label: "SKU" },
    ],
    values: {
      Attr_SPEC_1: "bledny-ean",
      Attr_SPEC_3: "SKU-1",
    },
    productEan: "590-3282706521",
  }), {
    Attr_SPEC_1: "5903282706521",
    Attr_SPEC_3: "SKU-1",
  });

  assert.deepEqual(applyProductEanToMarketplaceAttributes({
    marketplaceSlug: "empik",
    fields: [{ field_code: "EAN", label: "EAN" }],
    values: {},
    productEan: "12345678",
  }), {
    EAN: "12345678",
  });
});

test("product EAN auto-fill overwrites stale valid marketplace EAN and ignores ASIN-like values", () => {
  assert.deepEqual(applyProductEanToMarketplaceAttributes({
    marketplaceSlug: "empik",
    fields: [{ field_code: "EAN", label: "EAN" }],
    values: { EAN: "12345678901234" },
    productEan: "5903282706521",
  }), {
    EAN: "5903282706521",
  });

  assert.deepEqual(applyProductEanToMarketplaceAttributes({
    marketplaceSlug: "mediaexpert",
    fields: [{ field_code: "Attr_SPEC_1", label: "Kod EAN" }],
    values: {},
    productEan: "B0CXXXXXXXX",
  }), {});

  assert.deepEqual(applyProductEanToMarketplaceAttributes({
    marketplaceSlug: "allegro",
    fields: [{ field_code: "Attr_SPEC_1", label: "Kod EAN" }],
    values: {},
    productEan: "5903282706521",
  }), {});
});

test("product marketplace category tab does not contain Allegro offer preview UI", () => {
  const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pageSource, /AllegroOfferUpdateCard/);
});
