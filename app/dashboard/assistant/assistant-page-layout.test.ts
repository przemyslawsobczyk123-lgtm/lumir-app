import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const pageSource = readFileSync(join(process.cwd(), "app/dashboard/assistant/page.tsx"), "utf8");

test("assistant page uses a focused full-width chat workspace", () => {
  assert.match(pageSource, /assistant-workspace/);
  assert.match(pageSource, /assistant-welcome/);
  assert.match(pageSource, /xl:w-\[calc\(100vw-284px\)\]/);
  assert.doesNotMatch(pageSource, /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.doesNotMatch(pageSource, /<aside/);
});
