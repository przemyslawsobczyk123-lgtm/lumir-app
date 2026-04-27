import assert from "node:assert/strict";
import test from "node:test";

import {
  isAmazonUiEnabled,
  resolveMarketplaceSlugForMvp,
  withoutAmazonWhenDisabled,
} from "./mvp-feature-flags.ts";

test("Amazon UI flag is opt-in for MVP", () => {
  assert.equal(isAmazonUiEnabled(undefined), false);
  assert.equal(isAmazonUiEnabled(""), false);
  assert.equal(isAmazonUiEnabled("false"), false);
  assert.equal(isAmazonUiEnabled("true"), true);
  assert.equal(isAmazonUiEnabled(" TRUE "), true);
});

test("withoutAmazonWhenDisabled removes Amazon entries until flag is enabled", () => {
  const entries = [
    { slug: "allegro" },
    { slug: "amazon" },
    { slug: "empik" },
  ];

  assert.deepEqual(
    withoutAmazonWhenDisabled(entries, (entry) => entry.slug, false).map((entry) => entry.slug),
    ["allegro", "empik"]
  );
  assert.deepEqual(
    withoutAmazonWhenDisabled(entries, (entry) => entry.slug, true).map((entry) => entry.slug),
    ["allegro", "amazon", "empik"]
  );
});

test("resolveMarketplaceSlugForMvp redirects disabled Amazon deep links", () => {
  assert.equal(resolveMarketplaceSlugForMvp("amazon", false), "allegro");
  assert.equal(resolveMarketplaceSlugForMvp("amazon", true), "amazon");
  assert.equal(resolveMarketplaceSlugForMvp("empik", false), "empik");
});
