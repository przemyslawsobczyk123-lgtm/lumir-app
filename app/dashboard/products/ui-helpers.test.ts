import assert from "node:assert/strict";
import test from "node:test";

import {
  canAutoAssignCategory,
  createProductExportBatchGroups,
  findProductExportCategoryGroup,
  filterSupportedSalesChannels,
  filterProductsByListingFocus,
  getExportableProductIds,
  getProductExportBatchSummary,
  getProductExportCategoryGroups,
  getProductExportPreflight,
  getProductExportSummary,
  getRetryableProductExportGroups,
  getDraftCategoryHint,
  getActiveProductFilterSummary,
  getProductListingBadgeKind,
  getProductListingStats,
  getProductListingState,
  getSimpleProductStatus,
  getVisibleProductIntegrations,
  hasActiveProductFilters,
  isSupportedSalesChannelSlug,
  parseProductIntegrations,
  updateProductExportBatchGroup,
} from "./ui-helpers.ts";

test("hasActiveProductFilters returns true when search text exists", () => {
  assert.equal(hasActiveProductFilters("router", "", ""), true);
});

test("hasActiveProductFilters returns true when marketplace filter exists", () => {
  assert.equal(hasActiveProductFilters("", "", "empik"), true);
});

test("hasActiveProductFilters returns true when source filter exists", () => {
  assert.equal(hasActiveProductFilters("", "", "", "all", "", "icecat"), true);
});

test("hasActiveProductFilters returns false when all filters are empty", () => {
  assert.equal(hasActiveProductFilters("   ", "", ""), false);
});

test("hasActiveProductFilters returns true when listing focus is active", () => {
  assert.equal(hasActiveProductFilters("", "", "", "blocked"), true);
});

test("getActiveProductFilterSummary describes active filters for transparent toolbar state", () => {
  assert.deepEqual(
    getActiveProductFilterSummary(
      {
        search: "lampa",
        statusFilter: "needs_review",
        marketplaceFilter: "mediaexpert",
        marketplaceCategoryFilter: "RTV/Oswietlenie",
        sourceFilter: "icecat",
        listingFocus: "blocked",
      },
      {
        search: "Szukasz",
        status: "Status",
        marketplace: "Kanal",
        marketplaceCategory: "Kategoria",
        source: "Zrodlo",
        focus: "Etap",
        statusLabels: { needs_review: "Do sprawdzenia" },
        marketplaceLabels: { mediaexpert: "Media Expert" },
        sourceLabels: { icecat: "Icecat" },
        focusLabels: { blocked: "Zablokowane" },
      }
    ),
    [
      { key: "search", label: "Szukasz", value: "lampa" },
      { key: "focus", label: "Etap", value: "Zablokowane" },
      { key: "status", label: "Status", value: "Do sprawdzenia" },
      { key: "marketplace", label: "Kanal", value: "Media Expert" },
      { key: "marketplaceCategory", label: "Kategoria", value: "RTV/Oswietlenie" },
      { key: "source", label: "Zrodlo", value: "Icecat" },
    ]
  );
});

test("marketplace category filter counts as active only with channel selected", () => {
  assert.equal(hasActiveProductFilters("", "", "", "all", "RTV/Oswietlenie"), false);
  assert.equal(hasActiveProductFilters("", "", "mediaexpert", "all", "RTV/Oswietlenie"), true);
});

test("getProductListingBadgeKind maps listing state to user-facing issue kind", () => {
  assert.equal(getProductListingBadgeKind(getProductListingState({ status: "needs_review", integrations: null })), "review");
  assert.equal(getProductListingBadgeKind(getProductListingState({ status: "pending", integrations: null })), "unmapped");
  assert.equal(
    getProductListingBadgeKind(getProductListingState({ status: "pending", integrations: "empik\x01Empik\x012" })),
    "attributes"
  );
  assert.equal(
    getProductListingBadgeKind(getProductListingState({ status: "mapped", integrations: "empik\x01Empik\x010|||mediaexpert\x01Media Expert\x012" })),
    "partial"
  );
  assert.equal(
    getProductListingBadgeKind(getProductListingState({ status: "mapped", integrations: "empik\x01Empik\x010" })),
    "ready"
  );
});

