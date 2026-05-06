import type { DashboardUser } from "../../nav-helpers";

export const ADMIN_ORIGINAL_TOKEN_KEY = "admin_original_token";
export const ADMIN_ORIGINAL_USER_KEY = "admin_original_user";
export const ADMIN_SELLERS_PAGE_SIZE = 50;

const TOKEN_KEY = "token";
const USER_KEY = "user";
const OWNER_EMAIL = "przemyslawsobczyk072@gmail.com";

export type AdminSellerUser = Record<string, unknown>;

export type SellerImpersonationPayload = {
  token: string;
  user: AdminSellerUser;
  impersonation?: unknown;
};

export type ImpersonationSession = {
  currentToken: string;
  currentUser: AdminSellerUser | null;
  originalToken: string;
  originalUser: AdminSellerUser | null;
};

export type AdminSellerRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  status?: string | null;
  is_active?: boolean | number | null;
  active?: boolean | number | null;
  email_verified?: boolean | number | string | null;
  created_at?: string | null;
  last_login?: string | null;
  can_view_admin_sellers?: boolean | number | string | null;
  can_impersonate_sellers?: boolean | number | string | null;
  can_grant_admin_permissions?: boolean | number | string | null;
  can_view_billing_stats?: boolean | number | string | null;
};

export type AdminSellerPermissionKey =
  | "can_view_admin_sellers"
  | "can_impersonate_sellers"
  | "can_grant_admin_permissions"
  | "can_view_billing_stats";

type AdminSellerPermissionOption = {
  key: AdminSellerPermissionKey;
  label: string;
  shortLabel: string;
  description: string;
};

const ADMIN_SELLER_PERMISSION_OPTIONS: Record<"pl" | "en", AdminSellerPermissionOption[]> = {
  pl: [
    {
      key: "can_view_admin_sellers",
      label: "Lista sprzedawcow",
      shortLabel: "Lista",
      description: "Widok zakladki i listy kont.",
    },
    {
      key: "can_impersonate_sellers",
      label: "Przelaczanie kont",
      shortLabel: "Konta",
      description: "Wejscie w tryb sprzedawcy.",
    },
    {
      key: "can_grant_admin_permissions",
      label: "Nadawanie admina",
      shortLabel: "Admin",
      description: "Edycja uprawnien innych kont.",
    },
    {
      key: "can_view_billing_stats",
      label: "Statystyki billingowe",
      shortLabel: "Staty",
      description: "Widok przychodow i zuzycia kredytow.",
    },
  ],
  en: [
    {
      key: "can_view_admin_sellers",
      label: "Seller list",
      shortLabel: "List",
      description: "View seller admin tab and accounts.",
    },
    {
      key: "can_impersonate_sellers",
      label: "Switch accounts",
      shortLabel: "Switch",
      description: "Enter seller account mode.",
    },
    {
      key: "can_grant_admin_permissions",
      label: "Grant admin",
      shortLabel: "Admin",
      description: "Edit permissions on other accounts.",
    },
    {
      key: "can_view_billing_stats",
      label: "Billing stats",
      shortLabel: "Stats",
      description: "View revenue and credit usage.",
    },
  ],
};

export function getAdminSellerPermissionOptions(lang: "pl" | "en") {
  return ADMIN_SELLER_PERMISSION_OPTIONS[lang];
}

