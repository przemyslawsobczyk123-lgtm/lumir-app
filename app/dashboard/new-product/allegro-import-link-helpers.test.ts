import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAllegroDescriptionHtml,
  buildPendingAllegroLink,
  getAllegroDuplicateImportDeleteConfirmMessage,
  getAllegroDuplicateImportMessage,
} from "./allegro-import-link-helpers.ts";

test("buildPendingAllegroLink creates Allegro marketplace link payload", () => {
  assert.deepEqual(
    buildPendingAllegroLink({
      accountId: 13,
      offerId: " 18527975262 ",
      offerTitle: " Obraz ",
    }),
    {
      marketplaceSlug: "allegro",
      accountId: 13,
      remoteOfferId: "18527975262",
      remoteOfferTitle: "Obraz",
      remoteExternalId: null,
    }
  );
});

test("buildPendingAllegroLink keeps null title when offer title missing", () => {
  assert.deepEqual(
    buildPendingAllegroLink({
      accountId: 13,
      offerId: "18527975262",
    }),
    {
      marketplaceSlug: "allegro",
      accountId: 13,
      remoteOfferId: "18527975262",
      remoteOfferTitle: null,
      remoteExternalId: null,
    }
  );
});

test("getAllegroDuplicateImportMessage returns LuMir duplicate copy", () => {
  assert.equal(
    getAllegroDuplicateImportMessage({
      exists: true,
      productId: 68,
      productTitle: "Produkt z LuMir",
      remoteOfferId: "18527975262",
    }),
    "Produkt juz istnieje w LuMir (#68: Produkt z LuMir). Pomijamy import tej oferty. Usun lokalny produkt, jesli chcesz zaimportowac te oferte ponownie."
  );
});

test("getAllegroDuplicateImportDeleteConfirmMessage explains local-only delete", () => {
  assert.equal(
    getAllegroDuplicateImportDeleteConfirmMessage({
      exists: true,
      productId: 68,
      productTitle: "Produkt z LuMir",
      remoteOfferId: "18527975262",
    }),
    "Produkt juz istnieje w LuMir (#68: Produkt z LuMir). Usunac tylko lokalny produkt w LuMir i pobrac oferte ponownie? Oferta Allegro nie zostanie usunieta."
  );
});

test("getAllegroDuplicateImportMessage returns empty string when duplicate missing", () => {
  assert.equal(
    getAllegroDuplicateImportMessage({
      exists: false,
      productId: null,
      productTitle: null,
      remoteOfferId: null,
    }),
    ""
  );
});

test("buildAllegroDescriptionHtml escapes raw text and image urls", () => {
  assert.equal(
    buildAllegroDescriptionHtml([
      {
        items: [
          { type: "TEXT", content: "<b>A & B</b>" },
          { type: "IMAGE", url: 'https://img.example/test"onerror="boom' },
        ],
      },
    ]),
    '&lt;b&gt;A &amp; B&lt;/b&gt;<img src="https://img.example/test&quot;onerror=&quot;boom" alt="" style="max-width:100%">'
  );
});
