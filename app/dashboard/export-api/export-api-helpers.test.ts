import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExportApiHref,
  canDownloadMiraklExportFile,
  canStartExportRun,
  canRunMarketplacePreflight,
  canSelectExportReadinessRow,
  filterExportReadinessRows,
  getExportReadinessPresentation,
  getExportOperationFilter,
  getSelectableExportReadinessIds,
  getExportRunTone,
  getVisibleExportMarketplaceOptions,
  normalizeAllegroExportFields,
  normalizeExportPreflightResult,
  normalizeExportReadinessRows,
  normalizeExportRunRows,
  parseExportApiSelection,
  serializeExportApiSelection,
} from "./export-api-helpers.ts";

test("getExportOperationFilter groups Allegro export operations for large lists", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 76,
      status: "ready",
      classification: "existing-offer-update",
      remoteSnapshot: { targetKind: "existing", remoteOfferId: "18527975262" },
    },
    {
      productId: 82,
      status: "blocked",
      classification: "new-offer-create",
      remoteSnapshot: { targetKind: "create" },
    },
    {
      productId: 83,
      status: "blocked",
      classification: "duplicate-offer-conflict",
      blockers: ["duplicate_allegro_external_id"],
      remoteSnapshot: { targetKind: "conflict", remoteOfferId: "18527975262" },
    },
    {
      productId: 84,
      status: "blocked",
      classification: "existing-offer-update",
      blockers: ["missing_remote_offer_link"],
    },
  ]);

  assert.deepEqual(rows.map(getExportOperationFilter), ["existing", "create", "conflict", "missing_link"]);
});

test("filterExportReadinessRows combines status, operation and search query", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 76,
      status: "ready",
      classification: "existing-offer-update",
      summary: "Aktualizacja ceny",
      remoteSnapshot: {
        targetKind: "existing",
        remoteOfferId: "18527975262",
        remoteListingRef: "Obraz Dawida N. gory i lasy",
        externalId: "lumir:9:76",
      },
    },
    {
      productId: 82,
      status: "blocked",
      classification: "new-offer-create",
      blockers: ["title_keyword_coverage"],
      remoteSnapshot: { targetKind: "create" },
    },
    {
      productId: 83,
      status: "blocked",
      classification: "duplicate-offer-conflict",
      blockers: ["duplicate_allegro_external_id"],
      remoteSnapshot: { targetKind: "conflict", remoteOfferId: "18527975262" },
    },
  ]);

  assert.deepEqual(
    filterExportReadinessRows(rows, { statusFilter: "all", operationFilter: "existing", query: "18527975262" }).map((row) => row.productId),
    [76]
  );
  assert.deepEqual(
    filterExportReadinessRows(rows, { statusFilter: "blocked", operationFilter: "create", query: "seo" }).map((row) => row.productId),
    [82]
  );
  assert.deepEqual(
    filterExportReadinessRows(rows, { statusFilter: "blocked", operationFilter: "conflict", query: "external id" }).map((row) => row.productId),
    [83]
  );
});

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

test("normalizeExportReadinessRows renders object diagnostics as readable labels", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 70,
      status: "blocked",
      blockers: [
        { key: "missing_remote_offer_link", message: "Brak powiazania z oferta zdalna Allegro" },
        { code: "MISSING_REQUIRED", field: "brand" },
      ],
      warnings: [{ message: "Draft wymaga review" }],
    },
  ]);

  assert.deepEqual(rows[0]?.blockers, [
    "Brak powiazania z oferta zdalna Allegro",
    "brand",
  ]);
  assert.deepEqual(rows[0]?.warnings, ["Draft wymaga review"]);
});

test("normalizeExportPreflightResult renders object blockers from backend", () => {
  const result = normalizeExportPreflightResult({
    marketplaceSlug: "allegro",
    eligibleCount: 0,
    blockedCount: 1,
    eligibleItems: [],
    blockedItems: [
      {
        productId: 74,
        blockers: [{ key: "needs_review_confirmation", message: "Potwierdz review" }],
      },
    ],
    groups: [],
  });

  assert.equal(result?.blockedItems[0]?.blockers[0], "Potwierdz review");
});