function normalizePage(page: unknown) {
  const parsed = typeof page === "number" ? page : Number.parseInt(String(page ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function buildAdminSellersQuery({ page, search }: { page: number; search: string }) {
  const params = new URLSearchParams();
  const trimmedSearch = search.trim();

  params.set("page", String(normalizePage(page)));
  params.set("limit", String(ADMIN_SELLERS_PAGE_SIZE));
  if (trimmedSearch) params.set("search", trimmedSearch);

  return params.toString();
}

export function createAdminSellerScaleFixture(count = 400): AdminSellerRow[] {
  return Array.from({ length: Math.max(0, count) }, (_value, index) => {
    const id = index + 1;
    const isAdmin = index % 37 === 0;
    const isActive = index % 9 !== 0;
    return {
      id,
      name: `${isAdmin ? "Admin" : "Seller"} ${String(id).padStart(3, "0")}`,
      email: `seller-${String(id).padStart(3, "0")}@scale.lumir.test`,
      company: index % 4 === 0 ? "LuMir Pro" : `Firma ${index % 23}`,
      role: isAdmin ? "admin" : "seller",
      status: isActive ? "active" : "inactive",
      is_active: isActive,
      email_verified: index % 5 !== 0,
      created_at: new Date(Date.UTC(2026, 3, 1 + (index % 28), 9, index % 60)).toISOString(),
      last_login: index % 6 === 0 ? null : new Date(Date.UTC(2026, 3, 20 + (index % 8), 8, index % 60)).toISOString(),
      can_view_admin_sellers: index % 2 === 0,
      can_impersonate_sellers: index % 3 === 0,
      can_grant_admin_permissions: index % 5 === 0,
      can_view_billing_stats: index % 7 === 0,
    };
  });
}

export function getAdminSellerPermissionIconPath(key: AdminSellerPermissionKey) {
  const paths: Record<AdminSellerPermissionKey, string> = {
    can_view_admin_sellers: "M4 6h16M4 12h16M4 18h10",
    can_impersonate_sellers: "M7 7h10M17 7l-3-3m3 3-3 3M17 17H7m0 0 3-3m-3 3 3 3",
    can_grant_admin_permissions: "M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4zM9 12l2 2 4-4",
    can_view_billing_stats: "M4 19V5m0 14h16M8 16V9m4 7V7m4 9v-4",
  };
  return paths[key];
}

export function getAdminSellersLightViewClasses() {
  return {
    hero: "rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]",
    heroEyebrow: "text-[11px] font-semibold uppercase tracking-[0.26em] text-indigo-500",
    heroTitle: "mt-3 text-3xl font-semibold text-[var(--text-heading)]",
    heroSubtitle: "mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]",
    statCard: "rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input-alt)] p-4",
    statLabel: "text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]",
    statValue: "mt-2 text-3xl font-semibold text-[var(--text-heading)]",
    panel: "overflow-hidden rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]",
    toolbar: "flex flex-col gap-3 border-b border-[var(--border-default)] p-4 lg:flex-row lg:items-center lg:justify-between",
    input: "min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-indigo-400 focus:bg-[var(--bg-input)] focus:ring-4 focus:ring-indigo-500/10",
    secondaryButton: "rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition",
    tableHeader: "bg-[var(--bg-table-header)] text-[var(--text-tertiary)]",
    mobileCard: "rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]",
    permissionCard: "group flex min-w-0 items-start gap-3 rounded-xl border border-[var(--accent-primary-border)] bg-[var(--accent-primary-light)] px-3 py-2.5 text-left transition hover:border-indigo-400/60 hover:bg-[var(--bg-card-hover)]",
    permissionCardLocked: "group flex min-w-0 items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input-alt)] px-3 py-2.5 text-left opacity-80",
    permissionIcon: "mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--bg-card)] text-indigo-500 shadow-sm ring-1 ring-[var(--border-default)]",
    permissionLabel: "block text-xs font-semibold text-[var(--text-primary)]",
    permissionDescription: "mt-0.5 block text-[11px] leading-4 text-[var(--text-secondary)]",
    switchTrack: "mt-1 inline-flex h-5 w-9 flex-shrink-0 items-center justify-start rounded-full border border-[var(--border-default)] bg-[var(--bg-input)] px-0.5 transition peer-checked:justify-end peer-checked:border-indigo-500 peer-checked:bg-indigo-500",
  };
}

function normalizeRole(role: unknown) {
  return typeof role === "string" ? role.toLowerCase() : "";
}

function isAdminActor(user: DashboardUser | null | undefined) {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "owner";
}

function isActiveSeller(seller: AdminSellerRow) {
  if (seller.status) return seller.status.toLowerCase() === "active";
  return seller.is_active === true || seller.is_active === 1 || seller.active === true || seller.active === 1;
}

export function isProtectedOwnerSeller(seller: AdminSellerRow) {
  return normalizeRole(seller.role) === "owner" || seller.email?.trim().toLowerCase() === OWNER_EMAIL;
}

export function canEditSellerPermissions(currentUser: DashboardUser | null | undefined, seller: AdminSellerRow) {
  return Boolean(isAdminActor(currentUser) && currentUser?.can_grant_admin_permissions && !isProtectedOwnerSeller(seller));
}

export function canImpersonateSeller(currentUser: DashboardUser | null | undefined, seller: AdminSellerRow) {
  return Boolean(
    isAdminActor(currentUser) &&
      currentUser?.can_impersonate_sellers &&
      isActiveSeller(seller) &&
      !isProtectedOwnerSeller(seller),
  );
}

function readJsonObject(raw: string | null): AdminSellerUser | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as AdminSellerUser) : null;
  } catch {
    return null;
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function dispatchDashboardStorageEvent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lumir-dashboard-storage"));
}

export function startSellerImpersonation(payload: SellerImpersonationPayload, storage = getBrowserStorage()) {
  if (!storage) return false;

  const currentToken = storage.getItem(TOKEN_KEY);
  const currentUser = storage.getItem(USER_KEY);

  if (!storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY) && currentToken) {
    storage.setItem(ADMIN_ORIGINAL_TOKEN_KEY, currentToken);
  }
  if (!storage.getItem(ADMIN_ORIGINAL_USER_KEY) && currentUser) {
    storage.setItem(ADMIN_ORIGINAL_USER_KEY, currentUser);
  }

  storage.setItem(TOKEN_KEY, payload.token);
  storage.setItem(USER_KEY, JSON.stringify(payload.user));
  dispatchDashboardStorageEvent();
  return true;
}

