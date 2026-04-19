import assert from "node:assert/strict";
import test from "node:test";

import {
  getBillingHistorySourceMeta,
  getBillingHistoryStatusMeta,
} from "./ui-helpers.ts";

test("getBillingHistorySourceMeta returns localized fallback label", () => {
  assert.equal(getBillingHistorySourceMeta("usage", "pl").label, "Fallback z usage");
  assert.equal(getBillingHistorySourceMeta("usage", "en").label, "Usage fallback");
});

test("getBillingHistorySourceMeta returns unavailable label", () => {
  assert.equal(getBillingHistorySourceMeta("unavailable", "pl").label, "Brak zrodla");
});

test("getBillingHistoryStatusMeta maps paid granted and expired into readable labels", () => {
  assert.equal(getBillingHistoryStatusMeta("paid", "pl").label, "Oplacone");
  assert.equal(getBillingHistoryStatusMeta("granted", "en").label, "Granted");
  assert.equal(getBillingHistoryStatusMeta("expired", "en").label, "Expired");
});

test("getBillingHistoryStatusMeta falls back to uppercase unknown status", () => {
  assert.equal(getBillingHistoryStatusMeta("processing", "en").label, "PROCESSING");
});
