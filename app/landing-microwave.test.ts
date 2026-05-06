import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appDir = path.resolve("app");
const page = fs.readFileSync(path.join(appDir, "page.tsx"), "utf8");

test("landing shows microwave before and after LumirAI image transformation", () => {
  assert.match(page, /Kuchenka mikrofalowa/i);
  assert.match(page, /PRZED/);
  assert.match(page, /PO LUMIRAI/);
  assert.match(page, /RGB 255/);
  assert.match(page, /białe tło/i);
});

test("landing explains all generated offer artifacts", () => {
  for (const label of ["Tytuł produktu", "Opis produktu", "Atrybuty produktu", "Zdjęcia produktowe"]) {
    assert.match(page, new RegExp(label, "i"));
  }
});
