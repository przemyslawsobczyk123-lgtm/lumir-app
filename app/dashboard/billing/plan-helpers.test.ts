import assert from "node:assert/strict";
import test from "node:test";

import { buildBillingPlanCatalog } from "./plan-helpers.ts";
import type { BillingPack } from "./billing-data.ts";

const PACKS: BillingPack[] = [
  { code: "pack-50", label: "50 credits", credits: 50, pricePerAuction: 100, amountCents: 5000 },
  { code: "pack-100", label: "100 credits", credits: 100, pricePerAuction: 90, amountCents: 9000 },
  { code: "pack-300", label: "300 credits", credits: 300, pricePerAuction: 80, amountCents: 24000 },
  { code: "pack-750", label: "750 credits", credits: 750, pricePerAuction: 70, amountCents: 52500 },
  { code: "pack-1000", label: "1000 credits", credits: 1000, pricePerAuction: 60, amountCents: 60000 },
];

test("maps Starter/Pro/Business in fixed order", () => {
  const { recommendedPlans } = buildBillingPlanCatalog(PACKS);

  assert.deepEqual(
    recommendedPlans.map((plan) => [plan.key, plan.label, plan.badge, plan.pack.credits]),
    [
      ["starter", "Starter", null, 100],
      ["pro", "Pro", "popular", 300],
      ["business", "Business", null, 750],
    ],
  );
});

test("leaves only non-featured packs in remaining list", () => {
  const { remainingPacks } = buildBillingPlanCatalog(PACKS);

  assert.deepEqual(
    remainingPacks.map((pack) => pack.credits),
    [50, 1000],
  );
});

test("tolerates missing recommended pack", () => {
  const { recommendedPlans, remainingPacks } = buildBillingPlanCatalog([
    PACKS[0],
    PACKS[2],
    PACKS[4],
  ]);

  assert.deepEqual(
    recommendedPlans.map((plan) => [plan.key, plan.pack.credits]),
    [
      ["pro", 300],
    ],
  );
  assert.deepEqual(
    remainingPacks.map((pack) => pack.credits),
    [50, 1000],
  );
});
