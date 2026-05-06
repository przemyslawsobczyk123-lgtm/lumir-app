import assert from "node:assert/strict";
import test from "node:test";

import * as navHelpers from "./nav-helpers.ts";
import { getDashboardNavItems } from "./nav-helpers.ts";

test("dashboard nav keeps products clean and moves imports to its own sidebar item", () => {
  const items = getDashboardNavItems({
    dashboard: "Dashboard",
    products: "Produkty",
    imports: "Importy",
    exportApi: "Export",
    sellers: "Sprzedawcy",
    billingStats: "Statystyki",
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

test("dashboard nav gives import and export vivid dashboard tones", () => {
  const items = getDashboardNavItems({
    dashboard: "Dashboard",
    products: "Produkty",
    imports: "Importy",
    exportApi: "Export",
    sellers: "Sprzedawcy",
    billingStats: "Statystyki",
    billing: "Billing",
    settings: "Ustawienia",
  });

  assert.equal(items.find((item) => item.href === "/dashboard/imports")?.tone, "import");
  assert.equal(items.find((item) => item.href === "/dashboard/export-api")?.tone, "export");

  const getClass = (navHelpers as {
    getDashboardNavItemClass?: (active: boolean, tone?: "default" | "import" | "export") => string;
  }).getDashboardNavItemClass;

  assert.equal(typeof getClass, "function");
  assert.match(getClass?.(true, "import") ?? "", /bg-sky-500/);
  assert.match(getClass?.(true, "export") ?? "", /bg-violet-500/);
  assert.match(getClass?.(false, "import") ?? "", /text-sky-200/);
  assert.match(getClass?.(false, "export") ?? "", /text-violet-200/);
});

test("dashboard nav hides admin modules for non-admin and admin without flags", () => {
  const labels = {
    dashboard: "Dashboard",
    products: "Products",
    imports: "Import",
    exportApi: "Export",
    sellers: "Sellers",
    billingStats: "Stats",
    billing: "Billing",
    settings: "Settings",
  };

  assert.equal(getDashboardNavItems(labels).some((item) => item.href === "/dashboard/admin/sellers"), false);
  assert.equal(
    getDashboardNavItems(labels, { role: "seller", can_view_admin_sellers: true }).some(
      (item) => item.href === "/dashboard/admin/sellers",
    ),
    false,
  );
  assert.equal(
    getDashboardNavItems(labels, { role: "admin", can_view_admin_sellers: false }).some(
      (item) => item.href === "/dashboard/admin/sellers",
    ),
    false,
  );
  assert.equal(
    getDashboardNavItems(labels, { role: "admin", can_view_billing_stats: false }).some(
      (item) => item.href === "/dashboard/admin/billing-stats",
    ),
    false,
  );
});

test("dashboard nav shows admin modules for admin with matching permission flags", () => {
  const items = getDashboardNavItems(
    {
      dashboard: "Dashboard",
      products: "Products",
      imports: "Import",
      exportApi: "Export",
      sellers: "Sellers",
      billingStats: "Stats",
      billing: "Billing",
      settings: "Settings",
    },
    { role: "admin", can_view_admin_sellers: true, can_view_billing_stats: true },
  );

  const sellers = items.find((item) => item.href === "/dashboard/admin/sellers");
  assert.equal(sellers?.label, "Sellers");
  assert.equal(sellers?.exact, false);
  const stats = items.find((item) => item.href === "/dashboard/admin/billing-stats");
  assert.equal(stats?.label, "Stats");
  assert.equal(stats?.exact, false);
});

test("parseDashboardUser keeps role and coerces admin permission flags", () => {
  const user = navHelpers.parseDashboardUser?.(
    JSON.stringify({
      name: "Admin",
      email: "admin@lumir.test",
      role: "admin",
      can_view_admin_sellers: 1,
      can_impersonate_sellers: "true",
      can_grant_admin_permissions: false,
      can_view_billing_stats: "1",
    }),
  );

  assert.deepEqual(user, {
    name: "Admin",
    email: "admin@lumir.test",
    role: "admin",
    can_view_admin_sellers: true,
    can_impersonate_sellers: true,
    can_grant_admin_permissions: false,
    can_view_billing_stats: true,
  });
});
