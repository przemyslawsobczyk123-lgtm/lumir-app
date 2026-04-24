import assert from "node:assert/strict";
import test from "node:test";

import {
  extractBulkReportItemState,
  normalizeDraftQualitySummary,
  normalizeListAIDraftBadge,
} from "./ai-draft-helpers.ts";

test("normalizeDraftQualitySummary maps backend quality review and readiness fields", () => {
  const summary = normalizeDraftQualitySummary({
    marketplaceSlug: "mediaexpert",
    overallConfidence: 88,
    selectedSourcesJson: ["product", "icecat"],
    qualityJson: {
      coverage: {
        requiredFilled: 3,
        requiredTotal: 5,
        optionalFilled: 2,
        optionalTotal: 4,
      },
      sources: {
        selected: ["product", "allegro"],
        enabled: ["product", "allegro", "icecat"],
      },
      missingCriticalFields: ["brand", "ean"],
    },
    reviewReasonsJson: ["Missing critical fields: brand, ean"],
    readinessJson: {
      ready: false,
      requiresReview: true,
      status: "needs_review",
    },
  });

  assert.deepEqual(summary, {
    marketplaceSlug: "mediaexpert",
    status: "review",
    isReady: false,
    reviewReasons: ["Missing critical fields: brand, ean"],
    missingRequiredFields: ["brand", "ean"],
    selectedSources: ["product", "allegro"],
    enabledSources: ["product", "allegro", "icecat"],
    requiredFilled: 3,
    requiredTotal: 5,
    optionalFilled: 2,
    optionalTotal: 4,
    overallConfidence: 88,
  });
});

test("normalizeListAIDraftBadge prefers selected marketplace and normalizes needs_review", () => {
  const badge = normalizeListAIDraftBadge(
    [
      { marketplaceSlug: "empik", overallConfidence: 94, reviewCount: 0, isReady: true, status: "ready" },
      { marketplaceSlug: "mediaexpert", overallConfidence: 79, reviewCount: 2, isReady: false, status: "needs_review" },
    ],
    "mediaexpert"
  );

  assert.deepEqual(badge, {
    marketplaceSlug: "mediaexpert",
    status: "review",
    overallConfidence: 79,
    reviewCount: 2,
    isReady: false,
  });
});

test("normalizeListAIDraftBadge falls back to worst status when no marketplace filter is active", () => {
  const badge = normalizeListAIDraftBadge([
    { marketplaceSlug: "empik", overallConfidence: 94, reviewCount: 0, isReady: true, status: "ready" },
    { marketplaceSlug: "allegro", overallConfidence: 51, reviewCount: 0, isReady: false, status: "blocked" },
    { marketplaceSlug: "mediaexpert", overallConfidence: 79, reviewCount: 1, isReady: false, status: "review" },
  ]);

  assert.deepEqual(badge, {
    marketplaceSlug: "allegro",
    status: "blocked",
    overallConfidence: 51,
    reviewCount: 0,
    isReady: false,
  });
});

test("extractBulkReportItemState uses resultJson review reason for compact bulk report output", () => {
  const state = extractBulkReportItemState({
    readinessJson: {
      isReady: false,
      status: "needs_review",
    },
    reviewReasonsJson: ["Description confidence below marketplace threshold"],
    qualityJson: {
      missingCriticalFields: ["brand"],
    },
  });

  assert.deepEqual(state, {
    status: "review",
    reason: "Description confidence below marketplace threshold",
    reviewReasons: ["Description confidence below marketplace threshold"],
    missingRequiredFields: ["brand"],
  });
});
