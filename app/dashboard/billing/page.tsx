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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{hint}</div>
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/80">{eyebrow}</div>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
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

  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        pack.featured
          ? "border-indigo-400/40 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pack</div>
          <div className="mt-1 text-3xl font-semibold text-white">{formatCredits(pack.credits)}</div>
          <div className="text-sm text-slate-400">credits / full auctions</div>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {pack.featured ? "Popularny" : "Prepaid"}
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Cena</div>
        <div className="mt-2 text-3xl font-semibold text-white">{formatPricePln(pack.amountCents)}</div>
        <div className="mt-1 text-sm text-slate-400">{formatUnitPricePln(pack.pricePerAuction)} / aukcja</div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-slate-300">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2">
          <span>Pelna aukcja AI</span>
          <span className="font-semibold text-white">{fullAuctions}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2">
          <span>Same opisy</span>
          <span className="font-semibold text-white">{formatCredits(descriptions)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2">
          <span>Same atrybuty</span>
          <span className="font-semibold text-white">{formatCredits(attributes)}</span>
        </div>
      </div>

      <button
        onClick={() => onBuy(pack.credits)}
        aria-disabled={loading}
        className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          loading
            ? "cursor-wait bg-white/10 text-slate-400"
            : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/20"
        }`}
      >
        {loading ? "Przekierowanie..." : "Kup w Stripe"}
      </button>
    </div>
  );
}

function HistoryRow({ item }: { item: BillingHistoryEntry }) {
  return (
    <tr className="border-t border-white/8">
      <td className="px-4 py-4 text-sm text-slate-200">{formatDateTime(item.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="text-sm font-medium text-white">{item.title}</div>
        <div className="mt-0.5 text-xs text-slate-400">{item.description || item.kind}</div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-300">{formatCredits(item.credits)}</td>
      <td className="px-4 py-4 text-sm text-slate-300">
        {item.amount == null ? "Brak" : formatPricePln(item.amount)}
      </td>
      <td className="px-4 py-4 text-sm text-slate-300">{item.status}</td>
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

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
        <SectionTitle
          eyebrow="Za co placisz"
          title="Koszt akcji AI"
          description="Jedna pelna aukcja AI to 1 kredyt. Opisy i atrybuty licza sie osobno, wiec user widzi realny koszt kazdej akcji."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white">Opis produktu</div>
            <div className="mt-3 text-4xl font-semibold text-indigo-300">
              {billing ? formatCredits(billing.aiCosts.description) : "0,33"}
            </div>
            <div className="mt-2 text-sm text-slate-400">Generacja opisu per marketplace i opis produktu.</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white">Atrybuty kategorii</div>
            <div className="mt-3 text-4xl font-semibold text-indigo-300">
              {billing ? formatCredits(billing.aiCosts.attributes) : "0,67"}
            </div>
            <div className="mt-2 text-sm text-slate-400">Mapowanie atrybutow pod marketplace i kategorie.</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white">Pelna aukcja AI</div>
            <div className="mt-3 text-4xl font-semibold text-indigo-300">
              {billing ? formatCredits(billing.aiCosts.all) : "1,00"}
            </div>
            <div className="mt-2 text-sm text-slate-400">Opis + atrybuty + draft marketplace razem.</div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-5 text-sm text-indigo-100">
          Bulk mnozy koszt przez liczbe produktow. Przykład: 10 pelnych aukcji = 10 kredytow.
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
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
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
          <SectionTitle
            eyebrow="Stan konta"
            title="Saldo i historia zuzycia"
            description="Latwo dostepne info: ile kredytow user dostal, kupil, zuzyl i kiedy byla ostatnia platnosc."
          />

          <div className="mt-6 space-y-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Lacznie przyznane</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatCredits(totalGranted)} kred.</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ostatnia platnosc</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatDateTime(billing?.current?.lastPaymentAt)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-slate-300">
                Free starter: <span className="text-white">{formatCredits(billing?.current?.freeCreditsGranted ?? 0)}</span>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-slate-300">
                Kupione: <span className="text-white">{formatCredits(billing?.current?.paidCreditsGranted ?? 0)}</span>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-slate-300">
                Zuzyte: <span className="text-white">{formatCredits(totalUsed)}</span>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-3 text-sm text-slate-300">
                Dostepne: <span className="text-white">{formatCredits(currentCredits)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
          <SectionTitle
            eyebrow="Platnosci"
            title="Historia usera"
            description="Kazdy user widzi swoje top-upy, darmowy starter i status platnosci. Dane leca z /api/billing/history."
          />

          <div className="mt-6 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            <span>Zrodlo</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">{history.source}</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.22em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Pozycja</th>
                  <th className="px-4 py-3 font-semibold">Kredyty</th>
                  <th className="px-4 py-3 font-semibold">Kwota</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-black/10">
                {historyLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      Ladowanie historii...
                    </td>
                  </tr>
                ) : history.items.length ? (
                  history.items.map((item) => <HistoryRow key={item.id} item={item} />)
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-400" colSpan={5}>
                      Brak historii platnosci jeszcze.
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