test("normalizeExportReadinessRows keeps Allegro remote offer target data", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 76,
      status: "blocked",
      classification: "existing-offer-update",
      remoteSnapshot: {
        targetKind: "existing",
        remoteOfferId: "18527975262",
        remoteListingRef: "Obraz Dawida N. gory i lasy",
        externalId: "ean:5901234123457",
      },
      diffRows: [{ key: "stock", changed: true }],
    },
  ]);

  assert.equal(rows[0]?.targetKind, "existing");
  assert.equal(rows[0]?.remoteOfferId, "18527975262");
  assert.equal(rows[0]?.remoteListingRef, "Obraz Dawida N. gory i lasy");
  assert.equal(rows[0]?.externalId, "ean:5901234123457");
  assert.equal(rows[0]?.diffCount, 1);
});

test("existing Allegro update can enter preflight even when raw readiness is blocked", () => {
  const row = normalizeExportReadinessRows([
    {
      productId: 76,
      status: "blocked",
      classification: "existing-offer-update",
      blockers: ["title_keyword_coverage", "minimum_image_count"],
      remoteSnapshot: {
        targetKind: "existing",
        remoteOfferId: "18527975262",
      },
    },
  ])[0];

  assert.equal(canSelectExportReadinessRow(row), true);
  assert.deepEqual(getExportReadinessPresentation(row), {
    bucket: "ready",
    label: "Gotowe do aktualizacji",
    description: "Istniejaca oferta Allegro. Preflight sprawdzi zmiany tylko w wybranych polach.",
    actionLabel: "Zaznacz do update",
    tone: "ready",
    selectable: true,
  });
});

test("duplicate Allegro target stays blocked and not selectable", () => {
  const row = normalizeExportReadinessRows([
    {
      productId: 77,
      status: "blocked",
      classification: "duplicate-offer-conflict",
      blockers: ["duplicate_allegro_external_id"],
      remoteSnapshot: {
        targetKind: "conflict",
        remoteOfferId: "18527975262",
      },
    },
  ])[0];

  assert.equal(canSelectExportReadinessRow(row), false);
  const presentation = getExportReadinessPresentation(row);
  assert.equal(presentation.bucket, "blocked");
  assert.equal(presentation.label, "Konflikt oferty");
  assert.equal(presentation.tone, "danger");
});

test("getSelectableExportReadinessIds removes preselected conflicts from export payload", () => {
  const rows = normalizeExportReadinessRows([
    {
      productId: 76,
      status: "blocked",
      classification: "existing-offer-update",
      remoteSnapshot: { targetKind: "existing", remoteOfferId: "18527975262" },
    },
    {
      productId: 77,
      status: "blocked",
      classification: "duplicate-offer-conflict",
      remoteSnapshot: { targetKind: "conflict", remoteOfferId: "18527975262" },
    },
  ]);

  assert.deepEqual(getSelectableExportReadinessIds(rows, [76, 77, 999]), [76]);
});

test("canRunMarketplacePreflight only enables Allegro write-side preflight", () => {
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "allegro",
    accountId: 13,
    selectedCount: 1,
    loading: false,
  }), true);
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "amazon",
    accountId: 13,
    selectedCount: 1,
    loading: false,
  }), false);
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "allegro",
    accountId: null,
    selectedCount: 1,
    loading: false,
  }), false);
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "mediaexpert",
    accountId: null,
    selectedCount: 1,
    loading: false,
  }), true);
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "empik",
    accountId: null,
    selectedCount: 1,
    loading: false,
  }), true);
  assert.equal(canRunMarketplacePreflight({
    marketplaceSlug: "amazon",
    accountId: null,
    selectedCount: 1,
    loading: false,
  }), false);
});

