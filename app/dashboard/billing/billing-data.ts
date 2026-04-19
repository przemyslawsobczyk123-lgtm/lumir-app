"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const BILLING_PACK_SIZES = [50, 100, 150, 200, 300, 500, 750, 1000] as const;

export type BillingPack = {
  code: string;
  label: string;
  credits: number;
  pricePerAuction: number;
  amountCents: number;
  featured?: boolean;
  description?: string;
};

export type BillingCurrent = {
  sellerId: number;
  creditBalance: number;
  creditsRemaining: number;
  freeCreditsGranted: number;
  paidCreditsGranted: number;
  lifetimeCreditsPurchased: number;
  lifetimeCreditsUsed: number;
  billingMode: string;
  stripeCustomerId: string | null;
  lastCheckoutSessionId?: string | null;
  lastPaymentAt: string | null;
};

export type BillingSummary = {
  current: BillingCurrent | null;
  usage: { limit: number; used: number; remaining: number };
  packs: BillingPack[];
  aiCosts: { description: number; attributes: number; all: number };
  starterCredits: number;
};

export type BillingHistoryEntry = {
  id: string;
  createdAt: string | null;
  kind: string;
  title: string;
  description: string;
  credits: number;
  amount: number | null;
  currency: string | null;
  status: string;
  source: string;
  mode: string;
  packCredits?: number | null;
  stripeSessionId?: string | null;
  externalId?: string | null;
};

export type BillingHistoryResult = {
  items: BillingHistoryEntry[];
  source: "history" | "usage" | "unavailable";
};

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}

export function authHeaders(json = true) {
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export function formatCredits(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pl-PL");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Brak";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Brak";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(value: string | null | undefined) {
  if (!value) return "Brak";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Brak";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatPricePln(priceMonthly: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(priceMonthly / 100);
}

export function formatUnitPricePln(amount: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(amount);
}

function getNestedData(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return payload;
  const candidate = payload as { data?: unknown; items?: unknown; rows?: unknown; events?: unknown };
  if (candidate.data !== undefined) {
    const data = candidate.data;
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data !== null) {
      const nested = data as { items?: unknown; rows?: unknown; events?: unknown };
      if (Array.isArray(nested.items)) return nested.items;
      if (Array.isArray(nested.rows)) return nested.rows;
      if (Array.isArray(nested.events)) return nested.events;
    }
    return data;
  }
  if (candidate.items !== undefined) return candidate.items;
  if (candidate.rows !== undefined) return candidate.rows;
  if (candidate.events !== undefined) return candidate.events;
  return payload;
}

function normalizeHistoryEntry(raw: unknown, index: number): BillingHistoryEntry {
  const candidate = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const credits = Number(
    candidate.credits
      ?? candidate.creditCount
      ?? candidate.amountCredits
      ?? candidate.creditsAdded
      ?? candidate.credits_added
      ?? 0
  ) || 0;
  const amount = candidate.amountCents ?? candidate.amount_cents ?? candidate.amount;
  const parsedAmount = amount == null ? null : Number(amount);

  return {
    id: String(candidate.id ?? candidate.eventId ?? candidate.invoiceId ?? index),
    createdAt: typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : typeof candidate.created_at === "string"
        ? candidate.created_at
        : typeof candidate.date === "string"
          ? candidate.date
          : null,
    kind: String(candidate.kind ?? candidate.type ?? candidate.source ?? "entry"),
    title: String(candidate.title ?? candidate.label ?? candidate.name ?? candidate.kind ?? "Pozycja"),
    description: String(candidate.description ?? candidate.note ?? candidate.summary ?? candidate.mode ?? ""),
    credits,
    amount: Number.isFinite(parsedAmount as number) ? (parsedAmount as number) : null,
    currency: typeof candidate.currency === "string" ? candidate.currency : null,
    status: String(candidate.status ?? "ok"),
    source: String(candidate.source ?? candidate.kind ?? "billing"),
    mode: String(candidate.mode ?? ""),
    packCredits: candidate.packCredits == null ? null : Number(candidate.packCredits),
    stripeSessionId: typeof candidate.stripeSessionId === "string"
      ? candidate.stripeSessionId
      : typeof candidate.stripe_session_id === "string"
        ? candidate.stripe_session_id
        : null,
    externalId: typeof candidate.externalId === "string"
      ? candidate.externalId
      : typeof candidate.external_id === "string"
        ? candidate.external_id
        : null,
  };
}

async function parseErrorResponse(res: Response, fallback: string) {
  try {
    const payload: unknown = await res.json();
    if (typeof payload === "object" && payload !== null && "error" in payload) {
      const error = (payload as { error?: unknown }).error;
      if (typeof error === "string" && error) return error;
    }
  } catch {}
  return fallback;
}

export async function fetchBillingSummary(): Promise<BillingSummary> {
  const res = await fetch(`${API}/api/billing/summary`, { headers: authHeaders(false) });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : "Nie udalo sie pobrac billing summary";
    throw new Error(message);
  }
  return (json as { data?: BillingSummary })?.data || (json as BillingSummary);
}

export async function createBillingCheckout(packCredits: number) {
  const res = await fetch(`${API}/api/billing/checkout`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ packCredits }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : "Nie udalo sie utworzyc checkout";
    throw new Error(message);
  }
  return (json as { data?: { id?: string; url?: string } })?.data || null;
}

export async function fetchBillingHistory(): Promise<BillingHistoryResult> {
  const endpoints = [
    { path: "/api/billing/history", source: "history" as const },
    { path: "/api/billing/usage", source: "usage" as const },
  ];

  for (const endpoint of endpoints) {
    const res = await fetch(`${API}${endpoint.path}`, { headers: authHeaders(false) });
    if (res.status === 404) continue;

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      if (endpoint.source === "usage") {
        continue;
      }
      throw new Error(await parseErrorResponse(res, "Nie udalo sie pobrac historii platnosci"));
    }

    const rawList = getNestedData(json);
    const list = Array.isArray(rawList) ? rawList : [];
    return {
      items: list.map((entry, index) => normalizeHistoryEntry(entry, index)),
      source: endpoint.source,
    };
  }

  return { items: [], source: "unavailable" };
}
