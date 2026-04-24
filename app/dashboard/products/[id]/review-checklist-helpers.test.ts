import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeProductAiReview,
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
