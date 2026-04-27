import assert from "node:assert/strict";
import test from "node:test";

import { getProductListPrimaryActions } from "./page-layout-helpers.ts";

test("product listing primary actions keep only Add product after imports move to sidebar", () => {
  const actions = getProductListPrimaryActions({
    addProduct: "Dodaj produkt",
    importProducts: "Import",
  });

  assert.deepEqual(actions, [
    { key: "add-product", label: "Dodaj produkt", href: "/dashboard/new-product" },
  ]);
});
