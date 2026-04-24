"use client";

import { useEffect, useMemo, useState } from "react";

import { UnoptimizedRemoteImage } from "../_components/UnoptimizedRemoteImage";
import { useLang } from "../LangContext";
import type { AmazonCatalogItem, AmazonStatus } from "../_lib/amazon-import";
import {
  buildMarketplaceImportPayload,
  getImportItemKey,
  toggleImportSelection,
  toggleVisibleImportSelection,
  type AllegroImportItem,
  type AmazonImportItem,
  type MarketplaceImportMode,
  type MarketplaceImportProvider,
} from "./import-hub-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ALLEGRO_PAGE_SIZE = 20;

type QueuedMarketplaceImportJob = {
  id: string;
  type?: string | null;
  status: string;
  progressPercent?: number | null;
  currentMessage?: string | null;
  requestedItems?: number | null;
  createdAt?: string | null;
};

type AllegroAccount = {
  id: number;
  environment: "production" | "sandbox";
  allegro_login: string;
  status: string;
};

type AllegroOffer = {
  id: string;
  name: string;
  primaryImage?: { url?: string | null } | null;
  sellingMode?: { price?: { amount?: string | null; currency?: string | null } | null } | null;
  publication?: { status?: string | null } | null;
};

type Copy = (typeof COPY)[keyof typeof COPY];

type Props = {
  onClose: () => void;
  onQueued: (payload: {
    job: QueuedMarketplaceImportJob;
    provider: MarketplaceImportProvider;
    mode: MarketplaceImportMode;
    selectedCount: number;
  }) => void;
};

const COPY = {
  pl: {
    title: "Hub importu produktow",
    subtitle: "Wybierz Allegro albo Amazon. Import leci w tle i moze od razu dokolejkowac AI.",
    tabs: {
      allegro: "Allegro",
      amazon: "Amazon",
    },
    modeLabel: "Tryb importu",
    modeImportOnly: "Import only",
    modeImportAndAi: "Import + AI",
    duplicateHint: "Duplikaty nie sa importowane. Usun lokalny produkt, aby zaimportowac ponownie.",
    selected: "zaznaczone",
    selectPage: "Zaznacz strone",
    clearPage: "Wyczysc strone",
    submit: "Uruchom import",
    queued: "Import job started",
    queueError: "Nie udalo sie zakolejkowac importu",
    loading: "Ladowanie...",
    noRows: "Brak pozycji",
    noSelection: "Wybierz co najmniej jedna pozycje do importu.",
    allegro: {
      accountLabel: "Konto Allegro",
      noAccounts: "Brak aktywnego konta Allegro.",
      searchPlaceholder: "Szukaj po tytule oferty",
      offers: "ofert",
      publicationUnknown: "Nieznany status",
      noOffers: "Brak ofert dla wybranego konta.",
      pickAccount: "Wybierz konto Allegro przed importem.",
    },
    amazon: {
      statusLoading: "Ladowanie statusu Amazon...",
      notReady: "Amazon nie jest jeszcze gotowy",
      searchLabel: "Szukaj w katalogu",
      searchPlaceholder: "ASIN, EAN lub keyword",
      search: "Szukaj",
      searching: "Szukam...",
      directLabel: "Dodaj po identyfikatorze",
      asin: "ASIN",
      ean: "EAN",
      add: "Dodaj",
      empty: "Brak wynikow. Sprobuj innej frazy albo identyfikatora.",
      configured: "Configured",
      ready: "Ready",
      notConfigured: "Not configured",
      notReadyBadge: "Not ready",
      useItem: "Dodaj do zaznaczenia",
      loadItemError: "Nie udalo sie pobrac pozycji Amazon",
    },
  },
  en: {
    title: "Product import hub",
    subtitle: "Pick Allegro or Amazon. Import runs in background and can queue AI right away.",
    tabs: {
      allegro: "Allegro",
      amazon: "Amazon",
    },
    modeLabel: "Import mode",
    modeImportOnly: "Import only",
    modeImportAndAi: "Import + AI",
    duplicateHint: "Duplicates are skipped. Delete the local product to import that source again.",
    selected: "selected",
    selectPage: "Select page",
    clearPage: "Clear page",
    submit: "Start import",
    queued: "Import job started",
    queueError: "Failed to queue import",
    loading: "Loading...",
    noRows: "No rows",
    noSelection: "Select at least one row to import.",
    allegro: {
      accountLabel: "Allegro account",
      noAccounts: "No active Allegro account.",
      searchPlaceholder: "Search offer title",
      offers: "offers",
      publicationUnknown: "Unknown status",
      noOffers: "No offers for the selected account.",
      pickAccount: "Pick an Allegro account before import.",
    },
    amazon: {
      statusLoading: "Loading Amazon status...",
      notReady: "Amazon is not ready yet",
      searchLabel: "Search catalog",
      searchPlaceholder: "ASIN, EAN or keyword",
      search: "Search",
      searching: "Searching...",
      directLabel: "Add by identifier",
      asin: "ASIN",
      ean: "EAN",
      add: "Add",
      empty: "No results yet. Try another phrase or identifier.",
      configured: "Configured",
      ready: "Ready",
      notConfigured: "Not configured",
      notReadyBadge: "Not ready",
      useItem: "Add to selection",
      loadItemError: "Failed to load Amazon item",
    },
  },
} as const;