test("canAutoAssignCategory enables only stage-1 marketplaces", () => {
  assert.equal(canAutoAssignCategory("empik"), true);
  assert.equal(canAutoAssignCategory("mediaexpert"), true);
  assert.equal(canAutoAssignCategory("allegro"), false);
});

test("getDraftCategoryHint returns auto-assign hint when category is missing on supported marketplace", () => {
  assert.match(
    getDraftCategoryHint("", "empik") || "",
    />= 90%/
  );
});

test("getDraftCategoryHint stays empty for allegro without category", () => {
  assert.equal(getDraftCategoryHint("", "allegro"), null);
});

test("parseProductIntegrations decodes compact integrations payload", () => {
  assert.deepEqual(
    parseProductIntegrations("empik\x01Empik\x010\x01Dom/Ksiazki|||mediaexpert\x01Media Expert\x012\x01Elektronika/Audio"),
    [
      { slug: "empik", name: "Empik", missing: 0, categoryPath: "Dom/Ksiazki" },
      { slug: "mediaexpert", name: "Media Expert", missing: 2, categoryPath: "Elektronika/Audio" },
    ]
  );
});

test("getVisibleProductIntegrations hides marketplaces without selected category", () => {
  assert.deepEqual(
    getVisibleProductIntegrations(
      "allegro\x01Allegro\x010\x01|||empik\x01Empik\x012\x01Ksiazki|||mediaexpert\x01Media Expert\x010\x01   "
    ),
    [
      { slug: "empik", name: "Empik", missing: 2, categoryPath: "Ksiazki" },
    ]
  );
});

test("getSimpleProductStatus returns one simple state", () => {
  assert.equal(
    getSimpleProductStatus({ status: "pending", integrations: null, isImported: false }),
    "new"
  );
  assert.equal(
    getSimpleProductStatus({ status: "pending", integrations: null, isImported: true }),
    "pending"
  );
  assert.equal(
    getSimpleProductStatus({
      status: "mapped",
      integrations: "empik\x01Empik\x010\x01Ksiazki|||mediaexpert\x01Media Expert\x010\x01RTV",
      isImported: true,
    }),
    "ready"
  );
  assert.equal(
    getSimpleProductStatus({
      status: "mapped",
      integrations: "empik\x01Empik\x010\x01Ksiazki|||mediaexpert\x01Media Expert\x010\x01",
      isImported: true,
    }),
    "ready"
  );
  assert.equal(
    getSimpleProductStatus({
      status: "needs_review",
      integrations: "empik\x01Empik\x010\x01Ksiazki",
      isImported: false,
    }),
    "pending"
  );
});

test("parseProductIntegrations hides unsupported legacy sales channels", () => {
  assert.deepEqual(
    parseProductIntegrations(
      [
        "decathlon\x01Decathlon\x010\x01Sport",
        "rtveuroagd\x01RTV Euro AGD\x010\x01RTV",
        "xkom\x01X-Kom\x011\x01Komputery",
        "allegro\x01Allegro\x010\x01Dom",
        "empik\x01Empik\x012\x01Ksiazki",
        "mediaexpert\x01Media Expert\x010\x01AGD",
      ].join("|||")
    ),
    [
      { slug: "allegro", name: "Allegro", missing: 0, categoryPath: "Dom" },
      { slug: "empik", name: "Empik", missing: 2, categoryPath: "Ksiazki" },
      { slug: "mediaexpert", name: "Media Expert", missing: 0, categoryPath: "AGD" },
    ]
  );
});

test("sales channel filter allows only Allegro Empik and Media Expert", () => {
  assert.equal(isSupportedSalesChannelSlug("allegro"), true);
  assert.equal(isSupportedSalesChannelSlug("empik"), true);
  assert.equal(isSupportedSalesChannelSlug("mediaexpert"), true);
  assert.equal(isSupportedSalesChannelSlug("decathlon"), false);
  assert.equal(isSupportedSalesChannelSlug("xkom"), false);
  assert.equal(isSupportedSalesChannelSlug("rtveuroagd"), false);

  assert.deepEqual(
    filterSupportedSalesChannels(
      [
        { slug: "decathlon", name: "Decathlon" },
        { slug: "allegro", name: "Allegro" },
        { slug: "xkom", name: "X-Kom" },
        { slug: "empik", name: "Empik" },
        { slug: "mediaexpert", name: "Media Expert" },
      ],
      (item) => item.slug
    ),
    [
      { slug: "allegro", name: "Allegro" },
      { slug: "empik", name: "Empik" },
      { slug: "mediaexpert", name: "Media Expert" },
    ]
  );
});

