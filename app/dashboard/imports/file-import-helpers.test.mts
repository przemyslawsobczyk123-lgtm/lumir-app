import test from "node:test";
import assert from "node:assert/strict";

import {
  FILE_IMPORT_MARKETPLACES,
  IMPORT_DESTINATIONS,
  getImportDestination,
  getVisibleImportDestinations,
  isAllowedImportFileName,
} from "./file-import-helpers.ts";

test("isAllowedImportFileName accepts marketplace import spreadsheets and csv", () => {
  assert.equal(isAllowedImportFileName("mediaexpert.xlsx"), true);
  assert.equal(isAllowedImportFileName("empik.XLS"), true);
  assert.equal(isAllowedImportFileName("produkty.csv"), true);
});

test("isAllowedImportFileName rejects unsupported files", () => {
  assert.equal(isAllowedImportFileName("produkty.txt"), false);
  assert.equal(isAllowedImportFileName("produkty.pdf"), false);
  assert.equal(isAllowedImportFileName(""), false);
});

test("import destinations expose file marketplaces before remote marketplaces", () => {
  assert.deepEqual(FILE_IMPORT_MARKETPLACES, ["mediaexpert", "empik", "custom"]);
  assert.deepEqual(IMPORT_DESTINATIONS.map((item) => item.id), [
    "mediaexpert",
    "empik",
    "custom",
    "allegro",
    "amazon",
  ]);
  assert.equal(getImportDestination("empik")?.kind, "file");
  assert.equal(getImportDestination("custom")?.label, "W\u0142asny plik");
  assert.equal(getImportDestination("amazon")?.kind, "remote");
});

test("visible import destinations hide Amazon by default for MVP", () => {
  assert.deepEqual(
    getVisibleImportDestinations(false).map((item) => item.id),
    ["mediaexpert", "empik", "custom", "allegro"]
  );
  assert.deepEqual(
    getVisibleImportDestinations(true).map((item) => item.id),
    ["mediaexpert", "empik", "custom", "allegro", "amazon"]
  );
});
