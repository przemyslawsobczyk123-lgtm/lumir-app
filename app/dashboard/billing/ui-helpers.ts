type Lang = "pl" | "en";
type BillingHistorySource = "history" | "usage" | "unavailable";

type Meta = {
  label: string;
  className: string;
};

const SOURCE_META: Record<Lang, Record<BillingHistorySource, Meta>> = {
  pl: {
    history: { label: "Historia billing", className: "bg-emerald-100 text-emerald-700" },
    usage: { label: "Fallback z usage", className: "bg-amber-100 text-amber-700" },
    unavailable: { label: "Brak zrodla", className: "bg-slate-200 text-slate-600" },
  },
  en: {
    history: { label: "Billing history", className: "bg-emerald-100 text-emerald-700" },
    usage: { label: "Usage fallback", className: "bg-amber-100 text-amber-700" },
    unavailable: { label: "Unavailable", className: "bg-slate-200 text-slate-600" },
  },
};

const STATUS_META: Record<Lang, Record<string, Meta>> = {
  pl: {
    paid: { label: "Oplacone", className: "bg-emerald-100 text-emerald-700" },
    granted: { label: "Przyznane", className: "bg-sky-100 text-sky-700" },
    pending: { label: "Oczekuje", className: "bg-amber-100 text-amber-700" },
    failed: { label: "Blad", className: "bg-rose-100 text-rose-700" },
    expired: { label: "Wygaslo", className: "bg-slate-200 text-slate-700" },
  },
  en: {
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
    granted: { label: "Granted", className: "bg-sky-100 text-sky-700" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
    failed: { label: "Failed", className: "bg-rose-100 text-rose-700" },
    expired: { label: "Expired", className: "bg-slate-200 text-slate-700" },
  },
};

export function getBillingHistorySourceMeta(source: BillingHistorySource, lang: Lang): Meta {
  return SOURCE_META[lang][source] ?? SOURCE_META[lang].unavailable;
}

export function getBillingHistoryStatusMeta(status: string, lang: Lang): Meta {
  const normalized = status.trim().toLowerCase();
  return STATUS_META[lang][normalized] ?? {
    label: normalized ? normalized.toUpperCase() : (lang === "pl" ? "BRAK" : "UNKNOWN"),
    className: "bg-slate-200 text-slate-600",
  };
}