export function getImpersonationSession(storage = getBrowserStorage()): ImpersonationSession | null {
  if (!storage) return null;

  const originalToken = storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY);
  if (!originalToken) return null;

  return {
    currentToken: storage.getItem(TOKEN_KEY) ?? "",
    currentUser: readJsonObject(storage.getItem(USER_KEY)),
    originalToken,
    originalUser: readJsonObject(storage.getItem(ADMIN_ORIGINAL_USER_KEY)),
  };
}

export function getImpersonationSessionSnapshot(storage = getBrowserStorage()) {
  if (!storage) return "";

  const originalToken = storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY);
  if (!originalToken) return "";

  return JSON.stringify({
    currentToken: storage.getItem(TOKEN_KEY) ?? "",
    currentUserRaw: storage.getItem(USER_KEY),
    originalToken,
    originalUserRaw: storage.getItem(ADMIN_ORIGINAL_USER_KEY),
  });
}

export function getImpersonationSessionFromSnapshot(snapshot: string | null | undefined): ImpersonationSession | null {
  if (!snapshot) return null;

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    const originalToken = typeof candidate.originalToken === "string" ? candidate.originalToken : "";
    if (!originalToken) return null;

    return {
      currentToken: typeof candidate.currentToken === "string" ? candidate.currentToken : "",
      currentUser: readJsonObject(typeof candidate.currentUserRaw === "string" ? candidate.currentUserRaw : null),
      originalToken,
      originalUser: readJsonObject(typeof candidate.originalUserRaw === "string" ? candidate.originalUserRaw : null),
    };
  } catch {
    return null;
  }
}

export function stopSellerImpersonation(storage = getBrowserStorage()) {
  if (!storage) return false;

  const originalToken = storage.getItem(ADMIN_ORIGINAL_TOKEN_KEY);
  if (!originalToken) return false;

  const originalUser = storage.getItem(ADMIN_ORIGINAL_USER_KEY);
  storage.setItem(TOKEN_KEY, originalToken);
  if (originalUser) {
    storage.setItem(USER_KEY, originalUser);
  } else {
    storage.removeItem(USER_KEY);
  }

  storage.removeItem(ADMIN_ORIGINAL_TOKEN_KEY);
  storage.removeItem(ADMIN_ORIGINAL_USER_KEY);
  dispatchDashboardStorageEvent();
  return true;
}

export function clearAdminOriginalSession(storage = getBrowserStorage()) {
  if (!storage) return;
  storage.removeItem(ADMIN_ORIGINAL_TOKEN_KEY);
  storage.removeItem(ADMIN_ORIGINAL_USER_KEY);
  dispatchDashboardStorageEvent();
}

export function storeFreshAuthSession(token: string, user: AdminSellerUser, storage = getBrowserStorage()) {
  if (!storage) return false;

  storage.removeItem(ADMIN_ORIGINAL_TOKEN_KEY);
  storage.removeItem(ADMIN_ORIGINAL_USER_KEY);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  dispatchDashboardStorageEvent();
  return true;
}
