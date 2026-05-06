import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBillingStatsQuery,
  getBillingStatsFilterSummary,
  getBillingStatsThemeClasses,
  normalizeBillingStatsSortBy,
  normalizeBillingStatsSortDir,
} from "./page-helpers.ts";

test("normalizes billing stats sort params to safe values", () => {
  assert.equal(normalizeBillingStatsSortBy("creditsUsed"), "creditsUsed");
  assert.equal(normalizeBillingStatsSortBy("revenue_cents DESC"), "revenue");
  assert.equal(normalizeBillingStatsSortDir("asc"), "asc");
  assert.equal(normalizeBillingStatsSortDir("sideways"), "desc");
});

test("buildBillingStatsQuery includes active search and sort params", () => {
  assert.equal(
    buildBillingStatsQuery({
      month: "2026-05",
      page: 2,
      limit: 50,
      search: "  Smoke  ",
      sortBy: "creditsUsed",
      sortDir: "asc",
    }),
    "month=2026-05&page=2&limit=50&sortBy=creditsUsed&sortDir=asc&search=Smoke",
  );
});

test("getBillingStatsFilterSummary exposes active filters and ordering", () => {
  assert.deepEqual(
    getBillingStatsFilterSummary(
      {
        month: "2026-05",
        search: "Smoke",
        sortBy: "lastPayment",
        sortDir: "asc",
      },
      {
        month: "Miesiac",
        search: "Fraza",
        sort: "Sortowanie",
        sortLabels: {
          seller: "Sprzedawca",
          balance: "Saldo",
          revenue: "Przychod",
          paidCredits: "Wplacone kredyty",
          creditsUsed: "Zuzyte kredyty",
          payments: "Platnosci",
          lifetimePurchased: "Lifetime kupione",
          lifetimeUsed: "Lifetime zuzyte",
          lastPayment: "Ostatnia platnosc",
        },
        sortDirections: {
          asc: "rosnaco",
          desc: "malejaco",
        },
      },
    ),
    [
      { key: "month", label: "Miesiac", value: "2026-05" },
      { key: "search", label: "Fraza", value: "Smoke" },
      { key: "sort", label: "Sortowanie", value: "Ostatnia platnosc, rosnaco" },
    ],
  );
});

test("billing stats classes use dashboard theme tokens for dark mode", () => {
  const classes = getBillingStatsThemeClasses();

  assert.match(classes.hero, /bg-\[var\(--bg-card\)\]/);
  assert.match(classes.panel, /bg-\[var\(--bg-card\)\]/);
  assert.match(classes.input, /bg-\[var\(--bg-input\)\]/);
  assert.match(classes.tableHeader, /bg-\[var\(--bg-table-header\)\]/);
  assert.doesNotMatch(`${classes.hero} ${classes.panel}`, /\bbg-white\b/);
});
