import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLEGRO_PUBLISH_GATE_REASON,
  getAllegroPublishDisabledReason,
  getAllegroUpdateModeSummary,
  isAllegroPublishEnabled,
  pickInitialAllegroSelection,
  resolveInitialAllegroSelection,
  normalizeSavedAllegroMarketplaceLink,
  normalizeAllegroOfferUpdatePreview,
} from "./allegro-export-helpers.ts";

test("normalizeAllegroOfferUpdatePreview normalizes diff rows and proposed payload", () => {
  const preview = normalizeAllegroOfferUpdatePreview({
    publishEligible: true,
    requiresReviewConfirmation: false,
    warnings: [],
    diffRows: [
      {
        key: "title",
        currentValue: "Stary",
        nextValue: "Nowy",
        source: "local-product",
        changed: true,
      },
    ],
    proposedPayload: {
      name: "Nowy",
    },
  });

  assert.equal(preview.publishEligible, true);
  assert.equal(preview.diffRows[0].source, "local-product");
  assert.deepEqual(preview.proposedPayload, { name: "Nowy" });
});

test("getAllegroPublishDisabledReason prefers first warning when publish blocked", () => {
  const reason = getAllegroPublishDisabledReason({
    publishEligible: false,
    requiresReviewConfirmation: true,
    warnings: ["Draft wymaga potwierdzenia publish przez sprzedawce."],
    diffRows: [],
    proposedPayload: {},
  });

  assert.equal(reason, "Draft wymaga potwierdzenia publish przez sprzedawce.");
});

test("isAllegroPublishEnabled defaults to false and accepts explicit true-ish values", () => {
  assert.equal(isAllegroPublishEnabled(undefined), false);
  assert.equal(isAllegroPublishEnabled("true"), true);
  assert.equal(isAllegroPublishEnabled("1"), true);
  assert.equal(isAllegroPublishEnabled("yes"), true);
  assert.equal(isAllegroPublishEnabled("false"), false);
  assert.match(ALLEGRO_PUBLISH_GATE_REASON, /live smoke/i);
});

test("getAllegroUpdateModeSummary maps safe status for publish off and on", () => {
  assert.deepEqual(getAllegroUpdateModeSummary(false), {
    label: "Preview ON / Publish OFF",
    detail: ALLEGRO_PUBLISH_GATE_REASON,
    tone: "warn",
  });

  assert.deepEqual(getAllegroUpdateModeSummary(true), {
    label: "Preview ON / Publish ON",
    detail: "Preview i kontrolowany publish sa dostepne.",
    tone: "ready",
  });
});

test("normalizeSavedAllegroMarketplaceLink picks saved allegro row from snake_case marketplaceLinks", () => {
  const link = normalizeSavedAllegroMarketplaceLink([
    {
      marketplace_slug: "amazon",
      account_id: 31,
      remote_offer_id: "amz-1",
    },
    {
      marketplace_slug: "allegro",
      account_id: 12,
      remote_offer_id: "offer-123",
      remote_offer_title: "Saved Allegro Offer",
    },
  ]);

  assert.deepEqual(link, {
    accountId: 12,
    offerId: "offer-123",
    offerTitle: "Saved Allegro Offer",
  });
});

test("normalizeSavedAllegroMarketplaceLink returns null when allegro row misses required ids", () => {
  assert.equal(
    normalizeSavedAllegroMarketplaceLink([
      {
        marketplace_slug: "allegro",
        account_id: null,
        remote_offer_id: "",
      },
    ]),
    null
  );
});

test("normalizeSavedAllegroMarketplaceLink skips malformed allegro rows when later row is valid", () => {
  assert.deepEqual(
    normalizeSavedAllegroMarketplaceLink([
      {
        marketplace_slug: "allegro",
        account_id: null,
        remote_offer_id: "",
      },
      {
        marketplace_slug: "allegro",
        account_id: 13,
        remote_offer_id: "offer-13",
        remote_offer_title: "Saved offer",
      },
    ]),
    {
      accountId: 13,
      offerId: "offer-13",
      offerTitle: "Saved offer",
    }
  );
});

test("pickInitialAllegroSelection prefers saved link when account exists", () => {
  assert.deepEqual(
    pickInitialAllegroSelection({
      marketplaceLinks: [
        {
          marketplaceSlug: "allegro",
          accountId: 13,
          remoteOfferId: "18527975262",
        },
      ],
      accounts: [
        { id: 13, environment: "production", allegro_login: null, status: "valid" },
        { id: 14, environment: "sandbox", allegro_login: null, status: "valid" },
      ],
    }),
    {
      accountId: 13,
      offerId: "18527975262",
    }
  );
});

test("resolveInitialAllegroSelection rehydrates saved offer when fallback account won mount race", () => {
  assert.deepEqual(
    resolveInitialAllegroSelection({
      marketplaceLinks: [
        {
          marketplaceSlug: "allegro",
          accountId: 13,
          remoteOfferId: "saved-offer",
        },
      ],
      accounts: [{ id: 11 }, { id: 13 }],
      currentAccountId: 11,
      currentOfferId: "fallback-offer",
      hasHydratedSavedSelection: false,
    }),
    {
      accountId: 13,
      offerId: "saved-offer",
      shouldHydrate: true,
    }
  );
});
