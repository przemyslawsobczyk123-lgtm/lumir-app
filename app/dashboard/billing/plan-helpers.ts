import type { BillingPack } from "./billing-data.ts";

export type BillingPlanKey = "starter" | "pro" | "business";

export type BillingRecommendedPlan = {
  key: BillingPlanKey;
  label: string;
  badge: "popular" | null;
  pack: BillingPack;
};

const RECOMMENDED_PACKS: Array<{
  key: BillingPlanKey;
  label: string;
  badge: "popular" | null;
  credits: number;
}> = [
  { key: "starter", label: "Starter", badge: null, credits: 100 },
  { key: "pro", label: "Pro", badge: "popular", credits: 300 },
  { key: "business", label: "Business", badge: null, credits: 750 },
];

export function buildBillingPlanCatalog(packs: BillingPack[]) {
  const usedCredits = new Set<number>();

  const recommendedPlans = RECOMMENDED_PACKS.flatMap((plan) => {
    const pack = packs.find((item) => item.credits === plan.credits);
    if (!pack) return [];

    usedCredits.add(plan.credits);
    return [{ ...plan, pack }];
  });

  const remainingPacks = packs.filter((pack) => !usedCredits.has(pack.credits));

  return {
    recommendedPlans,
    remainingPacks,
  };
}