function authHeaders(json = false) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getCopy(lang: string): Copy {
  return lang === "en" ? COPY.en : COPY.pl;
}

export function MarketplaceSourceImportModal({ onClose, onQueued }: Props) {
  const { lang } = useLang();
  const copy = getCopy(lang);

  const [provider, setProvider] = useState<MarketplaceImportProvider>("allegro");
  const [mode, setMode] = useState<MarketplaceImportMode>("import_and_ai");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [allegroAccounts, setAllegroAccounts] = useState<AllegroAccount[]>([]);
  const [allegroAccountId, setAllegroAccountId] = useState<number | null>(null);
  const [allegroOffers, setAllegroOffers] = useState<AllegroOffer[]>([]);
  const [allegroOfferCache, setAllegroOfferCache] = useState<Record<string, AllegroOffer>>({});
  const [allegroTotal, setAllegroTotal] = useState(0);
  const [allegroPage, setAllegroPage] = useState(0);
  const [allegroSearch, setAllegroSearch] = useState("");
  const [allegroLoading, setAllegroLoading] = useState(true);
  const [allegroError, setAllegroError] = useState("");
  const [allegroSelectedKeys, setAllegroSelectedKeys] = useState<Set<string>>(new Set());

  const [amazonStatus, setAmazonStatus] = useState<AmazonStatus | null>(null);
  const [amazonStatusLoading, setAmazonStatusLoading] = useState(true);
  const [amazonQuery, setAmazonQuery] = useState("");
  const [amazonAsin, setAmazonAsin] = useState("");
  const [amazonEan, setAmazonEan] = useState("");
  const [amazonResults, setAmazonResults] = useState<AmazonCatalogItem[]>([]);
  const [amazonResultCache, setAmazonResultCache] = useState<Record<string, AmazonCatalogItem>>({});
  const [amazonSearching, setAmazonSearching] = useState(false);
  const [amazonLoadingDirect, setAmazonLoadingDirect] = useState<"asin" | "ean" | "">("");
  const [amazonError, setAmazonError] = useState("");
  const [amazonSelectedKeys, setAmazonSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadAllegroAccounts = async () => {
      setAllegroLoading(true);
      try {
        const res = await fetch(`${API}/api/seller/allegro/accounts`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || copy.queueError);

        const validAccounts = Array.isArray(json.data)
          ? (json.data as AllegroAccount[]).filter((item) => item.status === "valid")
          : [];

        if (cancelled) return;
        setAllegroAccounts(validAccounts);
        if (!validAccounts.length) {
          setAllegroAccountId(null);
          return;
        }

        setAllegroAccountId((current) => {
          if (current && validAccounts.some((item) => item.id === current)) return current;
          return validAccounts[0]?.id ?? null;
        });
      } catch (error: unknown) {
        if (!cancelled) setAllegroError(getErrorMessage(error, copy.queueError));
      } finally {
        if (!cancelled) setAllegroLoading(false);
      }
    };

    const loadAmazonStatus = async () => {
      setAmazonStatusLoading(true);
      try {
        const res = await fetch(`${API}/api/amazon/status`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || copy.amazon.loadItemError);
        if (!cancelled) setAmazonStatus((json.data ?? null) as AmazonStatus | null);
      } catch (error: unknown) {
        if (!cancelled) setAmazonError(getErrorMessage(error, copy.amazon.loadItemError));
      } finally {
        if (!cancelled) setAmazonStatusLoading(false);
      }
    };

    void Promise.all([loadAllegroAccounts(), loadAmazonStatus()]);

    return () => {
      cancelled = true;
    };
  }, [copy.amazon.loadItemError, copy.queueError]);

  useEffect(() => {
    let cancelled = false;
    const selectedAccount = allegroAccounts.find((item) => item.id === allegroAccountId);

    if (!selectedAccount) {
      setAllegroOffers([]);
      setAllegroTotal(0);
      setAllegroLoading(false);
      return;
    }

    const loadOffers = async () => {
      setAllegroLoading(true);
      setAllegroError("");
      try {
        const params = new URLSearchParams({
          env: selectedAccount.environment,
          limit: String(ALLEGRO_PAGE_SIZE),
          offset: String(allegroPage * ALLEGRO_PAGE_SIZE),
        });
        const res = await fetch(`${API}/api/seller/allegro/offers?${params}`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || copy.queueError);
        if (cancelled) return;
        const offers: AllegroOffer[] = Array.isArray(json.offers) ? json.offers : [];
        setAllegroOffers(offers);
        setAllegroOfferCache((current) => ({
          ...current,
          ...Object.fromEntries(offers.map((item) => [item.id, item])),
        }));
        setAllegroTotal(Number(json.totalCount) || 0);
      } catch (error: unknown) {
        if (!cancelled) {
          setAllegroOffers([]);
          setAllegroTotal(0);
          setAllegroError(getErrorMessage(error, copy.queueError));
        }
      } finally {
        if (!cancelled) setAllegroLoading(false);
      }
    };

    void loadOffers();

    return () => {
      cancelled = true;
    };
  }, [allegroAccountId, allegroAccounts, allegroPage, copy.queueError]);

  const selectedAllegroAccount = useMemo(
    () => allegroAccounts.find((item) => item.id === allegroAccountId) ?? null,
    [allegroAccountId, allegroAccounts]
  );

  const visibleAllegroItems = useMemo(() => {
    const normalizedSearch = allegroSearch.trim().toLowerCase();
    if (!normalizedSearch) return allegroOffers;
    return allegroOffers.filter((item) => item.name.toLowerCase().includes(normalizedSearch));
  }, [allegroOffers, allegroSearch]);

  const visibleAllegroSelectionKeys = visibleAllegroItems.map((item) =>
    getImportItemKey("allegro", { remoteId: item.id })
  );

  const visibleAmazonSelectionKeys = amazonResults.map((item) =>
    getImportItemKey("amazon", { asin: item.asin, ean: item.ean })
  );

  const selectedItems = useMemo(() => {
    if (provider === "allegro") {
      return [...allegroSelectedKeys]
        .map((key) => key.replace(/^allegro:/, ""))
        .map((remoteId) => allegroOfferCache[remoteId])
        .filter((item): item is AllegroOffer => Boolean(item))
        .map<AllegroImportItem>((item) => ({
          remoteId: item.id,
          title: item.name,
        }));
    }

    return [...amazonSelectedKeys]
      .map((key) => amazonResultCache[key])
      .filter((item): item is AmazonCatalogItem => Boolean(item))
      .map<AmazonImportItem>((item) => ({
        asin: item.asin,
        ean: item.ean,
        title: item.title,
      }));
  }, [allegroOfferCache, allegroSelectedKeys, amazonResultCache, amazonSelectedKeys, provider]);

  const selectedCount = selectedItems.length;
  const canSubmit = selectedCount > 0 && (provider !== "allegro" || Boolean(selectedAllegroAccount?.id));

  const toggleAllegroItem = (offerId: string) => {
    const itemKey = getImportItemKey("allegro", { remoteId: offerId });
    setAllegroSelectedKeys((current) => toggleImportSelection(current, itemKey));
  };

  const toggleAmazonItem = (item: AmazonCatalogItem) => {
    const itemKey = getImportItemKey("amazon", { asin: item.asin, ean: item.ean });
    setAmazonSelectedKeys((current) => toggleImportSelection(current, itemKey));
  };

  const handleAmazonSearch = async () => {
    const query = amazonQuery.trim();
    if (!query || !amazonStatus?.ready) return;

    setAmazonSearching(true);
    setAmazonError("");
    try {
      const res = await fetch(`${API}/api/amazon/catalog/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || copy.amazon.loadItemError);
      const items: AmazonCatalogItem[] = Array.isArray(json.data?.items) ? json.data.items : [];
      setAmazonResults(items);
      setAmazonResultCache((current) => ({
        ...current,
        ...Object.fromEntries(
          items.map((item) => [getImportItemKey("amazon", { asin: item.asin, ean: item.ean }), item])
        ),
      }));
    } catch (error: unknown) {
      setAmazonResults([]);
      setAmazonError(getErrorMessage(error, copy.amazon.loadItemError));
    } finally {
      setAmazonSearching(false);
    }
  };

  const addAmazonItem = async (kind: "asin" | "ean", rawValue: string) => {
    const value = rawValue.trim();
    if (!value || !amazonStatus?.ready) return;

    setAmazonLoadingDirect(kind);
    setAmazonError("");
    try {
      const res = await fetch(`${API}/api/amazon/catalog/item?${kind}=${encodeURIComponent(value)}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error || copy.amazon.loadItemError);

      const item = json.data as AmazonCatalogItem;
      const itemKey = getImportItemKey("amazon", { asin: item.asin, ean: item.ean });
      setAmazonResultCache((current) => ({ ...current, [itemKey]: item }));

      setAmazonResults((current) => {
        const next = current.filter(
          (existing) => getImportItemKey("amazon", { asin: existing.asin, ean: existing.ean }) !== itemKey
        );
        return [item, ...next];
      });
      setAmazonSelectedKeys((current) => toggleImportSelection(current, itemKey));
    } catch (error: unknown) {
      setAmazonError(getErrorMessage(error, copy.amazon.loadItemError));
    } finally {
      setAmazonLoadingDirect("");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) {
      if (!selectedCount) setSubmitError(copy.noSelection);
      else if (provider === "allegro" && !selectedAllegroAccount?.id) setSubmitError(copy.allegro.pickAccount);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildMarketplaceImportPayload({
        provider,
        mode,
        accountId: provider === "allegro" ? selectedAllegroAccount?.id ?? null : undefined,
        selectedItems,
      });

      const res = await fetch(`${API}/api/products/source-imports`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || copy.queueError);

      onQueued({
        job: json.data?.job as QueuedMarketplaceImportJob,
        provider,
        mode,
        selectedCount,
      });
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error, copy.queueError));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting ? `${copy.submit}...` : copy.submit;
  const selectedSet = provider === "allegro" ? allegroSelectedKeys : amazonSelectedKeys;
  const visibleSelectionKeys = provider === "allegro" ? visibleAllegroSelectionKeys : visibleAmazonSelectionKeys;
  const everyVisibleSelected = visibleSelectionKeys.length > 0 && visibleSelectionKeys.every((item) => selectedSet.has(item));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#020617] shadow-[0_30px_80px_rgba(2,6,23,0.65)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.3),_transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/80">Import hub</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{copy.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{copy.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["allegro", "amazon"] as MarketplaceImportProvider[]).map((tab) => {
                const active = provider === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setProvider(tab)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-white/20 bg-white text-slate-950"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {copy.tabs[tab]}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-1">
              <div className="mb-1 px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {copy.modeLabel}
              </div>
              <div className="flex flex-wrap gap-1">
                {([
                  ["import_only", copy.modeImportOnly],
                  ["import_and_ai", copy.modeImportAndAi],
                ] as Array<[MarketplaceImportMode, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      mode === value
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,1))] px-6 py-5">
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {copy.duplicateHint}
          </div>

          {provider === "allegro" ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {copy.allegro.accountLabel}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {allegroLoading && allegroAccounts.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-4 text-sm text-slate-300">
                        {copy.loading}
                      </div>
                    ) : allegroAccounts.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-4 text-sm text-slate-300">
                        {copy.allegro.noAccounts}
                      </div>
                    ) : (
                      allegroAccounts.map((account) => {
                        const active = account.id === allegroAccountId;
                        return (
                          <button
                            key={account.id}
                            onClick={() => {
                              setAllegroAccountId(account.id);
                              setAllegroPage(0);
                              setAllegroOfferCache({});
                              setAllegroSelectedKeys(new Set());
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? "border-indigo-400 bg-indigo-500/15 text-white"
                                : "border-white/10 bg-slate-900/70 text-slate-200 hover:bg-slate-800/80"
                            }`}
                          >
                            <div className="text-sm font-semibold">{account.allegro_login || account.environment}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                              {account.environment}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1">
                      <input
                        value={allegroSearch}
                        onChange={(event) => setAllegroSearch(event.target.value)}
                        placeholder={copy.allegro.searchPlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                      />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {allegroTotal} {copy.allegro.offers}
                    </div>
                  </div>

                  {allegroError && (
                    <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-100">
                      {allegroError}
                    </div>
                  )}

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-4 py-3">
                      <div className="text-sm font-semibold text-white">
                        {selectedCount} {copy.selected}
                      </div>
                      <button
                        onClick={() =>
                          setAllegroSelectedKeys((current) =>
                            toggleVisibleImportSelection(current, visibleAllegroSelectionKeys)
                          )
                        }
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:text-white"
                      >
                        {everyVisibleSelected ? copy.clearPage : copy.selectPage}
                      </button>
                    </div>

                    <div className="max-h-[430px] overflow-y-auto divide-y divide-white/10">
                      {allegroLoading ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-300">{copy.loading}</div>
                      ) : visibleAllegroItems.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-300">{copy.allegro.noOffers}</div>
                      ) : (
                        visibleAllegroItems.map((offer) => {
                          const itemKey = getImportItemKey("allegro", { remoteId: offer.id });
                          const selected = allegroSelectedKeys.has(itemKey);
                          const price = offer.sellingMode?.price?.amount;
                          const publication = offer.publication?.status || copy.allegro.publicationUnknown;

                          return (
                            <label
                              key={offer.id}
                              className={`flex cursor-pointer gap-3 px-4 py-3 transition ${
                                selected ? "bg-indigo-500/10" : "bg-slate-950/60 hover:bg-slate-900/70"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleAllegroItem(offer.id)}
                                className="mt-1 h-4 w-4 rounded accent-indigo-500"
                              />
                              <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                                {offer.primaryImage?.url ? (
                                  <UnoptimizedRemoteImage
                                    src={offer.primaryImage.url}
                                    alt={offer.name}
                                    sizes="56px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-500">A</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-white">{offer.name}</div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                                    ID {offer.id}
                                  </span>
                                  {price && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                      {price} {offer.sellingMode?.price?.currency || ""}
                                    </span>
                                  )}
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                    {publication}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {allegroTotal > ALLEGRO_PAGE_SIZE && (
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (allegroPage === 0) return;
                          setAllegroPage((current) => current - 1);
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        Prev
                      </button>
                      <div className="text-xs text-slate-400">
                        {allegroPage + 1} / {Math.max(1, Math.ceil(allegroTotal / ALLEGRO_PAGE_SIZE))}
                      </div>
                      <button
                        onClick={() => {
                          if ((allegroPage + 1) * ALLEGRO_PAGE_SIZE >= allegroTotal) return;
                          setAllegroPage((current) => current + 1);
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_1fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span
                        className={`rounded-full border px-2 py-1 font-semibold ${
                          amazonStatus?.configured
                            ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-100"
                            : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                        }`}
                      >
                        {amazonStatus?.configured ? copy.amazon.configured : copy.amazon.notConfigured}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 font-semibold ${
                          amazonStatus?.ready
                            ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-100"
                            : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                        }`}
                      >
                        {amazonStatus?.ready ? copy.amazon.ready : copy.amazon.notReadyBadge}
                      </span>
                    </div>

                    {amazonStatusLoading ? (
                      <div className="mt-3 text-sm text-slate-300">{copy.amazon.statusLoading}</div>
                    ) : !amazonStatus?.ready ? (
                      <div className="mt-3 text-sm text-slate-300">
                        {amazonStatus?.message || copy.amazon.notReady}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-400">
                        {amazonStatus.message || copy.amazon.ready}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {copy.amazon.searchLabel}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={amazonQuery}
                        onChange={(event) => setAmazonQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void handleAmazonSearch();
                        }}
                        placeholder={copy.amazon.searchPlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                      />
                      <button
                        onClick={() => { void handleAmazonSearch(); }}
                        className="rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                      >
                        {amazonSearching ? copy.amazon.searching : copy.amazon.search}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {copy.amazon.directLabel}
                    </div>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-2">
                        <input
                          value={amazonAsin}
                          onChange={(event) => setAmazonAsin(event.target.value)}
                          placeholder={copy.amazon.asin}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                        />
                        <button
                          onClick={() => { void addAmazonItem("asin", amazonAsin); }}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                          {amazonLoadingDirect === "asin" ? "..." : copy.amazon.add}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={amazonEan}
                          onChange={(event) => setAmazonEan(event.target.value)}
                          placeholder={copy.amazon.ean}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                        />
                        <button
                          onClick={() => { void addAmazonItem("ean", amazonEan); }}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                          {amazonLoadingDirect === "ean" ? "..." : copy.amazon.add}
                        </button>
                      </div>
                    </div>
                  </div>

                  {amazonError && (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-3 text-sm text-rose-100">
                      {amazonError}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="text-sm font-semibold text-white">
                      {selectedCount} {copy.selected}
                    </div>
                    <button
                      onClick={() =>
                        setAmazonSelectedKeys((current) =>
                          toggleVisibleImportSelection(current, visibleAmazonSelectionKeys)
                        )
                      }
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:text-white"
                    >
                      {everyVisibleSelected ? copy.clearPage : copy.selectPage}
                    </button>
                  </div>

                  <div className="mt-4 max-h-[500px] overflow-y-auto space-y-3">
                    {amazonResults.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-300">
                        {copy.amazon.empty}
                      </div>
                    ) : (
                      amazonResults.map((item, index) => {
                        const itemKey = getImportItemKey("amazon", { asin: item.asin, ean: item.ean });
                        const selected = amazonSelectedKeys.has(itemKey);

                        return (
                          <label
                            key={`${item.asin || item.ean || index}`}
                            className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition ${
                              selected
                                ? "border-indigo-400/30 bg-indigo-500/10"
                                : "border-white/10 bg-slate-950/60 hover:bg-slate-900/70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleAmazonItem(item)}
                              className="mt-1 h-4 w-4 rounded accent-indigo-500"
                            />
                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                              {item.images?.[0] ? (
                                <UnoptimizedRemoteImage
                                  src={item.images[0]}
                                  alt={item.title || "Amazon"}
                                  sizes="64px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-orange-300">A</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white">
                                {item.title || "Amazon item"}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                                {item.brand && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                    {item.brand}
                                  </span>
                                )}
                                {item.asin && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                                    ASIN {item.asin}
                                  </span>
                                )}
                                {item.ean && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono">
                                    EAN {item.ean}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/80 px-6 py-4">
          {submitError && (
            <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              {selectedCount} {copy.selected}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Close
              </button>
              <button
                onClick={() => { void handleSubmit(); }}
                aria-disabled={!canSubmit || submitting}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  !canSubmit || submitting
                    ? "cursor-not-allowed bg-indigo-300/70 text-white/80"
                    : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.35)]"
                }`}
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
