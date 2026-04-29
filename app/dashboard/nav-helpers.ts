export type DashboardNavLabels = {
  dashboard: string;
  products: string;
  imports: string;
  exportApi: string;
  sellers: string;
  billing: string;
  settings: string;
};

export type DashboardNavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: string;
  tone?: DashboardNavTone;
};

export type DashboardNavTone = "default" | "import" | "export";

export type DashboardUser = {
  name?: string;
  email?: string;
  role?: string;
  can_view_admin_sellers?: boolean;
  can_impersonate_sellers?: boolean;
  can_grant_admin_permissions?: boolean;
};

function readString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function readBooleanFlag(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function parseDashboardUser(raw: string | null | undefined): DashboardUser | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    return {
      name: readString(candidate.name),
      email: readString(candidate.email),
      role: readString(candidate.role),
      can_view_admin_sellers: readBooleanFlag(candidate.can_view_admin_sellers),
      can_impersonate_sellers: readBooleanFlag(candidate.can_impersonate_sellers),
      can_grant_admin_permissions: readBooleanFlag(candidate.can_grant_admin_permissions),
    };
  } catch {
    return null;
  }
}

export function canViewAdminSellers(user?: DashboardUser | null) {
  const role = user?.role?.toLowerCase();
  return Boolean(user?.can_view_admin_sellers && (role === "admin" || role === "owner"));
}

export function getDashboardNavItems(labels: DashboardNavLabels, user?: DashboardUser | null): DashboardNavItem[] {
  const items: DashboardNavItem[] = [
    { href: "/dashboard", label: labels.dashboard, exact: true, icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/dashboard/products", label: labels.products, exact: false, icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
    { href: "/dashboard/imports", label: labels.imports, exact: false, icon: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", tone: "import" },
    { href: "/dashboard/export-api", label: labels.exportApi, exact: false, icon: "M5 7h14M5 12h14M5 17h14", tone: "export" },
    { href: "/dashboard/billing", label: labels.billing, exact: false, icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { href: "/dashboard/settings", label: labels.settings, exact: false, icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  if (canViewAdminSellers(user)) {
    items.splice(4, 0, {
      href: "/dashboard/admin/sellers",
      label: labels.sellers,
      exact: false,
      icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    });
  }

  return items;
}

export function getDashboardNavItemClass(active: boolean, tone: DashboardNavTone = "default") {
  const base = "flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium cursor-pointer transition-all";

  if (active) {
    if (tone === "import") {
      return `${base} bg-sky-500 text-white shadow-sm shadow-sky-950/30 ring-1 ring-sky-200/30`;
    }
    if (tone === "export") {
      return `${base} bg-violet-500 text-white shadow-sm shadow-violet-950/30 ring-1 ring-violet-200/30`;
    }
    return `${base} bg-green-500 text-white shadow-sm shadow-green-900/30`;
  }

  if (tone === "import") {
    return `${base} text-sky-200 ring-1 ring-sky-400/10 hover:bg-sky-500/15 hover:text-white hover:ring-sky-300/30`;
  }
  if (tone === "export") {
    return `${base} text-violet-200 ring-1 ring-violet-400/10 hover:bg-violet-500/15 hover:text-white hover:ring-violet-300/30`;
  }
  return `${base} text-slate-300 hover:bg-white/10 hover:text-white`;
}
