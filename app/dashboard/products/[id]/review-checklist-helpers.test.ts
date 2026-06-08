import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getPublicationChecklistBlockerLabels,
  hasProductPriceChanged,
  normalizeProductAiReview,
  normalizeProductPriceInput,
  normalizePublicationChecklist,
} from "./review-checklist-helpers.ts";

test("normalizeProductAiReview maps backend review payload into typed card model", () => {
  const review = normalizeProductAiReview({
    marketplaceSlug: "allegro",
    score: 82,
    maxScore: 100,
    status: "approved",
    version: "v1",
    summary: "Najslabsza sekcja: Layout HTML.",
    sections: [
      {
        key: "layout-html",
        label: "Layout HTML",
        score: 7,
        maxScore: 10,
        bullets: ["Sa listy"],
        hint: "Dodaj wiecej wyroznien",
      },
    ],
  });

  assert.deepEqual(review, {
    marketplaceSlug: "allegro",
    score: 82,
    maxScore: 100,
    status: "approved",
    version: "v1",
    summary: "Najslabsza sekcja: Layout HTML.",
    sections: [
      {
        key: "layout-html",
        label: "Layout HTML",
        score: 7,
        maxScore: 10,
        bullets: ["Sa listy"],
        hint: "Dodaj wiecej wyroznien",
      },
    ],
  });
});

test("normalizePublicationChecklist builds progress label and manual item flags", () => {
  const checklist = normalizePublicationChecklist({
    marketplaceSlug: "allegro",
    progress: { completed: 5, total: 11 },
    blockingItems: ["minimum_image_count"],
    items: [
      {
        key: "delivery_confirmed",
        label: "Dostawa",
        type: "manual",
        status: "pass",
        blocking: true,
        hint: "hint",
        evidence: "",
        checked: true,
      },
    ],
  });

  assert.equal(checklist.progressLabel, "5/11");
  assert.equal(checklist.items[0].type, "manual");
  assert.equal(checklist.items[0].checked, true);
  assert.deepEqual(checklist.blockingItems, ["minimum_image_count"]);
});

test("normalizeProductPriceInput accepts Polish decimal comma", () => {
  assert.equal(normalizeProductPriceInput("999,99"), 999.99);
  assert.equal(normalizeProductPriceInput("1 999,99"), 1999.99);
  assert.equal(normalizeProductPriceInput("1.999,99 PLN"), 1999.99);
  assert.equal(normalizeProductPriceInput("abc"), null);
  assert.equal(normalizeProductPriceInput("abc123"), null);
  assert.equal(normalizeProductPriceInput("12PLN34"), null);
  assert.equal(normalizeProductPriceInput("0.001"), null);
  assert.equal(normalizeProductPriceInput(1.999), null);
  assert.equal(normalizeProductPriceInput(0.001), null);
});

test("price confirmation sends displayed price to backend", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  assert.match(source, /expectedPrice/);
  assert.match(source, /JSON\.stringify\(\{\s*productId:\s*Number\(id\),\s*checked,\s*\.\.\./);
});

test("hasProductPriceChanged compares monetary value, not formatting", () => {
  assert.equal(hasProductPriceChanged("129.9", "129,90"), false);
  assert.equal(hasProductPriceChanged("129.90", "139,90"), true);
});

test("getPublicationChecklistBlockerLabels uses checklist item labels", () => {
  const checklist = normalizePublicationChecklist({
    marketplaceSlug: "allegro",
    progress: { completed: 10, total: 13 },
    blockingItems: ["price_confirmed", "minimum_image_count"],
    items: [
      { key: "price_confirmed", label: "Biezaca cena potwierdzona recznie" },
      { key: "minimum_image_count", label: "Minimum 3 zdjecia produktu" },
    ],
  });

  assert.deepEqual(getPublicationChecklistBlockerLabels(checklist), [
    "Biezaca cena potwierdzona recznie",
    "Minimum 3 zdjecia produktu",
  ]);
});
