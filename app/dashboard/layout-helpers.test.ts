import assert from "node:assert/strict";
import test from "node:test";

import {
  getDashboardSessionRefreshKey,
  getImpersonationBannerClasses,
} from "./layout-helpers.ts";

test("impersonation banner uses readable light-theme contrast", () => {
  const classes = getImpersonationBannerClasses();
  const allClasses = [
    classes.container,
    classes.eyebrow,
    classes.identity,
    classes.button,
  ].join(" ");

  assert.match(classes.container, /bg-amber-100/);
  assert.match(classes.container, /text-amber-950/);
  assert.match(classes.eyebrow, /text-amber-900/);
  assert.match(classes.identity, /text-amber-950/);
  assert.match(classes.button, /bg-white/);
  assert.match(classes.button, /text-amber-950/);
  assert.doesNotMatch(allClasses, /text-amber-100(?!\])/);
  assert.doesNotMatch(allClasses, /bg-amber-500\/10/);
});

test("impersonation banner keeps explicit dark-theme overrides", () => {
  const classes = getImpersonationBannerClasses();
  const allClasses = [
    classes.container,
    classes.eyebrow,
    classes.identity,
    classes.button,
  ].join(" ");

  assert.match(allClasses, /\[html\.dark_&\]:bg-\[#3b2a08\]/);
  assert.match(allClasses, /\[html\.dark_&\]:text-\[#fde68a\]/);
  assert.match(classes.button, /\[html\.dark_&\]:text-amber-50/);
});

test("dashboard session refresh key changes when impersonation swaps active seller", () => {
  const adminUser = JSON.stringify({ id: 1, email: "admin@example.com" });
  const sellerUser = JSON.stringify({ id: 2, email: "seller@example.com" });
  const before = getDashboardSessionRefreshKey(adminUser, "");
  const after = getDashboardSessionRefreshKey(
    sellerUser,
    JSON.stringify({
      currentToken: "seller-token",
      currentUserRaw: sellerUser,
      originalToken: "admin-token",
      originalUserRaw: adminUser,
    }),
  );

  assert.notEqual(before, after);
  assert.match(after, /seller@example\.com/);
  assert.match(after, /impersonating/);
});
