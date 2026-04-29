import type { DashboardUser } from "../../nav-helpers";

export const ADMIN_ORIGINAL_TOKEN_KEY = "admin_original_token";
export const ADMIN_ORIGINAL_USER_KEY = "admin_original_user";

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
  email?: string | null;
  role?: string | null;
  status?: string | null;
  is_active?: boolean | number | null;
  active?: boolean | number | null;
};

export type AdminSellerPermissionKey =
  | "can_view_admin_sellers"
  | "can_impersonate_sellers"
  | "can_grant_admin_permissions";

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
  ],
};

export function getAdminSellerPermissionOptions(lang: "pl" | "en") {
  return ADMIN_SELLER_PERMISSION_OPTIONS[lang];
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
  const role = normalizeRole(seller.role);
  return Boolean(
    isAdminActor(currentUser) &&
      currentUser?.can_impersonate_sellers &&
      isActiveSeller(seller) &&
      role !== "admin" &&
      role !== "owner",
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
