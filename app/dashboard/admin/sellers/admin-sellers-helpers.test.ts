import assert from "node:assert/strict";
import test from "node:test";

import * as adminSellerHelpers from "./admin-sellers-helpers.ts";
import {
  ADMIN_ORIGINAL_TOKEN_KEY,
  ADMIN_ORIGINAL_USER_KEY,
  canEditSellerPermissions,
  canImpersonateSeller,
  getImpersonationSession,
  getImpersonationSessionFromSnapshot,
  getImpersonationSessionSnapshot,
  startSellerImpersonation,
  stopSellerImpersonation,
  storeFreshAuthSession,
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

test("impersonation snapshot is empty without original admin and parses without storage reads", () => {
  const storage = new FakeStorage();

  assert.equal(getImpersonationSessionSnapshot(storage), "");

  storage.setItem(ADMIN_ORIGINAL_TOKEN_KEY, "admin-token");
  storage.setItem(ADMIN_ORIGINAL_USER_KEY, JSON.stringify({ email: "admin@lumir.test", role: "admin" }));
  storage.setItem("token", "seller-token");
  storage.setItem("user", JSON.stringify({ email: "seller@lumir.test", role: "seller" }));

  const snapshot = getImpersonationSessionSnapshot(storage);

  assert.deepEqual(getImpersonationSessionFromSnapshot(snapshot), {
    currentToken: "seller-token",
    currentUser: { email: "seller@lumir.test", role: "seller" },
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
  assert.equal(
    canEditSellerPermissions(
      { role: "seller", can_grant_admin_permissions: true },
      { id: 5, role: "seller" },
    ),
    false,
  );
  assert.equal(
    canEditSellerPermissions(
      { role: "owner", can_grant_admin_permissions: true },
      { id: 6, role: "seller" },
    ),
    true,
  );
});

test("canImpersonateSeller requires impersonate flag and active non-admin seller", () => {
  const currentUser = { role: "admin", can_impersonate_sellers: true };

  assert.equal(canImpersonateSeller(currentUser, { id: 1, role: "seller", status: "active" }), true);
  assert.equal(canImpersonateSeller(currentUser, { id: 2, role: "seller", status: "inactive" }), false);
  assert.equal(canImpersonateSeller(currentUser, { id: 3, role: "admin", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "admin" }, { id: 4, role: "seller", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "seller", can_impersonate_sellers: true }, { id: 5, role: "seller", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "owner", can_impersonate_sellers: true }, { id: 6, role: "seller", status: "active" }), true);
});

test("storeFreshAuthSession clears stale admin original before writing fresh login", () => {
  const storage = new FakeStorage();
  storage.setItem(ADMIN_ORIGINAL_TOKEN_KEY, "old-admin-token");
  storage.setItem(ADMIN_ORIGINAL_USER_KEY, JSON.stringify({ email: "old-admin@lumir.test" }));
  storage.setItem("token", "seller-token");
  storage.setItem("user", JSON.stringify({ email: "seller@lumir.test" }));

  storeFreshAuthSession("new-token", { email: "new@lumir.test", role: "seller" }, storage);

  assert.equal(storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY), null);
  assert.equal(storage.getItem(ADMIN_ORIGINAL_USER_KEY), null);
  assert.equal(storage.getItem("token"), "new-token");
  assert.deepEqual(JSON.parse(storage.getItem("user") ?? "{}"), {
    email: "new@lumir.test",
    role: "seller",
  });
});

test("admin seller permission options use clear Polish labels and stable order", () => {
  const getAdminSellerPermissionOptions = (adminSellerHelpers as {
    getAdminSellerPermissionOptions?: (lang: "pl" | "en") => Array<{
      key: string;
      label: string;
      description: string;
    }>;
  }).getAdminSellerPermissionOptions;

  assert.equal(typeof getAdminSellerPermissionOptions, "function");
  assert.deepEqual(
    getAdminSellerPermissionOptions?.("pl").map((permission) => ({
      key: permission.key,
      label: permission.label,
      description: permission.description,
    })),
    [
      {
        key: "can_view_admin_sellers",
        label: "Lista sprzedawcow",
        description: "Widok zakladki i listy kont.",
      },
      {
        key: "can_impersonate_sellers",
        label: "Przelaczanie kont",
        description: "Wejscie w tryb sprzedawcy.",
      },
      {
        key: "can_grant_admin_permissions",
        label: "Nadawanie admina",
        description: "Edycja uprawnien innych kont.",
      },
    ],
  );
});