test("canDownloadMiraklExportFile enables XLSX download only for Mirakl marketplaces", () => {
  assert.equal(canDownloadMiraklExportFile({ marketplaceSlug: "mediaexpert", eligibleCount: 1, loading: false }), true);
  assert.equal(canDownloadMiraklExportFile({ marketplaceSlug: "empik", eligibleCount: 1, loading: false }), true);
  assert.equal(canDownloadMiraklExportFile({ marketplaceSlug: "allegro", eligibleCount: 1, loading: false }), false);
  assert.equal(canDownloadMiraklExportFile({ marketplaceSlug: "mediaexpert", eligibleCount: 0, loading: false }), false);
});

test("canStartExportRun requires Allegro account and eligible preflight rows", () => {
  assert.equal(canStartExportRun({ marketplaceSlug: "allegro", accountId: 13, eligibleCount: 1, loading: false }), true);
  assert.equal(canStartExportRun({ marketplaceSlug: "allegro", accountId: null, eligibleCount: 1, loading: false }), false);
  assert.equal(canStartExportRun({ marketplaceSlug: "amazon", accountId: 13, eligibleCount: 1, loading: false }), false);
  assert.equal(canStartExportRun({ marketplaceSlug: "allegro", accountId: 13, eligibleCount: 0, loading: false }), false);
});

test("getVisibleExportMarketplaceOptions hides Amazon by default for MVP", () => {
  assert.deepEqual(
    getVisibleExportMarketplaceOptions(false).map((option) => option.value),
    ["allegro", "mediaexpert", "empik"]
  );
  assert.deepEqual(
    getVisibleExportMarketplaceOptions(true).map((option) => option.value),
    ["allegro", "mediaexpert", "empik", "amazon"]
  );
});

test("serializeExportApiSelection keeps marketplace and product ids in query-safe format", () => {
  assert.equal(
    serializeExportApiSelection({ marketplaceSlug: "allegro", productIds: [70, 71] }),
    "marketplace=allegro&productIds=70,71"
  );
  assert.equal(
    serializeExportApiSelection({ marketplaceSlug: "allegro", productIds: [74], accountId: 13, confirmNeedsReview: true }),
    "marketplace=allegro&productIds=74&accountId=13&confirmNeedsReview=1"
  );
  assert.equal(
    serializeExportApiSelection({
      marketplaceSlug: "allegro",
      productIds: [74],
      accountId: 13,
      fields: { title: true, description: false, price: false, stock: true },
    }),
    "marketplace=allegro&productIds=74&accountId=13&fields=title%2Cstock"
  );
  assert.equal(
    serializeExportApiSelection({
      marketplaceSlug: "allegro",
      productIds: [74],
      accountId: 13,
      fields: { title: false, description: false, price: false, stock: false },
    }),
    "marketplace=allegro&productIds=74&accountId=13&fields=none"
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
  assert.equal(parsed.accountId, null);
  assert.equal(parsed.confirmNeedsReview, false);

  const withConfirm = parseExportApiSelection("marketplace=allegro&productIds=74&accountId=13&confirmNeedsReview=1");
  assert.equal(withConfirm.confirmNeedsReview, true);

  const withFields = parseExportApiSelection("marketplace=allegro&productIds=74&accountId=13&fields=title,stock");
  assert.deepEqual(withFields.fields, { title: true, description: false, price: false, stock: true });

  const withNoFields = parseExportApiSelection("marketplace=allegro&productIds=74&accountId=13&fields=none");
  assert.deepEqual(withNoFields.fields, { title: false, description: false, price: false, stock: false });
});

test("normalizeAllegroExportFields defaults all fields and parses selected fields", () => {
  assert.deepEqual(normalizeAllegroExportFields(null), {
    title: true,
    description: true,
    price: true,
    stock: true,
  });
  assert.deepEqual(normalizeAllegroExportFields("title,stock"), {
    title: true,
    description: false,
    price: false,
    stock: true,
  });
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
  assert.equal(
    buildExportApiHref({
      marketplaceSlug: "allegro",
      productIds: [74],
      accountId: 13,
      fields: { title: true, description: false, price: false, stock: true },
    }),
    "/dashboard/export-api?marketplace=allegro&productIds=74&accountId=13&fields=title%2Cstock"
  );
});
