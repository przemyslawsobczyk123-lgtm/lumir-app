import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardNavItems } from "./nav-helpers.ts";

test("dashboard nav keeps products clean and moves imports to its own sidebar item", () => {
  const items = getDashboardNavItems({
    dashboard: "Dashboard",
    products: "Produkty",
    imports: "Importy",
    exportApi: "Export",
    billing: "Billing",
    settings: "Ustawienia",
  });

  assert.deepEqual(
    items.map((item) => item.href),
    [
      "/dashboard",
      "/dashboard/products",
      "/dashboard/imports",
      "/dashboard/export-api",
      "/dashboard/billing",
      "/dashboard/settings",
    ],
  );

  const products = items.find((item) => item.href === "/dashboard/products");
  assert.equal(products?.exact, false);
  assert.equal(items.some((item) => item.href.includes("/products/import")), false);
  assert.equal(items.some((item) => item.href.includes("/products") && item.href.includes("history")), false);
});
