"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../../LangContext";
import {
  getAdminSellerPermissionOptions,
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
};

type SellersResponse = {
  success?: boolean;
  data?: Seller[];
  error?: string;
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
  };
}

export default function AdminSellersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const copy = COPY[lang];
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowMessages, setRowMessages] = useState<Record<number, { ok: boolean; text: string }>>({});
  const [savingKey, setSavingKey] = useState("");
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const canGrant = Boolean(currentUser?.can_grant_admin_permissions);
  const hasAccess = canViewAdminSellers(currentUser);

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
        const res = await fetch(`${API}/api/admin/sellers`, {
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
          setSellers(json.data.map(normalizeSeller));
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
  }, [copy.loadFailed, copy.noAccess]);

  const totals = useMemo(() => {
    const active = sellers.filter((seller) => seller.is_active === true || seller.is_active === 1).length;
    const admins = sellers.filter((seller) => seller.role === "admin" || seller.role === "owner").length;
    return { active, admins };
  }, [sellers]);

  const setMessage = (sellerId: number, ok: boolean, text: string) => {
    setRowMessages((current) => ({ ...current, [sellerId]: { ok, text } }));
  };

  const permissionOptions = useMemo(() => getAdminSellerPermissionOptions(lang), [lang]);

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
        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
        {impersonatingId === seller.id ? copy.impersonating : copy.impersonate}
      </button>
    );
  };

  const renderAccountBadges = (seller: Seller) => (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-indigo-500/12 px-2.5 py-1 text-xs font-semibold text-indigo-300">
        {seller.role || "seller"}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        seller.is_active ? "bg-emerald-500/12 text-emerald-300" : "bg-slate-500/12 text-slate-400"
      }`}>
        {seller.is_active ? copy.active : copy.inactive}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        boolValue(seller.email_verified) ? "bg-sky-500/12 text-sky-300" : "bg-amber-500/12 text-amber-300"
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
                className={`group flex min-w-0 items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  locked
                    ? "cursor-not-allowed border-slate-700/80 bg-slate-950/30 opacity-70"
                    : "cursor-pointer border-indigo-400/20 bg-indigo-500/5 hover:border-indigo-300/50 hover:bg-indigo-500/10"
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
                <span className="mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center justify-start rounded-full border border-slate-600 bg-slate-800 px-0.5 transition peer-checked:justify-end peer-checked:border-indigo-300 peer-checked:bg-indigo-500">
                  <span className="h-3.5 w-3.5 rounded-full bg-white transition" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-100">{permission.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{permission.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-2 min-h-4 text-xs">
          {isProtectedOwnerSeller(seller) && (
            <span className="text-amber-400">{copy.ownerLocked}</span>
          )}
          {!canGrant && !isProtectedOwnerSeller(seller) && (
            <span style={{ color: "var(--text-tertiary)" }}>{copy.readOnly}</span>
          )}
          {rowMessage && (
            <span className={rowMessage.ok ? "text-emerald-400" : "text-rose-400"}>
              {rowMessage.text}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))] p-6 shadow-2xl shadow-indigo-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-indigo-300">
              Admin
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-white">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{copy.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.active}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{totals.active}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</div>
              <div className="mt-2 text-3xl font-semibold text-white">{totals.admins}</div>
            </div>
          </div>
        </div>
      </div>

      {!hasAccess && !loading ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
          {copy.noAccess}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[1.5rem] shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
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
                  className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
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
                  <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                    <div>
                      <span className="block font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.company}</span>
                      <span className="mt-1 block text-sm text-slate-200">{seller.company || copy.noCompany}</span>
                    </div>
                    <div>
                      <span className="block font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.lastLogin}</span>
                      <span className="mt-1 block text-sm text-slate-200">{formatDateTime(seller.last_login, copy.never)}</span>
                    </div>
                  </div>
                  <div className="mt-4">{renderPermissionControls(seller)}</div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[980px] w-full text-left text-sm" style={{ borderCollapse: "collapse" }}>
              <thead className="text-xs uppercase tracking-[0.2em]" style={{ background: "var(--bg-table-header)", color: "var(--text-secondary)" }}>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[260px] px-4 py-3 font-semibold" style={{ background: "var(--bg-table-header)" }}>{copy.seller}</th>
                  <th className="px-4 py-3 font-semibold">{copy.company}</th>
                  <th className="px-4 py-3 font-semibold">{copy.account}</th>
                  <th className="px-4 py-3 font-semibold">{copy.lastLogin}</th>
                  <th className="min-w-[360px] px-4 py-3 font-semibold">{copy.permissions}</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => {
                  return (
                    <tr key={seller.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                      <td className="sticky left-0 z-[1] px-4 py-4 align-top" style={{ background: "var(--bg-card)" }}>
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
                      <td className="px-4 py-4 align-top" style={{ color: "var(--text-secondary)" }}>
                        {seller.company || copy.noCompany}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {renderAccountBadges(seller)}
                      </td>
                      <td className="px-4 py-4 align-top whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
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
          </>
        )}
      </section>
    </div>
  );
}
