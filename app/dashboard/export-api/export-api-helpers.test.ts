import assert from "node:assert/strict";
import test from "node:test";

import * as exportApiHelpers from "./export-api-helpers.ts";
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
  parseOperationDiagnostic,
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

test("export marketplace tabs use vivid dashboard-like active styling", () => {
  const getTabClass = (exportApiHelpers as {
    getExportMarketplaceTabClass?: (active: boolean, enabled: boolean) => string;
  }).getExportMarketplaceTabClass;

  assert.equal(typeof getTabClass, "function");
  assert.match(getTabClass?.(true, true) ?? "", /bg-gradient-to-br/);
  assert.match(getTabClass?.(true, true) ?? "", /from-indigo-500/);
  assert.match(getTabClass?.(true, true) ?? "", /to-violet-600/);
  assert.match(getTabClass?.(true, true) ?? "", /text-white/);
  assert.match(getTabClass?.(false, true) ?? "", /hover:border-indigo-300/);
  assert.match(getTabClass?.(false, true) ?? "", /\[html\.dark_&\]:hover:bg-\[#1f2450\]/);
  assert.match(getTabClass?.(false, false) ?? "", /cursor-not-allowed/);
  assert.doesNotMatch(getTabClass?.(false, true) ?? "", /dark:/);
});

test("export helper panel uses matched dark-mode tone classes", () => {
  const classes = (exportApiHelpers as {
    exportHelperPanelClasses?: {
      card: string;
      eyebrow: string;
      body: string;
      ready: string;
      review: string;
      blocked: string;
    };
  }).exportHelperPanelClasses;

  assert.ok(classes);
  assert.match(classes.card, /bg-indigo-100/);
  assert.match(classes.card, /\[html\.dark_&\]:bg-\[#17172f\]/);
  assert.match(classes.eyebrow, /text-indigo-600/);
  assert.match(classes.eyebrow, /\[html\.dark_&\]:text-\[#a5b4fc\]/);
  assert.match(classes.body, /text-indigo-700/);
  assert.match(classes.body, /\[html\.dark_&\]:text-\[#c7d2fe\]/);
  assert.match(classes.ready, /bg-emerald-100/);
  assert.match(classes.ready, /text-emerald-900/);
  assert.match(classes.ready, /\[html\.dark_&\]:bg-\[#052e2b\]/);
  assert.match(classes.ready, /\[html\.dark_&\]:text-\[#a7f3d0\]/);
  assert.match(classes.review, /bg-amber-100/);
  assert.match(classes.review, /text-amber-900/);
  assert.match(classes.review, /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(classes.review, /\[html\.dark_&\]:text-\[#fde68a\]/);
  assert.match(classes.blocked, /bg-rose-100/);
  assert.match(classes.blocked, /text-rose-900/);
  assert.match(classes.blocked, /\[html\.dark_&\]:bg-\[#3f101c\]/);
  assert.match(classes.blocked, /\[html\.dark_&\]:text-\[#fecdd3\]/);
  assert.doesNotMatch(Object.values(classes).join(" "), /dark:/);
  assert.doesNotMatch(Object.values(classes).join(" "), /(emerald|amber|rose|indigo)-500\/15/);
});

test("export tone helpers match import visibility and app dark mode", () => {
  const helpers = exportApiHelpers as {
    getExportOperationToneClasses?: (tone: "ready" | "warning" | "danger" | "info") => { badge: string; row: string };
    getExportRunToneClass?: (tone: "ready" | "warning" | "danger" | "info") => string;
    getExportReasonChipClass?: (tone: "warning" | "danger") => string;
    exportPreflightSummaryClasses?: { ready: string; blocked: string; info: string };
  };

  assert.equal(typeof helpers.getExportOperationToneClasses, "function");
  assert.equal(typeof helpers.getExportRunToneClass, "function");
  assert.equal(typeof helpers.getExportReasonChipClass, "function");
  assert.ok(helpers.exportPreflightSummaryClasses);

  const ready = helpers.getExportOperationToneClasses?.("ready");
  assert.match(ready?.badge ?? "", /bg-emerald-100/);
  assert.match(ready?.badge ?? "", /text-emerald-900/);
  assert.match(ready?.badge ?? "", /\[html\.dark_&\]:bg-\[#052e2b\]/);
  assert.match(ready?.badge ?? "", /\[html\.dark_&\]:text-\[#a7f3d0\]/);
  assert.doesNotMatch(ready?.badge ?? "", /dark:/);

  const warningRun = helpers.getExportRunToneClass?.("warning") ?? "";
  assert.match(warningRun, /bg-amber-100/);
  assert.match(warningRun, /text-amber-900/);
  assert.match(warningRun, /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(warningRun, /\[html\.dark_&\]:text-\[#fde68a\]/);
  assert.doesNotMatch(warningRun, /dark:/);

  const dangerChip = helpers.getExportReasonChipClass?.("danger") ?? "";
  assert.match(dangerChip, /bg-rose-100/);
  assert.match(dangerChip, /text-rose-900/);
  assert.match(dangerChip, /\[html\.dark_&\]:bg-\[#3f101c\]/);
  assert.match(dangerChip, /\[html\.dark_&\]:text-\[#fecdd3\]/);
  assert.doesNotMatch(dangerChip, /dark:/);

  assert.match(helpers.exportPreflightSummaryClasses?.blocked ?? "", /bg-rose-100/);
  assert.match(helpers.exportPreflightSummaryClasses?.blocked ?? "", /\[html\.dark_&\]:bg-\[#3f101c\]/);
  assert.match(helpers.exportPreflightSummaryClasses?.info ?? "", /\[html\.dark_&\]:bg-\[#082f49\]/);
  assert.doesNotMatch([
    ready?.badge ?? "",
    warningRun,
    dangerChip,
    helpers.exportPreflightSummaryClasses?.ready ?? "",
    helpers.exportPreflightSummaryClasses?.blocked ?? "",
    helpers.exportPreflightSummaryClasses?.info ?? "",
  ].join(" "), /(emerald|amber|rose|sky)-500\/15/);
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

test("parseOperationDiagnostic normalizes safe export diagnostic fields", () => {
  const diagnostic = parseOperationDiagnostic({
    severity: "error",
    title: "Publikacja odrzucona",
    message: "Allegro odrzucilo payload",
    code: "ALLEGRO_REJECTED",
    hint: "Popraw parametry i uruchom retry",
    details: { field: "price", reason: "too_low" },
    retryable: true,
    source: "allegro",
  });

  assert.deepEqual(diagnostic, {
    severity: "error",
    title: "Publikacja odrzucona",
    message: "Allegro odrzucilo payload",
    code: "ALLEGRO_REJECTED",
    hint: "Popraw parametry i uruchom retry",
    details: "{\"field\":\"price\",\"reason\":\"too_low\"}",
    retryable: true,
    source: "allegro",
  });
});

test("normalizeExportRunRows preserves failed item diagnostics from item and nested error", () => {
  const runs = normalizeExportRunRows([
    {
      id: 77,
      marketplaceSlug: "allegro",
      status: "failed",
      summary: { eligibleCount: 3, blockedCount: 1 },
      items: [
        {
          id: 1,
          productId: 70,
          status: "error",
          diagnostic: {
            title: "Top-level export fail",
            message: "Offer update rejected",
            code: "OFFER_UPDATE_REJECTED",
            details: "validation failed",
            retryable: false,
            source: "worker",
          },
        },
        {
          id: 2,
          productId: "71",
          status: "failed",
          error: {
            message: "Legacy nested error",
            diagnostic: {
              title: "Nested export fail",
              message: "Timeout from API",
              code: "ALLEGRO_TIMEOUT",
              hint: "Retry za chwile",
              details: { timeoutMs: 30000 },
              retryable: true,
              source: "allegro",
            },
          },
        },
        {
          id: 3,
          productId: 72,
          status: "success",
        },
      ],
    },
  ]);

  assert.equal(runs[0]?.items.length, 3);
  assert.equal(runs[0]?.failedItems.length, 2);
  assert.equal(runs[0]?.failedItems[0]?.diagnostic?.title, "Top-level export fail");
  assert.equal(runs[0]?.failedItems[0]?.diagnostic?.retryable, false);
  assert.equal(runs[0]?.failedItems[0]?.diagnostic?.details, "validation failed");
  assert.equal(runs[0]?.failedItems[1]?.diagnostic?.title, "Nested export fail");
  assert.equal(runs[0]?.failedItems[1]?.diagnostic?.retryable, true);
  assert.equal(runs[0]?.failedItems[1]?.diagnostic?.details, "{\"timeoutMs\":30000}");
  assert.equal(runs[0]?.failedItems[1]?.errorMessage, "Legacy nested error");
});

test("normalizeExportRunRows ignores malformed export diagnostics safely", () => {
  const runs = normalizeExportRunRows([
    {
      id: 78,
      marketplaceSlug: "allegro",
      items: [
        { productId: 70, status: "error", diagnostic: ["bad"] },
        { productId: 71, status: "error", error: { diagnostic: { retryable: true } } },
      ],
    },
  ]);

  assert.equal(parseOperationDiagnostic(["bad"]), null);
  assert.equal(runs[0]?.failedItems[0]?.diagnostic, null);
  assert.equal(runs[0]?.failedItems[1]?.diagnostic, null);
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
