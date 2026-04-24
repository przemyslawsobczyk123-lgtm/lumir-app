export type AllegroDiffRow = {
  key: string;
  currentValue: unknown;
  nextValue: unknown;
  source: string;
  changed: boolean;
};

export type AllegroOfferUpdatePreview = {
  publishEligible: boolean;
  requiresReviewConfirmation: boolean;
  warnings: string[];
  diffRows: AllegroDiffRow[];
  proposedPayload: Record<string, unknown>;
};

export type AllegroUpdateModeSummary = {
  label: string;
  detail: string;
  tone: "warn" | "ready";
};

export type SavedAllegroMarketplaceLink = {
  accountId: number;
  offerId: string;
  offerTitle: string | null;
};

export type ProductMarketplaceLink = {
  marketplaceSlug: string;
  accountId: number;
  remoteOfferId: string;
  remoteOfferTitle?: string | null;
  remoteExternalId?: string | null;
};

export const ALLEGRO_PUBLISH_GATE_REASON =
  "Publikacja do Allegro jest tymczasowo wylaczona do czasu live smoke.";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeSavedAllegroMarketplaceLink(raw: unknown): SavedAllegroMarketplaceLink | null {
  const rows = Array.isArray(raw) ? raw : [];

  for (const value of rows) {
    const row = asRecord(value);
    if (normalizeText(row.marketplace_slug).toLowerCase() !== "allegro") continue;

    const accountId = Number(row.account_id || 0);
    const offerId = normalizeText(row.remote_offer_id);
    if (!Number.isInteger(accountId) || accountId <= 0 || !offerId) {
      continue;
    }

    return {
      accountId,
      offerId,
      offerTitle: normalizeText(row.remote_offer_title) || null,
    };
  }

  return null;
}

export function pickInitialAllegroSelection(input: {
  marketplaceLinks: ProductMarketplaceLink[];
  accounts: Array<{ id: number }>;
}): { accountId: number | null; offerId: string } {
  const link = input.marketplaceLinks.find(
    (entry) => normalizeText(entry.marketplaceSlug).toLowerCase() === "allegro"
  );
  if (!link) {
    return { accountId: null, offerId: "" };
  }

  const accountExists = input.accounts.some((entry) => Number(entry.id) === Number(link.accountId));
  if (!accountExists) {
    return { accountId: null, offerId: "" };
  }

  return {
    accountId: Number(link.accountId),
    offerId: normalizeText(link.remoteOfferId),
  };
}

export function resolveInitialAllegroSelection(input: {
  marketplaceLinks: ProductMarketplaceLink[];
  accounts: Array<{ id: number }>;
  currentAccountId: number | null;
  currentOfferId: string;
  hasHydratedSavedSelection: boolean;
}): { accountId: number | null; offerId: string; shouldHydrate: boolean } {
  const initial = pickInitialAllegroSelection({
    marketplaceLinks: input.marketplaceLinks,
    accounts: input.accounts,
  });

  if (input.hasHydratedSavedSelection || !initial.accountId || !initial.offerId) {
    return {
      accountId: initial.accountId,
      offerId: initial.offerId,
      shouldHydrate: false,
    };
  }

  const matchesCurrent = Number(input.currentAccountId) === Number(initial.accountId)
    && normalizeText(input.currentOfferId) === initial.offerId;

  return {
    accountId: initial.accountId,
    offerId: initial.offerId,
    shouldHydrate: !matchesCurrent,
  };
}

export function normalizeAllegroOfferUpdatePreview(raw: unknown): AllegroOfferUpdatePreview {
  const preview = asRecord(raw);
  return {
    publishEligible: !!preview.publishEligible,
    requiresReviewConfirmation: !!preview.requiresReviewConfirmation,
    warnings: Array.isArray(preview.warnings) ? preview.warnings.map((item) => String(item)) : [],
    diffRows: Array.isArray(preview.diffRows)
      ? preview.diffRows.map((value) => {
          const row = asRecord(value);
          return {
            key: String(row.key || ""),
            currentValue: row.currentValue,
            nextValue: row.nextValue,
            source: String(row.source || ""),
            changed: !!row.changed,
          };
        })
      : [],
    proposedPayload: preview.proposedPayload && typeof preview.proposedPayload === "object"
      ? preview.proposedPayload as Record<string, unknown>
      : {},
  };
}

export function getAllegroPublishDisabledReason(preview: AllegroOfferUpdatePreview) {
  if (preview.publishEligible) return null;
  return preview.warnings[0] || "Publikacja zablokowana";
}

export function isAllegroPublishEnabled(value = process.env.NEXT_PUBLIC_ALLEGRO_PUBLISH_ENABLED) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export function getAllegroUpdateModeSummary(publishEnabled: boolean): AllegroUpdateModeSummary {
  if (publishEnabled) {
    return {
      label: "Preview ON / Publish ON",
      detail: "Preview i kontrolowany publish sa dostepne.",
      tone: "ready",
    };
  }

  return {
    label: "Preview ON / Publish OFF",
    detail: ALLEGRO_PUBLISH_GATE_REASON,
    tone: "warn",
  };
}
