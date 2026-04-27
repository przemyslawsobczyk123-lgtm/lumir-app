"use client";

import Link from "next/link";
import {
  getAllegroUpdateModeSummary,
  type AllegroOfferUpdatePreview,
} from "./allegro-export-helpers";

type AllegroAccountOption = {
  id: number;
  environment: string;
  allegro_login?: string | null;
  status?: string | null;
};

type AllegroOfferOption = {
  id: string;
  name: string;
};

type HistoryRow = {
  id: number;
  mode: string;
  status: string;
  createdAt?: string | null;
};

type FieldKey = "title" | "description" | "price" | "stock";

const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Tytul",
  description: "Opis",
  price: "Cena",
  stock: "Stock",
};

export function AllegroOfferUpdateCard({
  accounts,
  offers,
  selectedAccountId,
  selectedOfferId,
  fields,
  preview,
  history,
  loadingOffers,
  previewBusy,
  publishBusy,
  publishEnabled,
  publishGateReason,
  confirmNeedsReview,
  exportApiHref,
  onSelectAccount,
  onSelectOffer,
  onToggleField,
  onToggleConfirmNeedsReview,
  onPreview,
  onPublish,
}: {
  accounts: AllegroAccountOption[];
  offers: AllegroOfferOption[];
  selectedAccountId: number | null;
  selectedOfferId: string;
  fields: Record<FieldKey, boolean>;
  preview: AllegroOfferUpdatePreview | null;
  history: HistoryRow[];
  loadingOffers: boolean;
  previewBusy: boolean;
  publishBusy: boolean;
  publishEnabled: boolean;
  publishGateReason?: string | null;
  confirmNeedsReview: boolean;
  exportApiHref: string;
  onSelectAccount: (accountId: number | null) => void;
  onSelectOffer: (offerId: string) => void;
  onToggleField: (field: FieldKey) => void;
  onToggleConfirmNeedsReview: (checked: boolean) => void;
  onPreview: () => void | Promise<void>;
  onPublish: () => void | Promise<void>;
}) {
  const hasAccounts = accounts.length > 0;
  const canPreview = hasAccounts && !!selectedAccountId && !!selectedOfferId;
  const canPublish = publishEnabled && hasAccounts && !!preview?.publishEligible && (!preview.requiresReviewConfirmation || confirmNeedsReview);
  const showNoOffersHint = hasAccounts && !!selectedAccountId && !loadingOffers && offers.length === 0;
  const modeSummary = getAllegroUpdateModeSummary(publishEnabled);
  const previewLabel = previewBusy ? "Ladowanie preview..." : "Preview zmian";
  const publishLabel = publishEnabled
    ? (publishBusy ? "Publikowanie..." : "Publikuj do Allegro")
    : "Publikacja tymczasowo wylaczona";

  return (
    <div
      className="rounded-2xl border p-5 space-y-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">Allegro preview</h3>
          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
            existing offer update
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${modeSummary.tone === "ready" ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" : "border-amber-300/30 bg-amber-500/10 text-amber-100"}`}
          >
            {modeSummary.label}
          </span>
        </div>
        <p className="text-sm text-slate-300">
          Detail page zostaje do podgladu oferty. Export i batch publish sa teraz w Export.
        </p>
        <p className={`text-xs ${modeSummary.tone === "ready" ? "text-emerald-200/90" : "text-amber-100/80"}`}>
          {modeSummary.detail}
        </p>
      </div>

      {!hasAccounts ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Brak podlaczonego konta Allegro.</div>
          <p className="mt-2 text-amber-100/80">
            Dla MVP najpierw polacz konto, potem wybierz istniejaca oferte i uruchom preview.
          </p>
          <Link
            href="/dashboard/allegro/accounts"
            className="mt-3 inline-flex rounded-xl border border-amber-200/30 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/15"
          >
            Polacz konto Allegro
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Konto Allegro
              </div>
              <select
                value={selectedAccountId ?? ""}
                onChange={(event) => onSelectAccount(event.target.value ? Number(event.target.value) : null)}
                className="w-full rounded-xl border px-3 py-3 text-sm text-white outline-none"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              >
                <option value="">Wybierz konto</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.allegro_login || "Konto Allegro"} ({account.environment},{" "}
                    {account.status || "unknown"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Oferta
                </div>
                {loadingOffers ? <span className="text-[11px] text-slate-500">Ladowanie ofert...</span> : null}
              </div>
              <div className="space-y-2">
                <select
                  value={selectedOfferId}
                  onChange={(event) => onSelectOffer(event.target.value)}
                  className="w-full rounded-xl border px-3 py-3 text-sm text-white outline-none"
                  style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
                >
                  <option value="">Wybierz oferte z listy</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>
                <input
                  value={selectedOfferId}
                  onChange={(event) => onSelectOffer(event.target.value)}
                  placeholder="Lub wpisz recznie offerId"
                  className="w-full rounded-xl border px-3 py-3 text-sm text-white outline-none"
                  style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
                />
              </div>
            </div>
          </div>

          {showNoOffersHint ? (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Wybrane konto nie zwrocilo ofert. Uzyj konta z istniejaca oferta albo wpisz recznie
              offerId.
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Allowlista pol
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) => {
                const active = fields[field];
                return (
                  <button
                    key={field}
                    onClick={() => onToggleField(field)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${active ? "border-indigo-300 bg-indigo-500/15 text-indigo-100" : "border-white/10 bg-white/5 text-slate-300"}`}
                  >
                    {FIELD_LABELS[field]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={exportApiHref}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Otworz Export
            </Link>
            <button
              onClick={() => {
                if (canPreview && !previewBusy) void onPreview();
              }}
              aria-disabled={!canPreview || previewBusy}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${canPreview && !previewBusy ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white hover:scale-[1.02]" : "bg-slate-700 text-slate-400"}`}
            >
              {previewLabel}
            </button>
            <button
              onClick={() => {
                if (publishEnabled && canPublish && !publishBusy) void onPublish();
              }}
              aria-disabled={!canPublish || publishBusy}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${canPublish && !publishBusy ? "bg-gradient-to-r from-emerald-500 to-cyan-400 text-white hover:scale-[1.02]" : "bg-slate-700 text-slate-400"}`}
            >
              {publishLabel}
            </button>
          </div>

          {!publishEnabled && publishGateReason ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {publishGateReason}
            </div>
          ) : null}

          {preview?.requiresReviewConfirmation ? (
            <label className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <input
                type="checkbox"
                checked={confirmNeedsReview}
                onChange={(event) => onToggleConfirmNeedsReview(event.target.checked)}
              />
              <span>Potwierdzam publish mimo statusu needs_review</span>
            </label>
          ) : null}

          {preview ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div
                className="rounded-2xl border p-4 space-y-3"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Diff preview
                </div>
                {preview.diffRows.length > 0 ? (
                  preview.diffRows.map((row) => (
                    <div key={row.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          {FIELD_LABELS[row.key as FieldKey] || row.key}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          {row.source}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            Aktualnie
                          </div>
                          <div className="mt-1 rounded-lg border border-white/5 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                            {String(row.currentValue ?? "-")}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            Po zmianie
                          </div>
                          <div className="mt-1 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
                            {String(row.nextValue ?? "-")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">Brak roznic do publikacji.</div>
                )}
              </div>

              <div className="space-y-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Warnings
                  </div>
                  <div className="mt-3 space-y-2">
                    {preview.warnings.length > 0 ? (
                      preview.warnings.map((warning) => (
                        <div
                          key={warning}
                          className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                        >
                          {warning}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                        Brak ostrzezen dla obecnego preview.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Historia prob
                  </div>
                  <div className="mt-3 space-y-2">
                    {history.length > 0 ? (
                      history.map((row) => (
                        <div
                          key={row.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
                        >
                          #{row.id} - {row.mode} - {row.status}
                          {row.createdAt ? (
                            <span className="text-slate-500">
                              {" "}
                              - {new Date(row.createdAt).toLocaleString("pl-PL")}
                            </span>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400">Brak historii update attempts.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
