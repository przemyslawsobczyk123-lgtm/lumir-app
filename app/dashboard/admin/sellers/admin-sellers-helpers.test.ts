import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_ORIGINAL_TOKEN_KEY,
  ADMIN_ORIGINAL_USER_KEY,
  canEditSellerPermissions,
  canImpersonateSeller,
  getImpersonationSession,
  startSellerImpersonation,
  stopSellerImpersonation,
} from "./admin-sellers-helpers.ts";

class FakeStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("startSellerImpersonation stores original admin once and swaps active session", () => {
  const storage = new FakeStorage();
  const adminUser = JSON.stringify({ email: "admin@lumir.test", role: "admin" });
  storage.setItem("token", "admin-token");
  storage.setItem("user", adminUser);

  startSellerImpersonation(
    {
      token: "seller-token-1",
      user: { id: 7, email: "seller@lumir.test", role: "seller" },
      impersonation: { impersonatedBy: 1 },
    },
    storage,
  );
  startSellerImpersonation(
    {
      token: "seller-token-2",
      user: { id: 8, email: "other@lumir.test", role: "seller" },
      impersonation: { impersonatedBy: 1 },
    },
    storage,
  );

  assert.equal(storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY), "admin-token");
  assert.equal(storage.getItem(ADMIN_ORIGINAL_USER_KEY), adminUser);
  assert.equal(storage.getItem("token"), "seller-token-2");
  assert.deepEqual(JSON.parse(storage.getItem("user") ?? "{}"), {
    id: 8,
    email: "other@lumir.test",
    role: "seller",
  });
});

test("getImpersonationSession returns current seller and original admin session", () => {
  const storage = new FakeStorage();
  storage.setItem(ADMIN_ORIGINAL_TOKEN_KEY, "admin-token");
  storage.setItem(ADMIN_ORIGINAL_USER_KEY, JSON.stringify({ email: "admin@lumir.test", role: "admin" }));
  storage.setItem("token", "seller-token");
  storage.setItem("user", JSON.stringify({ id: 7, email: "seller@lumir.test", name: "Seller" }));

  assert.deepEqual(getImpersonationSession(storage), {
    currentToken: "seller-token",
    currentUser: { id: 7, email: "seller@lumir.test", name: "Seller" },
    originalToken: "admin-token",
    originalUser: { email: "admin@lumir.test", role: "admin" },
  });
});

test("stopSellerImpersonation restores admin session and clears original keys", () => {
  const storage = new FakeStorage();
  storage.setItem(ADMIN_ORIGINAL_TOKEN_KEY, "admin-token");
  storage.setItem(ADMIN_ORIGINAL_USER_KEY, JSON.stringify({ email: "admin@lumir.test", role: "admin" }));
  storage.setItem("token", "seller-token");
  storage.setItem("user", JSON.stringify({ email: "seller@lumir.test", role: "seller" }));

  const restored = stopSellerImpersonation(storage);

  assert.equal(restored, true);
  assert.equal(storage.getItem("token"), "admin-token");
  assert.deepEqual(JSON.parse(storage.getItem("user") ?? "{}"), {
    email: "admin@lumir.test",
    role: "admin",
  });
  assert.equal(storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY), null);
  assert.equal(storage.getItem(ADMIN_ORIGINAL_USER_KEY), null);
});

test("canEditSellerPermissions requires grant flag and blocks owner rows", () => {
  assert.equal(
    canEditSellerPermissions(
      { role: "admin", can_grant_admin_permissions: true },
      { id: 1, role: "seller" },
    ),
    true,
  );
  assert.equal(
    canEditSellerPermissions(
      { role: "admin", can_grant_admin_permissions: true },
      { id: 2, role: "owner" },
    ),
    false,
  );
  assert.equal(
    canEditSellerPermissions(
      { role: "admin", can_grant_admin_permissions: false },
      { id: 3, role: "seller" },
    ),
    false,
  );
  assert.equal(
    canEditSellerPermissions(
      { role: "admin", can_grant_admin_permissions: true },
      { id: 4, role: "admin", email: "przemyslawsobczyk072@gmail.com" },
    ),
    false,
  );
});

test("canImpersonateSeller requires impersonate flag and active non-admin seller", () => {
  const currentUser = { role: "admin", can_impersonate_sellers: true };

  assert.equal(canImpersonateSeller(currentUser, { id: 1, role: "seller", status: "active" }), true);
  assert.equal(canImpersonateSeller(currentUser, { id: 2, role: "seller", status: "inactive" }), false);
  assert.equal(canImpersonateSeller(currentUser, { id: 3, role: "admin", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "admin" }, { id: 4, role: "seller", status: "active" }), false);
});
