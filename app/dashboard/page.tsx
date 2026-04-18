"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type DashboardSummary = {
  success: true;
  cards: {
    inProgress: number;
    ready: number;
    exported: number;
    errors: number;
  };
  products: {
    total: number;
    pending: number;
    mapped: number;
    needs_review: number;
    exported: number;
  };
  imports: {
    processing: number;
    done: number;
    error: number;
  };
};

type SummaryCard = {
  key: keyof DashboardSummary["cards"];
  label: string;
  tone: string;
  dot: string;
  hint: string;
};

type StatusRow = {
  label: string;
  count: number;
  tone: string;
  hint: string;
};

const CARD_CONFIG: SummaryCard[] = [
  {
    key: "inProgress",
    label: "W toku",
    tone: "from-sky-500/15 to-sky-500/5 border-sky-400/20",
    dot: "bg-sky-400",
    hint: "Produkty w trakcie przetwarzania AI",
  },
  {
    key: "ready",
    label: "Gotowe",
    tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-400/20",
    dot: "bg-emerald-400",
    hint: "Gotowe do eksportu na marketplace",
  },
  {
    key: "exported",
    label: "Wyeksportowane",
    tone: "from-violet-500/15 to-violet-500/5 border-violet-400/20",
    dot: "bg-violet-400",
    hint: "Wysłane do kanałów sprzedaży",
  },
  {
    key: "errors",
    label: "Błędy",
    tone: "from-rose-500/15 to-rose-500/5 border-rose-400/20",
    dot: "bg-rose-400",
    hint: "Wymagają Twojej uwagi",
  },
];

function getErrorMessage(err: unknown, fallback = "Nie udalo sie pobrac podsumowania") {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

function hasNumberFields(value: unknown, fields: string[]) {
  return (
    typeof value === "object" &&
    value !== null &&
    fields.every((field) => typeof (value as Record<string, unknown>)[field] === "number")
  );
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as {
    success?: unknown;
    cards?: unknown;
    products?: unknown;
    imports?: unknown;
  };

  return (
    candidate.success === true &&
    hasNumberFields(candidate.cards, ["inProgress", "ready", "exported", "errors"]) &&
    hasNumberFields(candidate.products, ["total", "pending", "mapped", "needs_review", "exported"]) &&
    hasNumberFields(candidate.imports, ["processing", "done", "error"])
  );
}

function countLabel(count: number) {
  return `${count.toLocaleString("pl-PL")} ${count === 1 ? "pozycja" : "pozycji"}`;
}

function SummaryStat({
  label,
  count,
  tone,
  hint,
}: StatusRow) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">{hint}</div>
      </div>
      <div className="shrink-0 rounded-lg bg-black/20 px-3 py-1.5 text-sm font-semibold text-white">
        {count}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
      <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-8 w-16 animate-pulse rounded-xl bg-white/10" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      setLoading(true);
      setError("");

      const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
      if (!token) {
        setError("Brak tokenu logowania");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/api/dashboard/summary`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const apiError =
            typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
              ? (json as { error: string }).error
              : "Nie udalo sie pobrac podsumowania";
          throw new Error(apiError);
        }

        if (!isDashboardSummary(json)) {
          throw new Error("Nieprawidlowa odpowiedz serwera");
        }

        setSummary(json);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setSummary(null);
        setError(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSummary();
    return () => controller.abort();
  }, []);

  const cards = summary?.cards ?? null;
  const products = summary?.products ?? null;
  const imports = summary?.imports ?? null;

  const hasNoData =
    !loading &&
    !error &&
    products !== null &&
    imports !== null &&
    products.total === 0 &&
    imports.processing === 0 &&
    imports.done === 0 &&
    imports.error === 0;

  const productRows: StatusRow[] = products
    ? [
        {
          label: "Wszystkie",
          count: products.total,
          tone: "bg-slate-300",
          hint: "Laczna liczba produktow w systemie",
        },
        {
          label: "Oczekujace",
          count: products.pending,
          tone: "bg-sky-400",
          hint: "Jeszcze nieprzypisane do eksportu",
        },
        {
          label: "Zmapowane",
          count: products.mapped,
          tone: "bg-emerald-400",
          hint: "Gotowe do dalszej pracy",
        },
        {
          label: "Do weryfikacji",
          count: products.needs_review,
          tone: "bg-amber-400",
          hint: "Wymagaja sprawdzenia lub poprawy",
        },
        {
          label: "Wyeksportowane",
          count: products.exported,
          tone: "bg-violet-400",
          hint: "Juz wyslane do kanalu sprzedazy",
        },
      ]
    : [];

  const importRows: StatusRow[] = imports
    ? [
        {
          label: "Przetwarzane",
          count: imports.processing,
          tone: "bg-sky-400",
          hint: "Pliki importu jeszcze sie obrabiaja",
        },
        {
          label: "Zakonczone",
          count: imports.done,
          tone: "bg-emerald-400",
          hint: "Importy gotowe i zakonczone",
        },
        {
          label: "Z bledem",
          count: imports.error,
          tone: "bg-rose-400",
          hint: "Importy wymagajace reakcji",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {(loading || (!error && cards !== null)) && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading
            ? CARD_CONFIG.map(card => <SkeletonCard key={card.key} />)
            : CARD_CONFIG.map(card => {
                const value = cards?.[card.key] ?? 0;
                return (
                  <div
                    key={card.key}
                    className={`rounded-2xl border bg-gradient-to-br p-6 shadow-sm backdrop-blur-sm ${card.tone}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-300">{card.label}</div>
                      <span className={`h-2.5 w-2.5 rounded-full ${card.dot}`} />
                    </div>
                    <div className="mt-4 text-3xl font-semibold text-white">
                      {value.toLocaleString("pl-PL")}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {card.hint}
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          <div className="font-semibold">Nie udalo sie pobrac danych</div>
          <div className="mt-1 text-rose-200/80">{error}</div>
        </div>
      ) : hasNoData ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/8 bg-white/5 px-6 py-16 text-center shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M3 7.5 12 3l9 4.5M3 7.5V16.5L12 21l9-4.5V7.5M12 21V12M3 7.5l9 4.5 9-4.5" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-slate-100">Brak danych do pokazania</div>
          <div className="mt-2 max-w-md text-sm text-slate-400">
            Nie ma jeszcze produktow ani importow. Gdy pojawi sie pierwszy import, panel od razu pokaze zywe statystyki.
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/8 bg-white/5 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Produkty</h2>
                <p className="text-sm text-slate-400">Status biezacego katalogu</p>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {countLabel(products?.total ?? 0)}
              </div>
            </div>

            <div className="space-y-3">
              {loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />
                  ))
                : productRows.map(row => <SummaryStat key={row.label} {...row} />)}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/5 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Importy</h2>
                <p className="text-sm text-slate-400">Przeplyw plikow i przetwarzania</p>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {countLabel((imports?.processing ?? 0) + (imports?.done ?? 0) + (imports?.error ?? 0))}
              </div>
            </div>

            <div className="space-y-3">
              {loading
                ? Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />
                  ))
                : importRows.map(row => <SummaryStat key={row.label} {...row} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
