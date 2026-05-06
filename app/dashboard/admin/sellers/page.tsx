"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../../LangContext";
import {
  ADMIN_SELLERS_PAGE_SIZE,
  buildAdminSellersQuery,
  getAdminSellerPermissionOptions,
  getAdminSellerPermissionIconPath,
  getAdminSellersLightViewClasses,
  canEditSellerPermissions,
  canImpersonateSeller,
  isProtectedOwnerSeller,
  startSellerImpersonation,
  type AdminSellerPermissionKey,
  type AdminSellerRow,
  type SellerImpersonationPayload,
} from "./admin-sellers-helpers";
import {
  canViewAdminSellers,
  parseDashboardUser,
  type DashboardUser,
} from "../../nav-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Seller = AdminSellerRow & {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  email_verified?: boolean | number | string | null;
  created_at?: string | null;
  last_login?: string | null;
  can_view_admin_sellers: boolean;
  can_impersonate_sellers: boolean;
  can_grant_admin_permissions: boolean;
  can_view_billing_stats: boolean;
};

type SellersResponse = {
  success?: boolean;
  data?: Seller[];
  pagination?: SellerPagination;
  filters?: { search?: string };
  error?: string;
};

type SellerPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const EMPTY_PAGINATION: SellerPagination = {
  page: 1,
  limit: ADMIN_SELLERS_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const COPY = {
  pl: {
    title: "Sprzedawcy",
    subtitle: "Admin: konta, uprawnienia i szybka impersonacja sprzedawcy.",
    loading: "Ladowanie sprzedawcow...",
    empty: "Brak sprzedawcow.",
    loadFailed: "Nie udalo sie pobrac sprzedawcow.",
    noAccess: "Brak uprawnien do panelu sprzedawcow.",
    seller: "Sprzedawca",
    company: "Firma",
    account: "Konto",
    role: "Rola",
    status: "Status",
    verified: "Zweryfikowany",
    lastLogin: "Ostatnie logowanie",
    permissions: "Uprawnienia",
    actions: "Akcje",
    active: "Aktywne",
    inactive: "Nieaktywne",
    yes: "Tak",
    no: "Nie",
    never: "Nigdy",
    noCompany: "Brak firmy",
    saving: "Zapisywanie...",
    saved: "Zapisano",
    saveFailed: "Nie udalo sie zapisac uprawnien.",
    impersonate: "Wejdz jako",
    impersonating: "Wchodze...",
    impersonateFailed: "Nie udalo sie przelaczyc na sprzedawce.",
    readOnly: "Tylko podglad",
    ownerLocked: "Owner",
    searchPlaceholder: "Szukaj po nazwie, emailu lub firmie",
    search: "Szukaj",
    clear: "Wyczysc",
    previous: "Poprzednia",
    next: "Nastepna",
    results: "Wyniki",
    shown: "Na stronie",
    page: "Strona",
    of: "z",
    perPage: "na strone",
  },
  en: {
    title: "Sellers",
    subtitle: "Admin: seller accounts, permissions, and quick impersonation.",
    loading: "Loading sellers...",
    empty: "No sellers found.",
    loadFailed: "Failed to load sellers.",
    noAccess: "Missing permission for seller admin.",
    seller: "Seller",
    company: "Company",
    account: "Account",
    role: "Role",
    status: "Status",
    verified: "Verified",
    lastLogin: "Last login",
    permissions: "Permissions",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    yes: "Yes",
    no: "No",
    never: "Never",
    noCompany: "No company",
    saving: "Saving...",
    saved: "Saved",
    saveFailed: "Failed to save permissions.",
    impersonate: "Enter as",
    impersonating: "Entering...",
    impersonateFailed: "Failed to impersonate seller.",
    readOnly: "Read only",
    ownerLocked: "Owner",
    searchPlaceholder: "Search by name, email, or company",
    search: "Search",
    clear: "Clear",
    previous: "Previous",
    next: "Next",
    results: "Results",
    shown: "On page",
    page: "Page",
    of: "of",
    perPage: "per page",
  },
} as const;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}

