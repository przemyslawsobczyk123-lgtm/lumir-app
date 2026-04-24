import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAmazonProductTypeDefinition,
  normalizeAmazonValidationHistory,
  normalizeAmazonValidationPreview,
} from "./amazon-foundation-helpers.ts";

test("normalizeAmazonValidationPreview maps issues and payload summary", () => {
  const preview = normalizeAmazonValidationPreview({
    snapshotId: 5,
    accountId: 61,
    marketplaceId: "A1C3SOZRARQ6R3",
    marketplaceCode: "PL",
    productType: "CAR_SEAT",
    schemaVersion: "PTD-2026-04",
    status: "invalid",
    requiredFields: ["item_name", "brand", "bullet_point"],
    propertyGroups: [
      {
        key: "offer",
        title: "Offer",
        propertyNames: ["item_name", "brand"],
      },
    ],
    issues: [
      {
        code: "MISSING_REQUIRED",
        field: "bullet_point",
        severity: "error",
        message: "Brakuje bullet_point",
      },
    ],
    payload: {
      item_name: "Fotelik",
    },
    createdAt: "2026-04-22T10:00:00.000Z",
    updatedAt: "2026-04-22T10:05:00.000Z",
  });

  assert.equal(preview.snapshotId, 5);
  assert.equal(preview.productType, "CAR_SEAT");
  assert.equal(preview.schemaVersion, "PTD-2026-04");
  assert.equal(preview.marketplaceCode, "PL");
  assert.deepEqual(preview.requiredFields, ["item_name", "brand", "bullet_point"]);
  assert.equal(preview.propertyGroups[0].title, "Offer");
  assert.equal(preview.issues[0].field, "bullet_point");
  assert.deepEqual(preview.payload, { item_name: "Fotelik" });
  assert.equal(preview.createdAt, "2026-04-22T10:00:00.000Z");
  assert.equal(preview.updatedAt, "2026-04-22T10:05:00.000Z");
});

test("normalizeAmazonProductTypeDefinition maps schema metadata and groups", () => {
  const definition = normalizeAmazonProductTypeDefinition({
    productType: "CAR_SEAT",
    schemaVersion: "PTD-2026-04",
    requirements: "LISTING",
    requirementsEnforced: "ENFORCED",
    requiredFields: ["item_name", "brand"],
    propertyGroups: [
      {
        key: "offer",
        title: "Offer",
        propertyNames: ["item_name", "brand"],
      },
    ],
    properties: {
      item_name: { type: "string" },
      brand: { type: "string" },
    },
  });

  assert.equal(definition.productType, "CAR_SEAT");
  assert.equal(definition.schemaVersion, "PTD-2026-04");
  assert.equal(definition.requirements, "LISTING");
  assert.equal(definition.requirementsEnforced, "ENFORCED");
  assert.deepEqual(definition.requiredFields, ["item_name", "brand"]);
  assert.equal(definition.propertyGroups[0].key, "offer");
  assert.deepEqual(Object.keys(definition.properties), ["item_name", "brand"]);
});

test("normalizeAmazonValidationHistory maps snapshot rows list", () => {
  const history = normalizeAmazonValidationHistory([
    {
      snapshotId: 9,
      productType: "CAR_SEAT",
      schemaVersion: "PTD-2026-04",
      status: "invalid",
      marketplaceId: "A1C3SOZRARQ6R3",
      issues: [{ field: "bullet_point", code: "MISSING_REQUIRED", severity: "error", message: "Brak" }],
      payload: { item_name: "Fotelik" },
      updatedAt: "2026-04-22T10:05:00.000Z",
    },
    {
      snapshotId: 8,
      productType: "BABY_PRODUCT",
      status: "ready_later",
      marketplaceId: "A1C3SOZRARQ6R3",
      issues: [],
      payload: {},
      updatedAt: "2026-04-22T09:05:00.000Z",
    },
  ]);

  assert.equal(history.length, 2);
  assert.equal(history[0].snapshotId, 9);
  assert.equal(history[1].status, "ready_later");
});
