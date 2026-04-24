import test from "node:test";
import assert from "node:assert/strict";

import { getAllegroImportErrorNotice } from "./allegro-import-helpers.ts";

test("getAllegroImportErrorNotice explains deprecated Allegro offer details resource", () => {
  const notice = getAllegroImportErrorNotice(
    "403 ACCESS_DENIED This resource is no longer supported and access to it was blocked for your integration"
  );

  assert.deepEqual(notice, {
    title: "Allegro zablokowalo stary zasob szczegolow oferty",
    message: "Wyglada na deprecated resource szczegolow oferty w Allegro. To nie jest zwykly brak jednego scope.",
  });
});

test("getAllegroImportErrorNotice keeps generic 403 without fake scope diagnosis", () => {
  const notice = getAllegroImportErrorNotice("Request failed with status code 403");

  assert.deepEqual(notice, {
    title: "Allegro odrzucilo pobranie oferty (403)",
    message: "403 moze oznaczac problem z zasobem, tokenem albo uprawnieniami. Ten komunikat sam w sobie nie potwierdza braku scope.",
  });
});

test("getAllegroImportErrorNotice returns null for non-403 errors", () => {
  assert.equal(getAllegroImportErrorNotice("Nie udalo sie pobrac oferty"), null);
});
