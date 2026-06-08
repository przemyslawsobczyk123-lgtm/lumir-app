import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getProductListPrimaryActions,
  getProductPaginationWindow,
  normalizeProductPageSize,
  PRODUCT_PAGE_SIZE_OPTIONS,
} from "./page-layout-helpers.ts";

test("product listing primary actions keep only Add product after imports move to sidebar", () => {
  const actions = getProductListPrimaryActions({
    addProduct: "Dodaj produkt",
    importProducts: "Import",
  });

  assert.deepEqual(actions, [
    { key: "add-product", label: "Dodaj produkt", href: "/dashboard/new-product" },
  ]);
});

test("product pagination window keeps current page visible for large result sets", () => {
  assert.deepEqual(getProductPaginationWindow(49, 80), [1, "ellipsis-start", 47, 48, 49, 50, 51, "ellipsis-end", 80]);
  assert.deepEqual(getProductPaginationWindow(1, 3), [1, 2, 3]);
});

test("product page size options stay bounded for large seller catalogs", () => {
  assert.deepEqual(PRODUCT_PAGE_SIZE_OPTIONS, [100, 250, 500]);
  assert.equal(normalizeProductPageSize(250), 250);
  assert.equal(normalizeProductPageSize(999), 500);
  assert.equal(normalizeProductPageSize(0), 100);
});

test("product rows render one simple status and no duplicate status badges", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const statusMarkers = source.match(/data-product-state=/g) ?? [];

  assert.equal(statusMarkers.length, 2);
  assert.doesNotMatch(source, /importedBadgeMeta/);
  assert.doesNotMatch(source, /aiBadgeMeta/);
  assert.doesNotMatch(source, /listingIssue/);
  assert.doesNotMatch(source, /badgeStatusPrefix/);
  assert.doesNotMatch(source, /STATUS_FILTER/);
  assert.doesNotMatch(source, /const \[statusFilter|setStatusFilter/);
  assert.doesNotMatch(source, /\{ focus: "review" as const/);
});
