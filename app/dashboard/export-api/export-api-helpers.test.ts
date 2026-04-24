import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExportApiHref,
  getExportRunTone,
  normalizeExportReadinessRows,
  normalizeExportRunRows,
  parseExportApiSelection,
  serializeExportApiSelection,
} from "./export-api-helpers.ts";

test("normalizeExportReadinessRows maps blocked and needs_review rows", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 70,
      status: "blocked",
      blockers: ["brand"],
      warnings: [],
      classification: "CAR_SEAT",
    },
    {
      productId: 71,
      status: "needs_review",
      blockers: [],
      warnings: ["Potwierdz publish"],
      classification: "existing-offer-update",
    },
  ]);

  assert.equal(rows[0]?.status, "blocked");
  assert.equal(rows[0]?.blockers[0], "brand");
  assert.equal(rows[1]?.warnings[0], "Potwierdz publish");
});

test("serializeExportApiSelection keeps marketplace and product ids in query-safe format", () => {
  assert.equal(
    serializeExportApiSelection({ marketplaceSlug: "allegro", productIds: [70, 71] }),
    "marketplace=allegro&productIds=70,71"
  );
});

test("normalizeExportRunRows maps run summary list", () => {
  const runs = normalizeExportRunRows([
    { id: 51, marketplaceSlug: "allegro", status: "queued", summary: { eligibleCount: 2 } },
  ]);

  assert.equal(runs[0]?.id, 51);
  assert.equal(runs[0]?.eligibleCount, 2);
});

test("parseExportApiSelection reads marketplace and product ids from query string", () => {
  const parsed = parseExportApiSelection("marketplace=allegro&productIds=70,71");

  assert.equal(parsed.marketplaceSlug, "allegro");
  assert.deepEqual(parsed.productIds, [70, 71]);
});

test("getExportRunTone maps failed state to danger tone", () => {
  assert.equal(getExportRunTone("failed"), "danger");
  assert.equal(getExportRunTone("done"), "ready");
});

test("buildExportApiHref keeps selected product ids and marketplace", () => {
  assert.equal(
    buildExportApiHref({ marketplaceSlug: "allegro", productIds: [70, 71] }),
    "/dashboard/export-api?marketplace=allegro&productIds=70,71"
  );
});
