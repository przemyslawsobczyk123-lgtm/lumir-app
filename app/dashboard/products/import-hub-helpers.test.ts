import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMarketplaceImportPayload,
  getImportItemKey,
  parseAllegroExternalLink,
  toggleImportSelection,
  toggleVisibleImportSelection,
} from "./import-hub-helpers.ts";

test("buildMarketplaceImportPayload defaults to import_and_ai for Allegro items", () => {
  const payload = buildMarketplaceImportPayload({
    provider: "allegro",
    accountId: 13,
    selectedItems: [
      { remoteId: "18527975262", title: "Oferta 1" },
      { remoteId: "18527975263", title: "Oferta 2" },
    ],
  });

  assert.deepEqual(payload, {
    provider: "allegro",
    mode: "import_and_ai",
    accountId: 13,
    items: [
      { remoteId: "18527975262" },
      { remoteId: "18527975263" },
    ],
  });
});

test("parseAllegroExternalLink extracts product UUID and offerId", () => {
  const parsed = parseAllegroExternalLink(
    "https://allegro.pl/produkt/ampulka-do-wlosow-phyto-men-60-ml-4390d935-37f4-4efc-bcfe-c686afaa5c07?offerId=18275983621&sid=test"
  );

  assert.deepEqual(parsed, {
    url: "https://allegro.pl/produkt/ampulka-do-wlosow-phyto-men-60-ml-4390d935-37f4-4efc-bcfe-c686afaa5c07?offerId=18275983621&sid=test",
    remoteId: "18275983621",
    offerId: "18275983621",
    productId: "4390d935-37f4-4efc-bcfe-c686afaa5c07",
  });
});

test("buildMarketplaceImportPayload forces AI mode for Allegro external link imports", () => {
  const payload = buildMarketplaceImportPayload({
    provider: "allegro",
    sourceKind: "external_link",
    accountId: 13,
    mode: "import_only",
    selectedItems: [{
      url: "https://allegro.pl/produkt/x-4390d935-37f4-4efc-bcfe-c686afaa5c07?offerId=18275983621",
      remoteId: "18275983621",
      offerId: "18275983621",
      productId: "4390d935-37f4-4efc-bcfe-c686afaa5c07",
    }],
  });

  assert.deepEqual(payload, {
    provider: "allegro",
    sourceKind: "external_link",
    mode: "import_and_ai",
    accountId: 13,
    items: [{
      url: "https://allegro.pl/produkt/x-4390d935-37f4-4efc-bcfe-c686afaa5c07?offerId=18275983621",
      remoteId: "18275983621",
      offerId: "18275983621",
      productId: "4390d935-37f4-4efc-bcfe-c686afaa5c07",
    }],
  });
});

test("buildMarketplaceImportPayload keeps only Amazon identifiers required by API", () => {
  const payload = buildMarketplaceImportPayload({
    provider: "amazon",
    mode: "import_only",
    selectedItems: [
      { asin: "B012345678", ean: "5901234567890", title: "Monitor" },
      { ean: "9788399999999", title: "Ksiazka" },
    ],
  });

  assert.deepEqual(payload, {
    provider: "amazon",
    mode: "import_only",
    items: [
      { asin: "B012345678", ean: "5901234567890" },
      { asin: null, ean: "9788399999999" },
    ],
  });
});

test("toggleImportSelection adds and removes same item key", () => {
  const item = { remoteId: "18527975262", title: "Oferta 1" };
  const itemKey = getImportItemKey("allegro", item);

  const added = toggleImportSelection(new Set<string>(), itemKey);
  assert.deepEqual([...added], [itemKey]);

  const removed = toggleImportSelection(added, itemKey);
  assert.deepEqual([...removed], []);
});

test("toggleVisibleImportSelection selects all missing rows and clears page rows when already selected", () => {
  const pageItemKeys = [
    getImportItemKey("allegro", { remoteId: "1" }),
    getImportItemKey("allegro", { remoteId: "2" }),
  ];

  const selected = toggleVisibleImportSelection(new Set<string>(), pageItemKeys);
  assert.deepEqual([...selected].sort(), [...pageItemKeys].sort());

  const cleared = toggleVisibleImportSelection(selected, pageItemKeys);
  assert.deepEqual([...cleared], []);
});
