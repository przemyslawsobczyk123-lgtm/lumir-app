import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appDir = path.resolve("app");

test("legal pages exist for registration links", () => {
  for (const route of ["privacy", "terms", "regulamin"]) {
    const page = path.join(appDir, route, "page.tsx");
    assert.equal(fs.existsSync(page), true, `${route} page missing`);
    const content = fs.readFileSync(page, "utf8");
    assert.match(content, /LuMir/);
  }
});

test("register page links to terms and privacy", () => {
  const content = fs.readFileSync(path.join(appDir, "register", "page.tsx"), "utf8");

  assert.match(content, /href="\/regulamin"/);
  assert.match(content, /href="\/privacy"/);
});
