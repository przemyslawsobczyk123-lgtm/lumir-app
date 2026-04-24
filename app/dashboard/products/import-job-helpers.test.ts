import test from "node:test";
import assert from "node:assert/strict";

import {
  getProductImportBadgeState,
  hasReportableImportJobItem,
  isImportHubBackgroundJobType,
  isImportModeWithAi,
  summarizeImportJobItems,
} from "./import-job-helpers.ts";

test("summarizeImportJobItems counts duplicate rows separately and exposes duplicate targets", () => {
  const summary = summarizeImportJobItems([
    {
      productId: 88,
      resultJson: {
        provider: "allegro",
        remoteId: "18527975262",
        status: "imported",
        productId: 88,
        aiRequested: true,
      },
    },
    {
      productId: null,
      resultJson: {
        provider: "allegro",
        remoteId: "18527975263",
        status: "duplicate",
        existingProductId: 72,
        existingProductTitle: "Obraz z LuMir",
      },
    },
    {
      productId: null,
      resultJson: {
        provider: "allegro",
        remoteId: "18527975264",
        status: "error",
        message: "Boom",
      },
    },
  ]);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.importedCount, 1);
  assert.equal(summary.duplicateCount, 1);
  assert.equal(summary.failedCount, 1);
  assert.deepEqual(summary.duplicates[0], {
    provider: "allegro",
    remoteId: "18527975263",
    existingProductId: 72,
    existingProductTitle: "Obraz z LuMir",
  });
});

test("getProductImportBadgeState prefers raw_data import metadata and active AI jobs", () => {
  const state = getProductImportBadgeState(
    {
      id: 88,
      rawData: JSON.stringify({
        importMeta: {
          provider: "amazon",
          remoteId: "B012345678",
          aiRequested: true,
        },
      }),
    },
    [
      {
        job: { id: "job-ai-1", type: "ai_generate_bulk", status: "processing" },
        items: [{ productId: 88, status: "processing" }],
      },
    ]
  );

  assert.equal(state.isImported, true);
  assert.equal(state.provider, "amazon");
  assert.equal(state.aiStatus, "processing");
});

test("getProductImportBadgeState accepts compact importMeta from product list rows", () => {
  const state = getProductImportBadgeState(
    {
      id: 88,
      importMeta: {
        provider: "allegro",
        remoteId: "18527975262",
        aiRequested: true,
      },
    },
    []
  );

  assert.equal(state.isImported, true);
  assert.equal(state.provider, "allegro");
});

test("getProductImportBadgeState falls back to active import job item results when product metadata is missing", () => {
  const state = getProductImportBadgeState(
    {
      id: 91,
      rawData: null,
    },
    [
      {
        job: { id: "job-import-1", type: "products_import_marketplace", status: "done" },
        items: [
          {
            productId: 91,
            resultJson: {
              provider: "allegro",
              status: "imported",
              productId: 91,
            },
          },
        ],
      },
    ]
  );

  assert.equal(state.isImported, true);
  assert.equal(state.provider, "allegro");
  assert.equal(state.aiStatus, null);
});

test("getProductImportBadgeState matches import job result product id when item product id is row ordinal", () => {
  const state = getProductImportBadgeState(
    {
      id: 91,
      rawData: null,
    },
    [
      {
        job: { id: "job-import-1", type: "products_import_marketplace", status: "processing" },
        items: [
          {
            productId: 1,
            resultJson: {
              provider: "amazon",
              status: "imported",
              productId: 91,
            },
          },
        ],
      },
    ]
  );

  assert.equal(state.isImported, true);
  assert.equal(state.provider, "amazon");
});

test("getProductImportBadgeState ignores row ordinal when import result has different product id", () => {
  const state = getProductImportBadgeState(
    {
      id: 1,
      rawData: null,
    },
    [
      {
        job: { id: "job-import-1", type: "products_import_marketplace", status: "processing" },
        items: [
          {
            productId: 1,
            resultJson: {
              provider: "amazon",
              status: "imported",
              productId: 91,
            },
          },
        ],
      },
    ]
  );

  assert.equal(state.isImported, false);
  assert.equal(state.provider, null);
});

test("getProductImportBadgeState marks single-product AI follow-up as queued", () => {
  const state = getProductImportBadgeState(
    {
      id: 77,
      rawData: JSON.stringify({
        importMeta: {
          provider: "allegro",
          remoteId: "18527975262",
          aiRequested: true,
        },
      }),
    },
    [
      {
        job: { id: "job-ai-77", type: "ai_generate_single", status: "queued" },
        items: [{ productId: 77, status: "queued" }],
      },
    ]
  );

  assert.equal(state.isImported, true);
  assert.equal(state.provider, "allegro");
  assert.equal(state.aiStatus, "queued");
});

test("isImportModeWithAi accepts canonical and legacy import-plus-ai values", () => {
  assert.equal(isImportModeWithAi("import_with_ai"), true);
  assert.equal(isImportModeWithAi("import_and_ai"), true);
  assert.equal(isImportModeWithAi("import_only"), false);
  assert.equal(isImportModeWithAi(null), false);
});

test("isImportHubBackgroundJobType includes import and both AI follow-up job types", () => {
  assert.equal(isImportHubBackgroundJobType("products_import_marketplace"), true);
  assert.equal(isImportHubBackgroundJobType("ai_generate_bulk"), true);
  assert.equal(isImportHubBackgroundJobType("ai_generate_single"), true);
  assert.equal(isImportHubBackgroundJobType("products_import_excel"), false);
});

test("hasReportableImportJobItem keeps duplicate import rows without product id", () => {
  assert.equal(
    hasReportableImportJobItem({
      productId: null,
      resultJson: {
        status: "duplicate",
        existingProductId: 72,
      },
    }),
    true
  );

  assert.equal(hasReportableImportJobItem({ productId: null, resultJson: null }), false);
});
