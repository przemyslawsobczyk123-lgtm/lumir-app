"use client";

import Link from "next/link";
import type {
  AmazonProductTypeDefinition,
  AmazonValidationPreview,
} from "./amazon-foundation-helpers";

type AmazonAccountOption = {
  id: number;
  seller_name?: string | null;
  marketplace_id?: string | null;
  marketplace_country_code?: string | null;
  status?: string | null;
};

type Suggestion = {
  productType: string;
  displayName?: string;
};

function formatTimestamp(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: string) {
  if (status === "ready_later") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  }
  if (status === "error") {
    return "border-amber-300/30 bg-amber-500/10 text-amber-100";
  }
  return "border-rose-300/30 bg-rose-500/10 text-rose-100";
}

export function AmazonFoundationCard({
  accounts,
  selectedAccountId,
  selectedMarketplaceId,
  selectedProductType,
  suggestions,
  definition,
  history,
  preview,
  suggestBusy,
  definitionBusy,
  historyBusy,
  previewBusy,
  onSelectAccount,
  onSelectMarketplace,
  onSelectProductType,
  onSuggest,
  onPreview,
  onReloadLatest,
}: {
  accounts: AmazonAccountOption[];
  selectedAccountId: number | null;
  selectedMarketplaceId: string;
  selectedProductType: string;
  suggestions: Suggestion[];
  definition: AmazonProductTypeDefinition | null;
  history: AmazonValidationPreview[];
  preview: AmazonValidationPreview | null;
  suggestBusy: boolean;
  definitionBusy: boolean;
  historyBusy: boolean;
  previewBusy: boolean;
  onSelectAccount: (accountId: number | null) => void;
  onSelectMarketplace: (marketplaceId: string) => void;
  onSelectProductType: (productType: string) => void;
  onSuggest: () => void | Promise<void>;
  onPreview: () => void | Promise<void>;
  onReloadLatest: () => void | Promise<void>;
}) {
  const hasAccounts = accounts.length > 0;
  const canRun = hasAccounts && !!selectedAccountId && !!selectedMarketplaceId && !!selectedProductType;
  const groupedFields = new Set(
    (preview?.propertyGroups || []).flatMap((group) => group.propertyNames)
  );
  const standaloneRequiredFields = (preview?.requiredFields || []).filter(
    (field) => !groupedFields.has(field)
  );
  const latestSnapshot = history[0] || preview;

  return (
    <div
      className="rounded-2xl border p-5 space-y-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-white">Amazon foundation</h3>
          <span className="rounded-full border border-orange-300/30 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">
            validation only
          </span>
        </div>
        <p className="text-sm text-slate-300">
          Suggest product type, pobierz definicje, uruchom walidacje i sledz snapshoty. Bez
          publish buttona.
        </p>
      </div>

      {!hasAccounts ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Brak podlaczonego konta Amazon Seller Central.</div>
          <p className="mt-2 text-amber-100/80">
            Buyer account nie wystarczy. Dla MVP podlacz konto seller, potem uruchom validation
            only.
          </p>
          <Link
            href="/dashboard/marketplace/amazon"
            className="mt-3 inline-flex rounded-xl border border-amber-200/30 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/15"
          >
            Polacz konto Amazon
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Konto Amazon
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
                    {account.seller_name || "Amazon"} ({account.marketplace_country_code || "-"},{" "}
                    {account.status || "unknown"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Marketplace
              </div>
              <input
                value={selectedMarketplaceId}
                onChange={(event) => onSelectMarketplace(event.target.value)}
                placeholder="A1C3SOZRARQ6R3"
                className="w-full rounded-xl border px-3 py-3 text-sm text-white outline-none"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Product type
              </div>
              <select
                value={selectedProductType}
                onChange={(event) => onSelectProductType(event.target.value)}
                className="w-full rounded-xl border px-3 py-3 text-sm text-white outline-none"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              >
                <option value="">Wybierz typ produktu</option>
                {suggestions.map((entry) => (
                  <option key={entry.productType} value={entry.productType}>
                    {entry.displayName || entry.productType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (selectedAccountId && selectedMarketplaceId && !suggestBusy) void onSuggest();
              }}
              aria-disabled={!selectedAccountId || !selectedMarketplaceId || suggestBusy}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${selectedAccountId && selectedMarketplaceId && !suggestBusy ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white hover:scale-[1.02]" : "bg-slate-700 text-slate-400"}`}
            >
              {suggestBusy ? "Szukam product type..." : "Zasugeruj product type"}
            </button>
            <button
              onClick={() => {
                if (canRun && !previewBusy) void onPreview();
              }}
              aria-disabled={!canRun || previewBusy}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${canRun && !previewBusy ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-[1.02]" : "bg-slate-700 text-slate-400"}`}
            >
              {previewBusy ? "Walidacja..." : "Uruchom walidacje"}
            </button>
            <button
              onClick={() => {
                if (selectedAccountId && selectedMarketplaceId) void onReloadLatest();
              }}
              aria-disabled={!selectedAccountId || !selectedMarketplaceId}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${selectedAccountId && selectedMarketplaceId ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-700 text-slate-400"}`}
            >
              Ostatni snapshot
            </button>
          </div>

          {latestSnapshot || historyBusy ? (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Latest status
                </div>
                {historyBusy ? (
                  <div className="text-xs text-slate-500">Odswiezam historie...</div>
                ) : latestSnapshot ? (
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClasses(latestSnapshot.status)}`}
                  >
                    {latestSnapshot.status}
                  </span>
                ) : null}
              </div>

              {latestSnapshot ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Snapshot</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      #{latestSnapshot.snapshotId || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Product type
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {latestSnapshot.productType || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Schema</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {latestSnapshot.schemaVersion || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Issues</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {latestSnapshot.issues.length}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                  Brak zapisanych snapshotow dla tego marketplace.
                </div>
              )}

              {latestSnapshot ? (
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Marketplace: {latestSnapshot.marketplaceId || "-"}
                  </span>
                  {latestSnapshot.marketplaceCode ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      Code: {latestSnapshot.marketplaceCode}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Updated: {formatTimestamp(latestSnapshot.updatedAt || latestSnapshot.createdAt)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <div
              className="rounded-2xl border p-4"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Sugestie product type
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((entry) => (
                  <button
                    key={entry.productType}
                    onClick={() => onSelectProductType(entry.productType)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold ${selectedProductType === entry.productType ? "border-cyan-300 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"}`}
                  >
                    {entry.displayName || entry.productType}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {definitionBusy || definition ? (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Product type definition
                </div>
                {definition ? (
                  <div className="text-xs text-slate-500">
                    {definition.productType || selectedProductType}
                  </div>
                ) : null}
              </div>

              {definitionBusy && !definition ? (
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                  Laduje definicje Amazon...
                </div>
              ) : definition ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Schema</div>
                      <div className="mt-1 text-sm font-semibold text-white">{definition.schemaVersion}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Requirements
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {definition.requirements || "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Enforced</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {definition.requirementsEnforced || "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Coverage</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {definition.requiredFields.length} required / {Object.keys(definition.properties).length} props
                      </div>
                    </div>
                  </div>

                  {definition.propertyGroups.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Property groups
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {definition.propertyGroups.map((group) => (
                          <span
                            key={group.key || group.title}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200"
                          >
                            {group.title} ({group.propertyNames.length})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {historyBusy || history.length > 0 ? (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Validation history
                </div>
                <div className="text-xs text-slate-500">{history.length} snapshotow</div>
              </div>

              {historyBusy && history.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                  Laduje historie snapshotow...
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div
                      key={entry.snapshotId || `${entry.productType}:${entry.updatedAt}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            #{entry.snapshotId || "-"}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClasses(entry.status)}`}
                          >
                            {entry.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatTimestamp(entry.updatedAt || entry.createdAt)}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                          {entry.productType || "-"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                          Schema: {entry.schemaVersion || "-"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                          Issues: {entry.issues.length}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {preview ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <div
                className="rounded-2xl border p-4 space-y-3"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Validation summary
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClasses(preview.status)}`}
                  >
                    {preview.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Snapshot: #{preview.snapshotId || "-"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Schema: {preview.schemaVersion || "-"}
                  </span>
                  {preview.updatedAt || preview.createdAt ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      Updated: {formatTimestamp(preview.updatedAt || preview.createdAt)}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {preview.issues.length > 0 ? (
                    preview.issues.map((issue) => (
                      <div
                        key={`${issue.field}:${issue.code}`}
                        className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                      >
                        <div className="font-semibold">{issue.field}</div>
                        <div className="mt-1 text-xs text-rose-100/80">{issue.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      Brak missing required dla obecnego payloadu.
                    </div>
                  )}
                </div>

                {preview.requiredFields.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Required fields
                      </div>
                      <div className="text-xs text-slate-500">{preview.requiredFields.length} total</div>
                    </div>

                    {preview.propertyGroups.length > 0 ? (
                      <div className="space-y-3">
                        {preview.propertyGroups.map((group) => (
                          <div
                            key={group.key || group.title}
                            className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3"
                          >
                            <div className="text-sm font-semibold text-cyan-100">{group.title}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.propertyNames.map((fieldName) => (
                                <span
                                  key={`${group.key}:${fieldName}`}
                                  className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-50"
                                >
                                  {fieldName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {standaloneRequiredFields.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Standalone
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {standaloneRequiredFields.map((fieldName) => (
                            <span
                              key={fieldName}
                              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200"
                            >
                              {fieldName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Payload preview
                </div>
                <div className="mt-3 space-y-2">
                  {Object.entries(preview.payload).length > 0 ? (
                    Object.entries(preview.payload).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
                      >
                        <span className="font-semibold text-white">{key}</span>
                        <span className="text-slate-400"> {"->"} </span>
                        <span>{String(value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">Brak payload preview.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
