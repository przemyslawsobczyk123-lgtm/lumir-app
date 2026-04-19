import type { BillingHistoryEntry } from "./billing-data.ts";

export type CheckoutResult = "success" | "cancel" | null;
export type BillingHistoryFilter = "all" | "paid" | "failed" | "expired" | "granted" | "pending";
export type RetryableBillingIssue = BillingHistoryEntry & { packCredits: number };

const SUCCESS_REFRESH_DELAYS = [1200, 2600, 5200];
const RETRYABLE_STATUSES = new Set(["failed", "expired"]);
const FILTERS: BillingHistoryFilter[] = ["all", "paid", "failed", "expired", "granted", "pending"];

function normalizeSearch(search: string) {
  return search.startsWith("?") ? search.slice(1) : search;
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function parsePackCreditsFromTitle(title: string) {
  const match = title.match(/(\d+(?:[.,]\d+)?)\s*kredyt/i);
  if (!match) return null;

  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getCheckoutResultFromSearch(search: string): CheckoutResult {
  const params = new URLSearchParams(normalizeSearch(search));
  const checkout = params.get("checkout");
  return checkout === "success" || checkout === "cancel" ? checkout : null;
}

export function getBillingRefreshDelays(result: CheckoutResult) {
  return result === "success" ? SUCCESS_REFRESH_DELAYS : [];
}

export function filterBillingHistoryItems(items: BillingHistoryEntry[], filter: BillingHistoryFilter) {
  if (filter === "all") return items;
  return items.filter((item) => normalizeStatus(item.status) === filter);
}

export function getBillingHistoryFilterCounts(items: BillingHistoryEntry[]) {
  return FILTERS.reduce<Record<BillingHistoryFilter, number>>((acc, filter) => {
    acc[filter] = filter === "all" ? items.length : filterBillingHistoryItems(items, filter).length;
    return acc;
  }, {
    all: 0,
    paid: 0,
    failed: 0,
    expired: 0,
    granted: 0,
    pending: 0,
  });
}

export function getRetryableBillingIssues(items: BillingHistoryEntry[]): RetryableBillingIssue[] {
  return items
    .filter((item) => RETRYABLE_STATUSES.has(normalizeStatus(item.status)))
    .map((item) => ({
      ...item,
      packCredits: item.packCredits ?? parsePackCreditsFromTitle(item.title) ?? 0,
    }))
    .filter((item) => item.packCredits > 0)
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}
