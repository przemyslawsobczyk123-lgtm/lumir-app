import assert from "node:assert/strict";
import test from "node:test";

import { getProductListPrimaryActions, getProductPaginationWindow } from "./page-layout-helpers.ts";

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
