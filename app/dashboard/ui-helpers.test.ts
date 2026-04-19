import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDashboardCount,
  getDashboardFocus,
  getTotalImportCount,
} from "./ui-helpers.ts";

test("getDashboardFocus prioritizes errors over every other state", () => {
  const focus = getDashboardFocus({
    cards: { inProgress: 2, ready: 4, exported: 1, errors: 3 },
    products: { total: 12, pending: 1, mapped: 4, needs_review: 2, exported: 5 },
    imports: { processing: 1, done: 2, error: 1 },
  });

  assert.deepEqual(focus, { kind: "errors", count: 3 });
});

test("getDashboardFocus returns processing when queue still runs and there are no errors", () => {
  const focus = getDashboardFocus({
    cards: { inProgress: 6, ready: 0, exported: 0, errors: 0 },
    products: { total: 8, pending: 4, mapped: 0, needs_review: 0, exported: 2 },
    imports: { processing: 2, done: 1, error: 0 },
  });

  assert.deepEqual(focus, { kind: "processing", count: 6 });
});

test("getDashboardFocus returns ready when catalog has exportable offers", () => {
  const focus = getDashboardFocus({
    cards: { inProgress: 0, ready: 7, exported: 3, errors: 0 },
    products: { total: 14, pending: 2, mapped: 7, needs_review: 0, exported: 3 },
    imports: { processing: 0, done: 5, error: 0 },
  });

  assert.deepEqual(focus, { kind: "ready", count: 7 });
});

test("getDashboardFocus falls back to catalog when no urgent state exists", () => {
  const focus = getDashboardFocus({
    cards: { inProgress: 0, ready: 0, exported: 0, errors: 0 },
    products: { total: 5, pending: 5, mapped: 0, needs_review: 0, exported: 0 },
    imports: { processing: 0, done: 0, error: 0 },
  });

  assert.deepEqual(focus, { kind: "catalog", count: 5 });
});

test("formatDashboardCount and getTotalImportCount stay locale-aware", () => {
  assert.equal(
    formatDashboardCount(12500, "pl"),
    "12 500".replace(" ", "\u00a0"),
  );
  assert.equal(formatDashboardCount(12500, "en"), "12,500");
  assert.equal(getTotalImportCount({ processing: 2, done: 3, error: 1 }), 6);
});
