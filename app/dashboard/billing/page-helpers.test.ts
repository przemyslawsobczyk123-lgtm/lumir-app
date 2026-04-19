import assert from "node:assert/strict";
import test from "node:test";

import {
  filterBillingHistoryItems,
  getBillingHistoryFilterCounts,
  getBillingRefreshDelays,
  getCheckoutResultFromSearch,
  getRetryableBillingIssues,
  type BillingHistoryFilter,
} from "./page-helpers.ts";
import type { BillingHistoryEntry } from "./billing-data.ts";

const HISTORY_FIXTURE: BillingHistoryEntry[] = [
  {
    id: "1",
    createdAt: "2026-04-19T10:00:00.000Z",
    kind: "topup",
    title: "Pakiet 100 kredytow",
    description: "Jednorazowy zakup kredytow",
    credits: 100,
    amount: 48900,
    currency: "PLN",
    status: "paid",
    source: "history",
    mode: "",
    packCredits: 100,
    stripeSessionId: "cs_paid",
    externalId: "checkout:cs_paid",
  },
  {
    id: "2",
    createdAt: "2026-04-19T11:00:00.000Z",
    kind: "topup",
    title: "Pakiet 50 kredytow",
    description: "Platnosc Stripe nie powiodla sie.",
    credits: 0,
    amount: 27500,
    currency: "PLN",
    status: "failed",
    source: "history",
    mode: "",
    packCredits: null,
    stripeSessionId: "cs_failed",
    externalId: "checkout_status:cs_failed:failed",
  },
  {
    id: "3",
    createdAt: "2026-04-19T12:00:00.000Z",
    kind: "topup",
    title: "Pakiet 300 kredytow",
    description: "Sesja Stripe wygasla przed platnoscia.",
    credits: 0,
    amount: 113100,
    currency: "PLN",
    status: "expired",
    source: "history",
    mode: "",
    packCredits: 300,
    stripeSessionId: "cs_expired",
    externalId: "checkout_status:cs_expired:expired",
  },
  {
    id: "4",
    createdAt: "2026-04-19T13:00:00.000Z",
    kind: "starter",
    title: "Starter 3 kredyty",
    description: "Jednorazowy darmowy pakiet startowy.",
    credits: 3,
    amount: 0,
    currency: "PLN",
    status: "granted",
    source: "history",
    mode: "",
    packCredits: null,
    stripeSessionId: null,
    externalId: "starter:9:3",
  },
];

test("getCheckoutResultFromSearch detects Stripe redirect state", () => {
  assert.equal(getCheckoutResultFromSearch("?checkout=success"), "success");
  assert.equal(getCheckoutResultFromSearch("?checkout=cancel"), "cancel");
  assert.equal(getCheckoutResultFromSearch("?foo=bar"), null);
});

test("getBillingRefreshDelays only retries after success redirect", () => {
  assert.deepEqual(getBillingRefreshDelays("success"), [1200, 2600, 5200]);
  assert.deepEqual(getBillingRefreshDelays("cancel"), []);
  assert.deepEqual(getBillingRefreshDelays(null), []);
});

test("filterBillingHistoryItems narrows rows by selected status chip", () => {
  const cases: Array<[BillingHistoryFilter, number]> = [
    ["all", 4],
    ["paid", 1],
    ["failed", 1],
    ["expired", 1],
    ["granted", 1],
    ["pending", 0],
  ];

  for (const [filter, expectedCount] of cases) {
    assert.equal(filterBillingHistoryItems(HISTORY_FIXTURE, filter).length, expectedCount);
  }
});

test("getBillingHistoryFilterCounts returns chip counters", () => {
  assert.deepEqual(getBillingHistoryFilterCounts(HISTORY_FIXTURE), {
    all: 4,
    paid: 1,
    failed: 1,
    expired: 1,
    granted: 1,
    pending: 0,
  });
});

test("getRetryableBillingIssues returns newest failed and expired topups with parsed pack credits", () => {
  const issues = getRetryableBillingIssues(HISTORY_FIXTURE);

  assert.equal(issues.length, 2);
  assert.equal(issues[0].status, "expired");
  assert.equal(issues[0].packCredits, 300);
  assert.equal(issues[1].status, "failed");
  assert.equal(issues[1].packCredits, 50);
});
