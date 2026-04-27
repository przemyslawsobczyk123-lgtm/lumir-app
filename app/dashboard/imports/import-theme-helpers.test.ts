import assert from "node:assert/strict";
import test from "node:test";

import {
  getImportMetricClass,
  getImportStatusClass,
  importReportClasses,
} from "./import-theme-helpers.ts";

test("import report surfaces use theme-aware classes", () => {
  assert.match(importReportClasses.card, /bg-\[var\(--bg-card\)\]/);
  assert.match(importReportClasses.card, /border-\[var\(--border-default\)\]/);
  assert.match(importReportClasses.title, /text-\[var\(--text-primary\)\]/);
  assert.doesNotMatch(importReportClasses.card, /(^|\s)bg-white(\s|$)/);
});

test("import status classes include dark variants for every status", () => {
  for (const status of ["imported", "done", "duplicate", "error", "queued", null]) {
    const className = getImportStatusClass(status);

    assert.match(className, /dark:/);
    assert.doesNotMatch(className, /(^|\s)bg-white(\s|$)/);
  }
});

test("import metric classes include dark variants for all counters", () => {
  for (const metric of ["imported", "duplicates", "failed", "total"] as const) {
    const className = getImportMetricClass(metric);

    assert.match(className, /dark:/);
    assert.doesNotMatch(className, /\bbg-slate-50\b/);
  }
});
