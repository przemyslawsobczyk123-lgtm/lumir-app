import assert from "node:assert/strict";
import test from "node:test";

import {
  getImportMetricClass,
  getImportStatusClass,
  importProgressClasses,
  importReportClasses,
} from "./import-theme-helpers.ts";

test("import report surfaces use matched dark-mode classes", () => {
  assert.match(importReportClasses.card, /bg-\[var\(--bg-card\)\]/);
  assert.match(importReportClasses.card, /border-slate-300/);
  assert.match(importReportClasses.card, /\[html\.dark_&\]:border-\[#334155\]/);
  assert.match(importReportClasses.card, /\[html\.dark_&\]:ring-\[#334155\]/);
  assert.match(importReportClasses.title, /text-\[var\(--text-primary\)\]/);
  assert.match(importReportClasses.meta, /\[html\.dark_&\]:text-\[#94a3b8\]/);
  assert.match(importReportClasses.itemRow, /\[html\.dark_&\]:bg-\[#111827\]/);
  assert.match(importReportClasses.itemId, /\[html\.dark_&\]:bg-\[#1f2937\]/);
  assert.match(importReportClasses.itemLabel, /\[html\.dark_&\]:text-\[#e2e8f0\]/);
  assert.match(importReportClasses.openButton, /\[html\.dark_&\]:bg-\[#1f2937\]/);
  assert.match(importReportClasses.duplicatePanel, /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(importReportClasses.duplicateButton, /\[html\.dark_&\]:bg-\[#4a3107\]/);
  assert.doesNotMatch(importReportClasses.card, /(^|\s)bg-white(\s|$)/);
  assert.doesNotMatch(Object.values(importReportClasses).join(" "), /dark:/);
});

test("import status classes avoid media dark variants for every status", () => {
  for (const status of ["imported", "done", "duplicate", "error", "queued", null]) {
    const className = getImportStatusClass(status);

    assert.doesNotMatch(className, /dark:/);
    assert.doesNotMatch(className, /(^|\s)bg-white(\s|$)/);
  }

  assert.match(getImportStatusClass("imported"), /\[html\.dark_&\]:bg-\[#052e2b\]/);
  assert.match(getImportStatusClass("imported"), /\[html\.dark_&\]:text-\[#a7f3d0\]/);
  assert.match(getImportStatusClass("duplicate"), /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(getImportStatusClass("error"), /\[html\.dark_&\]:bg-\[#3f101c\]/);
  assert.match(getImportStatusClass("queued"), /\[html\.dark_&\]:bg-\[#1f2937\]/);
});

test("import metric classes avoid media dark variants for all counters", () => {
  for (const metric of ["imported", "duplicates", "failed", "total"] as const) {
    const className = getImportMetricClass(metric);

    assert.doesNotMatch(className, /dark:/);
    assert.doesNotMatch(className, /\bbg-slate-50\b/);
    assert.doesNotMatch(className, /(emerald|amber|rose|indigo)-500\/15/);
  }

  assert.match(getImportMetricClass("imported"), /\[html\.dark_&\]:bg-\[#052e2b\]/);
  assert.match(getImportMetricClass("duplicates"), /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(getImportMetricClass("failed"), /\[html\.dark_&\]:bg-\[#3f101c\]/);
  assert.match(getImportMetricClass("total"), /\[html\.dark_&\]:bg-\[#17172f\]/);
});

test("import history counters use strong readable tones in light UI", () => {
  assert.match(getImportMetricClass("imported"), /border-emerald-400/);
  assert.match(getImportMetricClass("imported"), /bg-emerald-100/);
  assert.match(getImportMetricClass("imported"), /text-emerald-900/);

  assert.match(getImportMetricClass("duplicates"), /border-amber-400/);
  assert.match(getImportMetricClass("duplicates"), /bg-amber-100/);
  assert.match(getImportMetricClass("duplicates"), /text-amber-900/);

  assert.match(getImportMetricClass("failed"), /border-rose-400/);
  assert.match(getImportMetricClass("failed"), /bg-rose-100/);
  assert.match(getImportMetricClass("failed"), /text-rose-900/);

  assert.match(getImportMetricClass("total"), /border-indigo-300/);
  assert.match(getImportMetricClass("total"), /bg-indigo-100/);
  assert.match(getImportMetricClass("total"), /text-indigo-900/);
});

test("import status pills stay readable without media dark variants", () => {
  for (const status of ["imported", "done", "duplicate", "error", "queued", null]) {
    assert.doesNotMatch(getImportStatusClass(status), /dark:/);
  }

  assert.match(getImportStatusClass("imported"), /text-emerald-900/);
  assert.match(getImportStatusClass("duplicate"), /text-amber-900/);
});

test("import progress panel follows html dark mode instead of media dark mode", () => {
  const progressClasses = Object.values(importProgressClasses).join(" ");

  assert.doesNotMatch(progressClasses, /dark:/);
  assert.match(importProgressClasses.card, /\[html\.dark_&\]:bg-\[#082f49\]/);
  assert.match(importProgressClasses.title, /\[html\.dark_&\]:text-\[#bae6fd\]/);
  assert.match(importProgressClasses.chip, /\[html\.dark_&\]:bg-\[#0c4a6e\]/);
  assert.match(importProgressClasses.track, /\[html\.dark_&\]:bg-\[#0f172a\]/);
});