function getStoredUser() {
  return typeof window !== "undefined" ? parseDashboardUser(localStorage.getItem("user")) : null;
}

function boolValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeSeller(seller: Seller): Seller {
  return {
    ...seller,
    can_view_admin_sellers: boolValue(seller.can_view_admin_sellers),
    can_impersonate_sellers: boolValue(seller.can_impersonate_sellers),
    can_grant_admin_permissions: boolValue(seller.can_grant_admin_permissions),
    can_view_billing_stats: boolValue(seller.can_view_billing_stats),
  };
}

function normalizePagination(pagination: SellerPagination | undefined, fallbackPage: number, rowCount: number): SellerPagination {
  if (!pagination) {
    return {
      ...EMPTY_PAGINATION,
      page: fallbackPage,
      total: rowCount,
      hasPrevPage: fallbackPage > 1,
    };
  }

  const page = Number.isFinite(pagination.page) && pagination.page > 0 ? pagination.page : fallbackPage;
  const limit = Number.isFinite(pagination.limit) && pagination.limit > 0 ? pagination.limit : ADMIN_SELLERS_PAGE_SIZE;
  const total = Number.isFinite(pagination.total) && pagination.total > 0 ? pagination.total : 0;
  const totalPages = Math.max(1, Number.isFinite(pagination.totalPages) && pagination.totalPages > 0
    ? pagination.totalPages
    : Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: Boolean(pagination.hasNextPage),
    hasPrevPage: Boolean(pagination.hasPrevPage),
  };
}