test("getProductListingState marks review rows before other states", () => {
  assert.deepEqual(
    getProductListingState({
      status: "needs_review",
      integrations: "empik\x01Empik\x010",
    }),
    {
      focus: "review",
      blockerKind: null,
      readyMarketplaceCount: 1,
      missingMarketplaceCount: 0,
      integrationCount: 1,
    }
  );
});

test("getProductListingState marks rows without marketplace mapping as blocked unmapped", () => {
  assert.deepEqual(
    getProductListingState({
      status: "pending",
      integrations: null,
    }),
    {
      focus: "blocked",
      blockerKind: "unmapped",
      readyMarketplaceCount: 0,
      missingMarketplaceCount: 0,
      integrationCount: 0,
    }
  );
});

test("getProductListingStats aggregates ready review blocked and unmapped counts", () => {
  const stats = getProductListingStats([
    { status: "mapped", integrations: "empik\x01Empik\x010" },
    { status: "needs_review", integrations: "empik\x01Empik\x010" },
    { status: "pending", integrations: "mediaexpert\x01Media Expert\x012" },
    { status: "pending", integrations: null },
  ]);

  assert.deepEqual(stats, {
    all: 4,
    ready: 1,
    review: 1,
    blocked: 2,
    unmapped: 1,
    attributesMissing: 1,
  });
});

test("filterProductsByListingFocus keeps only ready rows for ready focus", () => {
  const products = [
    { id: 1, status: "mapped", integrations: "empik\x01Empik\x010" },
    { id: 2, status: "needs_review", integrations: "empik\x01Empik\x010" },
    { id: 3, status: "pending", integrations: null },
  ];

  assert.deepEqual(
    filterProductsByListingFocus(products, "ready").map((product) => product.id),
    [1]
  );
});

test("getDraftCategoryHint uses ascii-safe stage-1 auto-assign copy", () => {
  assert.match(
    getDraftCategoryHint("", "mediaexpert") || "",
    /AI sprobuje przypisac kategorie automatycznie/
  );
});

