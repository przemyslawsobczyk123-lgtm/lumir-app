"use client";

import { useEffect, useState } from "react";
import {
  createBillingCheckout,
  fetchBillingHistory,
  fetchBillingSummary,
  formatCredits,
  formatDateTime,
  formatPricePln,
  formatUnitPricePln,
  type BillingHistoryEntry,
  type BillingHistoryResult,
  type BillingPack,
  type BillingSummary,
} from "./billing-data";

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl p-5 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)" }}>{label}</div>
      <div className="mt-3 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{value}</div>
      <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{hint}</div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--accent-primary)" }}>{eyebrow}</div>
      <h2 className="text-2xl font-semibold" style={{ color: "var(--text-heading)" }}>{title}</h2>
      <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{description}</p>
    </div>
  );
}

function PackCard({
  pack,
  loading,
  onBuy,
}: {
  pack: BillingPack;
  loading: boolean;
  onBuy: (credits: number) => void;
}) {
  const fullAuctions = Math.floor(pack.credits);
  const descriptions = Math.floor(pack.credits / 0.33);
  const attributes = Math.floor(pack.credits / 0.67);

  // Savings logic: base price = 5,5 zł/aukcja = 550 groszy
  const fullPriceCents = pack.credits * 550;
  const savingsCents = fullPriceCents - pack.amountCents;
  const savingsPct = Math.round((savingsCents / fullPriceCents) * 100);
  const hasSavings = savingsPct > 0;

  return (
    <div
      className={`rounded-3xl p-5 transition ${pack.featured ? "shadow-[0_0_0_2px_rgba(99,102,241,0.3)]" : ""}`}
      style={{
        background: pack.featured
          ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))"
          : "var(--bg-card)",
        border: pack.featured ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)" }}>Pakiet</div>
          <div className="mt-1 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(pack.credits)}</div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>kredytów / pełnych aukcji</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--bg-input-alt)", color: "var(--text-secondary)" }}>
            {pack.featured ? "Popularny" : "Prepaid"}
          </span>
          {hasSavings && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={pack.featured ? {
                background: "rgba(16,185,129,0.2)",
                color: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.25)",
              } : {
                background: "rgba(16,185,129,0.12)",
                color: "#059669",
              }}
            >
              –{savingsPct}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>Cena</div>
        {hasSavings && (
          <div className="mt-2 text-sm line-through opacity-50" style={{ color: "var(--text-tertiary)" }}>
            {formatPricePln(fullPriceCents)}
          </div>
        )}
        <div className={`font-semibold text-3xl ${hasSavings ? "mt-0.5" : "mt-2"}`} style={{ color: "var(--text-heading)" }}>{formatPricePln(pack.amountCents)}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{formatUnitPricePln(pack.pricePerAuction)} / aukcja</div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Pełna aukcja AI</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{fullAuctions}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Same opisy</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(descriptions)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "var(--bg-input-alt)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Same atrybuty</span>
          <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(attributes)}</span>
        </div>
      </div>

      <button
        onClick={() => onBuy(pack.credits)}
        aria-disabled={loading}
        className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          loading
            ? "cursor-wait opacity-60"
            : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/20"
        }`}
        style={loading ? { background: "var(--bg-input-alt)", color: "var(--text-tertiary)" } : {}}
      >
        {loading ? "Przekierowanie..." : "Kup w Stripe"}
      </button>
    </div>
  );
}

function HistoryRow({ item }: { item: BillingHistoryEntry }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border-default)" }}>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{formatDateTime(item.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</div>
        <div className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>{item.description || item.kind}</div>
      </td>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>{formatCredits(item.credits)}</td>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>
        {item.amount == null ? "Brak" : formatPricePln(item.amount)}
      </td>
      <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>{item.status}</td>
    </tr>
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [history, setHistory] = useState<BillingHistoryResult>({ items: [], source: "unavailable" });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoadingCredits, setCheckoutLoadingCredits] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setHistoryLoading(true);
      setError("");

      try {
        const [summary, ledger] = await Promise.all([
          fetchBillingSummary(),
          fetchBillingHistory(),
        ]);

        if (controller.signal.aborted) return;
        setBilling(summary);
        setHistory(ledger);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err, "Nie udalo sie pobrac billing"));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const currentCredits = billing?.current?.creditBalance ?? billing?.usage.remaining ?? 0;
  const totalGranted = billing?.usage.limit ?? 0;
  const totalUsed = billing?.usage.used ?? 0;
  const starterCredits = billing?.starterCredits ?? 3;

  const startCheckout = async (packCredits: number) => {
    if (checkoutLoadingCredits) return;
    setCheckoutLoadingCredits(packCredits);
    setError("");

    try {
      const session = await createBillingCheckout(packCredits);
      if (session?.url) {
        window.location.href = session.url;
        return;
      }
      throw new Error("Brak URL checkout");
    } catch (err) {
      setError(getErrorMessage(err, "Nie udalo sie otworzyc checkout Stripe"));
    } finally {
      setCheckoutLoadingCredits(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.24),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.96))] p-6 shadow-2xl shadow-indigo-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Billing
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Kredyty, pakiety, platnosci</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Prepaid MVP. User widzi saldo, darmowe 3 kredyty, pakiety Stripe, koszt AI per akcja, historie platnosci.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Aktualne saldo</div>
              <div className="mt-2 text-4xl font-semibold text-white">{formatCredits(currentCredits)}</div>
              <div className="mt-1 text-sm text-slate-400">kredytow dostepnych teraz</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Starter</div>
              <div className="mt-2 text-4xl font-semibold text-white">{formatCredits(starterCredits)}</div>
              <div className="mt-1 text-sm text-slate-400">darmowe kredyty po starcie konta</div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          <div className="font-semibold">Billing load failed</div>
          <div className="mt-1 text-rose-200/80">{error}</div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Saldo"
          value={`${formatCredits(currentCredits)} kred.`}
          hint="To mozesz wydac od razu na generacje AI."
        />
        <MetricCard
          label="Kupione"
          value={`${formatCredits(billing?.current?.paidCreditsGranted ?? 0)} kred.`}
          hint="Suma wszystkich kupionych pakietow."
        />
        <MetricCard
          label="Zuzyte"
          value={`${formatCredits(totalUsed)} kred.`}
          hint="Laczne zuzycie usera do teraz."
        />
        <MetricCard
          label="Starter free"
          value={`${formatCredits(billing?.current?.freeCreditsGranted ?? starterCredits)} kred.`}
          hint="Jednorazowy bonus startowy dla nowego konta."
        />
      </section>

      <section className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <SectionTitle
          eyebrow="Za co placisz"
          title="Koszt akcji AI"
          description="Jedna pelna aukcja AI to 1 kredyt. Opisy i atrybuty licza sie osobno, wiec user widzi realny koszt kazdej akcji."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Opis produktu", value: billing ? formatCredits(billing.aiCosts.description) : "0,33", hint: "Generacja opisu per marketplace i opis produktu." },
            { label: "Atrybuty kategorii", value: billing ? formatCredits(billing.aiCosts.attributes) : "0,67", hint: "Mapowanie atrybutów pod marketplace i kategorię." },
            { label: "Pełna aukcja AI", value: billing ? formatCredits(billing.aiCosts.all) : "1,00", hint: "Opis + atrybuty + draft marketplace razem." },
          ].map(({ label, value, hint }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
              <div className="mt-3 text-4xl font-semibold" style={{ color: "var(--accent-primary)" }}>{value}</div>
              <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{hint}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl p-5 text-sm" style={{ background: "var(--accent-primary-light)", border: "1px solid var(--accent-primary-border)", color: "var(--accent-primary)" }}>
          Bulk mnoży koszt przez liczbę produktów. Przykład: 10 pełnych aukcji = 10 kredytów.
        </div>
      </section>

      <section className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <SectionTitle
          eyebrow="Pakiety"
          title="Kup kredyty Stripe"
          description="Pakiety maleja z cena za aukcje od 5,5 zl do 2,4 zl. Checkout otwiera Stripe i po platnosci doladowuje saldo usera."
        />

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(billing?.packs || []).map((pack) => (
              <PackCard
                key={pack.code}
                pack={pack}
                loading={checkoutLoadingCredits === pack.credits}
                onBuy={startCheckout}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <SectionTitle
            eyebrow="Stan konta"
            title="Saldo i historia zuzycia"
            description="Latwo dostepne info: ile kredytow user dostal, kupil, zuzyl i kiedy byla ostatnia platnosc."
          />

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl px-4 py-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>Łącznie przyznane</div>
              <div className="mt-2 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{formatCredits(totalGranted)} kred.</div>
            </div>
            <div className="rounded-2xl px-4 py-4" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)" }}>
              <div className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>Ostatnia płatność</div>
              <div className="mt-2 text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
                {formatDateTime(billing?.current?.lastPaymentAt)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Free starter", val: formatCredits(billing?.current?.freeCreditsGranted ?? 0) },
                { label: "Kupione", val: formatCredits(billing?.current?.paidCreditsGranted ?? 0) },
                { label: "Zużyte", val: formatCredits(totalUsed) },
                { label: "Dostępne", val: formatCredits(currentCredits) },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl px-3 py-3 text-sm" style={{ background: "var(--bg-input-alt)", color: "var(--text-secondary)" }}>
                  {label}: <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] p-6 shadow-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <SectionTitle
            eyebrow="Platnosci"
            title="Historia usera"
            description="Kazdy user widzi swoje top-upy, darmowy starter i status platnosci. Dane leca z /api/billing/history."
          />

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--bg-input-alt)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}>
            <span>Źródło</span>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--bg-card-hover)", color: "var(--text-primary)" }}>{history.source}</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border-default)" }}>
            <table className="min-w-full" style={{ borderCollapse: "collapse" }}>
              <thead className="text-left text-xs uppercase tracking-[0.22em]" style={{ background: "var(--bg-table-header)", color: "var(--text-secondary)" }}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Pozycja</th>
                  <th className="px-4 py-3 font-semibold">Kredyty</th>
                  <th className="px-4 py-3 font-semibold">Kwota</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm" style={{ color: "var(--text-tertiary)" }} colSpan={5}>
                      Ładowanie historii...
                    </td>
                  </tr>
                ) : history.items.length ? (
                  history.items.map((item) => <HistoryRow key={item.id} item={item} />)
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm" style={{ color: "var(--text-tertiary)" }} colSpan={5}>
                      Brak historii płatności.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
