import assert from "node:assert/strict";
import test from "node:test";

import * as adminSellerHelpers from "./admin-sellers-helpers.ts";
import {
  ADMIN_ORIGINAL_TOKEN_KEY,
  ADMIN_ORIGINAL_USER_KEY,
  ADMIN_SELLERS_PAGE_SIZE,
  buildAdminSellersQuery,
  canEditSellerPermissions,
  canImpersonateSeller,
  createAdminSellerScaleFixture,
  getAdminSellerPermissionIconPath,
  getAdminSellersLightViewClasses,
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

test("canImpersonateSeller requires impersonate flag and active non-owner seller", () => {
  const currentUser = { role: "admin", can_impersonate_sellers: true };

  assert.equal(canImpersonateSeller(currentUser, { id: 1, role: "seller", status: "active" }), true);
  assert.equal(canImpersonateSeller(currentUser, { id: 2, role: "seller", status: "inactive" }), false);
  assert.equal(canImpersonateSeller(currentUser, { id: 3, role: "admin", status: "active" }), true);
  assert.equal(canImpersonateSeller({ role: "admin" }, { id: 4, role: "seller", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "seller", can_impersonate_sellers: true }, { id: 5, role: "seller", status: "active" }), false);
  assert.equal(canImpersonateSeller({ role: "owner", can_impersonate_sellers: true }, { id: 6, role: "seller", status: "active" }), true);
  assert.equal(canImpersonateSeller(currentUser, { id: 7, role: "owner", status: "active" }), false);
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
      {
        key: "can_view_billing_stats",
        label: "Statystyki billingowe",
        description: "Widok przychodow i zuzycia kredytow.",
      },
    ],
  );
});

test("buildAdminSellersQuery sends 50 sellers per page and trims search", () => {
  assert.equal(ADMIN_SELLERS_PAGE_SIZE, 50);
  assert.equal(
    buildAdminSellersQuery({ page: 2, search: "  Smoke Prod  " }),
    "page=2&limit=50&search=Smoke+Prod",
  );
});

test("buildAdminSellersQuery clamps invalid page and omits empty search", () => {
  assert.equal(buildAdminSellersQuery({ page: -4, search: "   " }), "page=1&limit=50");
});

test("createAdminSellerScaleFixture builds 400 sellers with varied access flags", () => {
  const sellers = createAdminSellerScaleFixture(400);
  const active = sellers.filter((seller) => seller.is_active).length;
  const inactive = sellers.filter((seller) => !seller.is_active).length;
  const canView = sellers.filter((seller) => seller.can_view_admin_sellers).length;
  const canImpersonate = sellers.filter((seller) => seller.can_impersonate_sellers).length;
  const canGrant = sellers.filter((seller) => seller.can_grant_admin_permissions).length;
  const canStats = sellers.filter((seller) => seller.can_view_billing_stats).length;

  assert.equal(sellers.length, 400);
  assert.equal(new Set(sellers.map((seller) => seller.email)).size, 400);
  assert.ok(active > 0);
  assert.ok(inactive > 0);
  assert.ok(canView > 0);
  assert.ok(canImpersonate > 0);
  assert.ok(canGrant > 0);
  assert.ok(canStats > 0);
  assert.ok(sellers.some((seller) => seller.role === "admin"));
  assert.ok(sellers.some((seller) => seller.role === "seller"));
});

test("admin sellers classes use dashboard theme tokens for dark mode", () => {
  const classes = getAdminSellersLightViewClasses();

  assert.match(classes.hero, /bg-\[var\(--bg-card\)\]/);
  assert.match(classes.panel, /bg-\[var\(--bg-card\)\]/);
  assert.match(classes.input, /bg-\[var\(--bg-input\)\]/);
  assert.match(classes.input, /text-\[var\(--text-primary\)\]/);
  assert.match(classes.permissionCard, /bg-\[var\(--accent-primary-light\)\]/);
  assert.match(classes.permissionIcon, /text-indigo-500/);
  assert.match(classes.tableHeader, /bg-\[var\(--bg-table-header\)\]/);
  assert.doesNotMatch(`${classes.hero} ${classes.panel} ${classes.mobileCard}`, /\bbg-white\b/);
});

test("admin seller permissions expose stable visible icons", () => {
  assert.match(getAdminSellerPermissionIconPath("can_view_admin_sellers"), /M4 6h16/);
  assert.match(getAdminSellerPermissionIconPath("can_impersonate_sellers"), /M7 7h10/);
  assert.match(getAdminSellerPermissionIconPath("can_grant_admin_permissions"), /M12 3/);
  assert.match(getAdminSellerPermissionIconPath("can_view_billing_stats"), /M4 19/);
});