function formatDateTime(value: string | null | undefined, emptyLabel: string) {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

function getPermissionPayload(seller: Seller) {
  return {
    can_view_admin_sellers: seller.can_view_admin_sellers,
    can_impersonate_sellers: seller.can_impersonate_sellers,
    can_grant_admin_permissions: seller.can_grant_admin_permissions,
    can_view_billing_stats: seller.can_view_billing_stats,
  };
}

export default function AdminSellersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const copy = COPY[lang];
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [pagination, setPagination] = useState<SellerPagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowMessages, setRowMessages] = useState<Record<number, { ok: boolean; text: string }>>({});
  const [savingKey, setSavingKey] = useState("");
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const canGrant = Boolean(currentUser?.can_grant_admin_permissions);
  const hasAccess = canViewAdminSellers(currentUser);
  const lightClasses = getAdminSellersLightViewClasses();

  useEffect(() => {
    let disposed = false;
    const token = getToken();
    const user = getStoredUser();
    setCurrentUser(user);

    async function load() {
      if (!token) {
        setError(copy.noAccess);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const query = buildAdminSellersQuery({ page, search: submittedSearch });
        const res = await fetch(`${API}/api/admin/sellers?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as SellersResponse;

        if (!res.ok || json.success === false) {
          throw new Error(json.error || copy.loadFailed);
        }
        if (!Array.isArray(json.data)) {
          throw new Error(copy.loadFailed);
        }

        if (!disposed) {
          const normalizedSellers = json.data.map(normalizeSeller);
          setSellers(normalizedSellers);
          setPagination(normalizePagination(json.pagination, page, normalizedSellers.length));
          setRowMessages({});
          setError("");
        }
      } catch (err) {
        if (!disposed) setError(getErrorMessage(err, copy.loadFailed));
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void load();
    return () => {
      disposed = true;
    };
  }, [copy.loadFailed, copy.noAccess, page, submittedSearch]);

  const setMessage = (sellerId: number, ok: boolean, text: string) => {
    setRowMessages((current) => ({ ...current, [sellerId]: { ok, text } }));
  };

  const permissionOptions = useMemo(() => getAdminSellerPermissionOptions(lang), [lang]);

  const submitSearch = () => {
    const nextSearch = searchInput.trim();
    setSubmittedSearch(nextSearch);
    setPage(1);
  };

  const clearSearch = () => {
    if (!searchInput.trim() && !submittedSearch) return;
    setSearchInput("");
    setSubmittedSearch("");
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > pagination.totalPages) return;
    setPage(nextPage);
  };

  const updatePermission = async (seller: Seller, key: AdminSellerPermissionKey, checked: boolean) => {
    if (!currentUser || !canEditSellerPermissions(currentUser, seller)) return;

    const original = seller;
    const next = { ...seller, [key]: checked };
    const requestKey = `${seller.id}:${key}`;
    setSavingKey(requestKey);
    setSellers((current) => current.map((item) => (item.id === seller.id ? next : item)));
    setMessage(seller.id, true, copy.saving);

    try {
      const res = await fetch(`${API}/api/admin/sellers/${seller.id}/permissions`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getPermissionPayload(next)),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; user?: Seller; error?: string };

      if (!res.ok || json.success === false) {
        throw new Error(json.error || copy.saveFailed);
      }

      setSellers((current) =>
        current.map((item) => (item.id === seller.id && json.user ? normalizeSeller(json.user) : item)),
      );
      setMessage(seller.id, true, copy.saved);
    } catch (err) {
      setSellers((current) => current.map((item) => (item.id === seller.id ? original : item)));
      setMessage(seller.id, false, getErrorMessage(err, copy.saveFailed));
    } finally {
      setSavingKey("");
    }
  };

  const impersonate = async (seller: Seller) => {
    if (!currentUser || !canImpersonateSeller(currentUser, seller) || impersonatingId !== null) return;

    setImpersonatingId(seller.id);
    setMessage(seller.id, true, copy.impersonating);

    try {
      const res = await fetch(`${API}/api/admin/sellers/${seller.id}/impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = (await res.json().catch(() => ({}))) as Partial<SellerImpersonationPayload> & {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || json.success === false || !json.token || !json.user) {
        throw new Error(json.error || copy.impersonateFailed);
      }

      startSellerImpersonation({
        token: json.token,
        user: json.user,
        impersonation: json.impersonation,
      });
      router.push("/dashboard");
    } catch (err) {
      setMessage(seller.id, false, getErrorMessage(err, copy.impersonateFailed));
      setImpersonatingId(null);
    }
  };

  const renderSwitchButton = (seller: Seller, fullWidth = false) => {
    const allowed = Boolean(currentUser && canImpersonateSeller(currentUser, seller));

    if (!allowed) {
      return (
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {copy.readOnly}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          if (impersonatingId !== null) return;
          void impersonate(seller);
        }}
        aria-disabled={impersonatingId !== null}
        className={`${fullWidth ? "w-full justify-center" : ""} inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-950/25 transition hover:shadow-lg hover:shadow-indigo-500/20 ${
          impersonatingId !== null ? "cursor-wait opacity-70" : "cursor-pointer"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
        {impersonatingId === seller.id ? copy.impersonating : copy.impersonate}
      </button>
    );
  };

  const renderAccountBadges = (seller: Seller) => (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 [html.dark_&]:bg-indigo-500/15 [html.dark_&]:text-indigo-200">
        {seller.role || "seller"}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        seller.is_active ? "bg-emerald-100 text-emerald-700 [html.dark_&]:bg-emerald-500/15 [html.dark_&]:text-emerald-200" : "bg-slate-100 text-slate-600 [html.dark_&]:bg-slate-700/50 [html.dark_&]:text-slate-300"
      }`}>
        {seller.is_active ? copy.active : copy.inactive}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        boolValue(seller.email_verified) ? "bg-sky-100 text-sky-700 [html.dark_&]:bg-sky-500/15 [html.dark_&]:text-sky-200" : "bg-amber-100 text-amber-700 [html.dark_&]:bg-amber-500/15 [html.dark_&]:text-amber-200"
      }`}>
        {boolValue(seller.email_verified) ? copy.yes : copy.no}
      </span>
    </div>
  );

  const renderPermissionControls = (seller: Seller) => {
    const editable = Boolean(currentUser && canEditSellerPermissions(currentUser, seller));
    const rowMessage = rowMessages[seller.id];

    return (
      <div className="min-w-0">
        <div className="grid gap-2">
          {permissionOptions.map((permission) => {
            const permissionSaving = savingKey === `${seller.id}:${permission.key}`;
            const locked = !editable || permissionSaving;
            const checked = seller[permission.key];

            return (
              <label
                key={permission.key}
                className={`${locked ? lightClasses.permissionCardLocked : lightClasses.permissionCard} ${
                  locked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly={locked}
                  aria-disabled={locked}
                  aria-label={permission.label}
                  onClick={(event) => {
                    if (locked) event.preventDefault();
                  }}
                  onChange={(event) => {
                    if (locked) return;
                    void updatePermission(seller, permission.key, event.target.checked);
                  }}
                  className="peer sr-only"
                />
                <span className={lightClasses.permissionIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={getAdminSellerPermissionIconPath(permission.key)} />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={lightClasses.permissionLabel}>{permission.label}</span>
                  <span className={lightClasses.permissionDescription}>{permission.description}</span>
                </span>
                <span className={lightClasses.switchTrack} aria-hidden="true">
                  <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm transition" />
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-2 min-h-4 text-xs">
          {isProtectedOwnerSeller(seller) && (
            <span className="text-amber-600">{copy.ownerLocked}</span>
          )}
          {!canGrant && !isProtectedOwnerSeller(seller) && (
            <span style={{ color: "var(--text-tertiary)" }}>{copy.readOnly}</span>
          )}
          {rowMessage && (
            <span className={rowMessage.ok ? "text-emerald-600" : "text-rose-600"}>
              {rowMessage.text}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderPaginationControls = () => {
    const canGoPrevious = !loading && pagination.hasPrevPage;
    const canGoNext = !loading && pagination.hasNextPage;

    return (
      <div className="flex flex-col gap-3 border-t border-[var(--border-default)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[var(--text-tertiary)]">
          {copy.page} {pagination.page} {copy.of} {pagination.totalPages} · {pagination.limit} {copy.perPage} · {copy.results}: {pagination.total}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-disabled={!canGoPrevious}
            onClick={() => {
              if (!canGoPrevious) return;
              goToPage(pagination.page - 1);
            }}
            className={`rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition ${
              canGoPrevious ? "bg-[var(--bg-card)] hover:border-indigo-400/60 hover:bg-[var(--bg-card-hover)] hover:text-indigo-500" : "cursor-not-allowed bg-[var(--bg-input-alt)] opacity-50"
            }`}
          >
            {copy.previous}
          </button>
          <button
            type="button"
            aria-disabled={!canGoNext}
            onClick={() => {
              if (!canGoNext) return;
              goToPage(pagination.page + 1);
            }}
            className={`rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition ${
              canGoNext ? "bg-[var(--bg-card)] hover:border-indigo-400/60 hover:bg-[var(--bg-card-hover)] hover:text-indigo-500" : "cursor-not-allowed bg-[var(--bg-input-alt)] opacity-50"
            }`}
          >
            {copy.next}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <div className={lightClasses.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={lightClasses.heroEyebrow}>
              Admin
            </div>
            <h1 className={lightClasses.heroTitle}>{copy.title}</h1>
            <p className={lightClasses.heroSubtitle}>{copy.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className={lightClasses.statCard}>
              <div className={lightClasses.statLabel}>{copy.results}</div>
              <div className={lightClasses.statValue}>{pagination.total}</div>
            </div>
            <div className={lightClasses.statCard}>
              <div className={lightClasses.statLabel}>{copy.shown}</div>
              <div className={lightClasses.statValue}>{sellers.length}</div>
            </div>
          </div>
        </div>
      </div>

      {!hasAccess && !loading ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {copy.noAccess}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className={lightClasses.panel}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
          className={lightClasses.toolbar}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className={lightClasses.input}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-950/25 transition hover:shadow-lg hover:shadow-indigo-500/20"
              >
                {copy.search}
              </button>
              <button
                type="button"
                aria-disabled={!searchInput.trim() && !submittedSearch}
                onClick={clearSearch}
                className={`${lightClasses.secondaryButton} ${
                  searchInput.trim() || submittedSearch ? "bg-[var(--bg-card)] hover:border-indigo-400/60 hover:bg-[var(--bg-card-hover)] hover:text-indigo-500" : "cursor-not-allowed bg-[var(--bg-input-alt)] opacity-50"
                }`}
              >
                {copy.clear}
              </button>
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {copy.page} {pagination.page} {copy.of} {pagination.totalPages} · {pagination.limit} {copy.perPage}
          </div>
        </form>

        {loading ? (
          <div className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>{copy.loading}</div>
        ) : sellers.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>{copy.empty}</div>
        ) : (
          <>
            <div className="space-y-3 p-3 lg:hidden">
              {sellers.map((seller) => (
                <article
                  key={seller.id}
                  className={lightClasses.mobileCard}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="break-words font-semibold" style={{ color: "var(--text-primary)" }}>
                        {seller.name || seller.email || `#${seller.id}`}
                      </div>
                      <div className="mt-1 break-words text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {seller.email}
                      </div>
                      <div className="mt-3">{renderSwitchButton(seller, true)}</div>
                    </div>
                    <div className="flex-shrink-0">{renderAccountBadges(seller)}</div>
                  </div>
                  <div className="mt-4 grid gap-3 text-xs text-[var(--text-tertiary)] sm:grid-cols-2">
                    <div>
                      <span className="block font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{copy.company}</span>
                      <span className="mt-1 block text-sm text-[var(--text-primary)]">{seller.company || copy.noCompany}</span>
                    </div>
                    <div>
                      <span className="block font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{copy.lastLogin}</span>
                      <span className="mt-1 block text-sm text-[var(--text-primary)]">{formatDateTime(seller.last_login, copy.never)}</span>
                    </div>
                  </div>
                  <div className="mt-4">{renderPermissionControls(seller)}</div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[980px] w-full text-left text-sm" style={{ borderCollapse: "collapse" }}>
              <thead className={`text-xs uppercase tracking-[0.2em] ${lightClasses.tableHeader}`}>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[260px] bg-[var(--bg-table-header)] px-4 py-3 font-semibold">{copy.seller}</th>
                  <th className="px-4 py-3 font-semibold">{copy.company}</th>
                  <th className="px-4 py-3 font-semibold">{copy.account}</th>
                  <th className="px-4 py-3 font-semibold">{copy.lastLogin}</th>
                  <th className="min-w-[360px] px-4 py-3 font-semibold">{copy.permissions}</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => {
                  return (
                    <tr key={seller.id} className="border-t border-[var(--border-default)]">
                      <td className="sticky left-0 z-[1] bg-[var(--bg-card)] px-4 py-4 align-top">
                        <div className="min-w-0">
                          <div className="break-words font-semibold" style={{ color: "var(--text-primary)" }}>
                            {seller.name || seller.email || `#${seller.id}`}
                          </div>
                          <div className="mt-1 break-words text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {seller.email}
                          </div>
                          <div className="mt-3">
                            {renderSwitchButton(seller)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-[var(--text-primary)]">
                        {seller.company || copy.noCompany}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {renderAccountBadges(seller)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--text-primary)]">
                        {formatDateTime(seller.last_login, copy.never)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {renderPermissionControls(seller)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
            {renderPaginationControls()}
          </>
        )}
      </section>
    </div>
  );
}