test("getProductExportPreflight marks selected rows ready or blocked for chosen marketplace", () => {
  const rows = getProductExportPreflight(
    [
      { id: 1, title: "Ready", integrations: "empik\x01Empik\x010\x01Dom/Ksiazki" },
      { id: 2, title: "Attr gap", integrations: "empik\x01Empik\x013\x01Dom/Ksiazki" },
      { id: 3, title: "No empik", integrations: "mediaexpert\x01Media Expert\x010" },
      { id: 4, title: "No category", integrations: "empik\x01Empik\x010" },
    ],
    [1, 2, 3, 4],
    "empik"
  );

  assert.deepEqual(rows, [
    { id: 1, title: "Ready", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
    { id: 2, title: "Attr gap", status: "blocked", reason: "missing_attributes", missing: 3, categoryPath: "Dom/Ksiazki" },
    { id: 3, title: "No empik", status: "blocked", reason: "marketplace_not_mapped", missing: 0, categoryPath: "" },
    { id: 4, title: "No category", status: "blocked", reason: "category_missing", missing: 0, categoryPath: "" },
  ]);
});

test("getProductExportSummary counts ready and blocked reasons", () => {
  const summary = getProductExportSummary([
    { id: 1, title: "Ready A", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
    { id: 2, title: "Ready B", status: "ready", reason: null, missing: 0, categoryPath: "Elektronika/Audio" },
    { id: 3, title: "Attr gap", status: "blocked", reason: "missing_attributes", missing: 2, categoryPath: "Dom/Ksiazki" },
    { id: 4, title: "No map", status: "blocked", reason: "marketplace_not_mapped", missing: 0, categoryPath: "" },
    { id: 5, title: "No category", status: "blocked", reason: "category_missing", missing: 0, categoryPath: "" },
  ]);

  assert.deepEqual(summary, {
    total: 5,
    ready: 2,
    blocked: 3,
    missingAttributes: 1,
    notMapped: 1,
    categoryMissing: 1,
    readyCategories: 2,
    mixedCategories: true,
  });
});

test("getExportableProductIds returns only ready rows", () => {
  assert.deepEqual(
    getExportableProductIds([
      { id: 1, title: "Ready A", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
      { id: 2, title: "Ready B", status: "ready", reason: null, missing: 0, categoryPath: "Elektronika/Audio" },
      { id: 3, title: "Blocked", status: "blocked", reason: "marketplace_not_mapped", missing: 0, categoryPath: "" },
    ]),
    [1, 2]
  );
});

test("getExportableProductIds filters ready rows by category when provided", () => {
  assert.deepEqual(
    getExportableProductIds([
      { id: 1, title: "Ready A", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
      { id: 2, title: "Ready B", status: "ready", reason: null, missing: 0, categoryPath: "Elektronika/Audio" },
      { id: 3, title: "Blocked", status: "blocked", reason: "marketplace_not_mapped", missing: 0, categoryPath: "" },
    ], "Dom/Ksiazki"),
    [1]
  );
});

test("getProductExportCategoryGroups groups only ready rows by category", () => {
  assert.deepEqual(
    getProductExportCategoryGroups([
      { id: 1, title: "Ready A", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
      { id: 2, title: "Ready B", status: "ready", reason: null, missing: 0, categoryPath: "Elektronika/Audio" },
      { id: 3, title: "Ready C", status: "ready", reason: null, missing: 0, categoryPath: "Dom/Ksiazki" },
      { id: 4, title: "Blocked", status: "blocked", reason: "missing_attributes", missing: 2, categoryPath: "Dom/Ksiazki" },
    ]),
    [
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
    ]
  );
});

test("findProductExportCategoryGroup returns exact selected group match", () => {
  assert.deepEqual(
    findProductExportCategoryGroup(
      [
        { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 },
        { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
      ],
      [3, 1]
    ),
    { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 }
  );
});

test("findProductExportCategoryGroup returns null when selection spans multiple groups", () => {
  assert.equal(
    findProductExportCategoryGroup(
      [
        { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 },
        { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
      ],
      [1, 2]
    ),
    null
  );
});

test("createProductExportBatchGroups starts every group in pending state", () => {
  assert.deepEqual(
    createProductExportBatchGroups([
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
    ]),
    [
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2, status: "pending", error: null },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1, status: "pending", error: null },
    ]
  );
});

test("updateProductExportBatchGroup updates only matching category group", () => {
  assert.deepEqual(
    updateProductExportBatchGroup(
      createProductExportBatchGroups([
        { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2 },
        { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
      ]),
      "Elektronika/Audio",
      { status: "failed", error: "timeout" }
    ),
    [
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2, status: "pending", error: null },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1, status: "failed", error: "timeout" },
    ]
  );
});

test("getProductExportBatchSummary counts success failed running and pending groups", () => {
  assert.deepEqual(
    getProductExportBatchSummary([
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2, status: "success", error: null },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1, status: "failed", error: "timeout" },
      { categoryPath: "AGD", productIds: [4], count: 1, status: "running", error: null },
      { categoryPath: "RTV", productIds: [5, 6], count: 2, status: "pending", error: null },
    ]),
    {
      total: 4,
      products: 6,
      success: 1,
      failed: 1,
      running: 1,
      pending: 1,
    }
  );
});

test("getRetryableProductExportGroups returns only failed groups without status metadata", () => {
  assert.deepEqual(
    getRetryableProductExportGroups([
      { categoryPath: "Dom/Ksiazki", productIds: [1, 3], count: 2, status: "success", error: null },
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1, status: "failed", error: "timeout" },
      { categoryPath: "AGD", productIds: [4], count: 1, status: "failed", error: "403" },
    ]),
    [
      { categoryPath: "Elektronika/Audio", productIds: [2], count: 1 },
      { categoryPath: "AGD", productIds: [4], count: 1 },
    ]
  );
});
