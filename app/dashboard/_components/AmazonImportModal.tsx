"use client";

import { useEffect, useState } from "react";

import type { AmazonCatalogItem, AmazonStatus } from "../_lib/amazon-import";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AmazonImportModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (data: AmazonCatalogItem) => void;
}) {
  const [status, setStatus] = useState<AmazonStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [query, setQuery] = useState("");
  const [asin, setAsin] = useState("");
  const [ean, setEan] = useState("");
  const [searchResults, setSearchResults] = useState<AmazonCatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [directLoading, setDirectLoading] = useState<"asin" | "ean" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      setLoadingStatus(true);
      try {
        const res = await fetch(`${API}/api/amazon/status`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nie udało się pobrać statusu Amazon");
        if (!cancelled) setStatus((json.data ?? null) as AmazonStatus | null);
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err, "Nie udało się pobrać statusu Amazon"));
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    };

    void loadStatus();
    return () => { cancelled = true; };
  }, []);

  const ready = !!status?.ready;
  const configured = !!status?.configured;
  const missingConfig = status
    ? [
        !status.hasClientId && "Brak AMAZON_CLIENT_ID",
        !status.hasClientSecret && "Brak AMAZON_CLIENT_SECRET",
        !status.hasRefreshToken && "Brak tokenu odświeżania",
      ].filter((item): item is string => Boolean(item))
    : [];
  const searchBlocked = !query.trim() || searching;
  const asinBlocked = !asin.trim() || directLoading !== "";
  const eanBlocked = !ean.trim() || directLoading !== "";

  const applyItem = (item: AmazonCatalogItem) => {
    onImport(item);
    onClose();
  };

  const searchAmazon = async () => {
    if (!query.trim() || !ready) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/amazon/catalog/search?q=${encodeURIComponent(query.trim())}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nie udało się wyszukać katalogu Amazon");
      setSearchResults(Array.isArray(json.data?.items) ? json.data.items : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się wyszukać katalogu Amazon"));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchDirectItem = async (kind: "asin" | "ean", value: string) => {
    if (!value.trim() || !ready) return;
    setDirectLoading(kind);
    setError("");
    try {
      const res = await fetch(`${API}/api/amazon/catalog/item?${kind}=${encodeURIComponent(value.trim())}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nie udało się pobrać pozycji Amazon");
      if (!json.data) throw new Error("Brak danych produktu Amazon");
      applyItem(json.data as AmazonCatalogItem);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udało się pobrać pozycji Amazon"));
    } finally {
      setDirectLoading("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-3xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500 text-white font-black text-sm shadow-sm">
              A
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] text-sm">Import z Amazon</div>
              <div className="text-xs text-[var(--text-tertiary)]">ASIN, EAN lub keyword. Wybierz pozycję i uzupełnij produkt.</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-2xl border p-4" style={{ background: "var(--bg-input-alt)", borderColor: "var(--border-default)" }}>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`px-2 py-1 rounded-full font-semibold border ${configured ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                {configured ? "Configured" : "Not configured"}
              </span>
              <span className={`px-2 py-1 rounded-full font-semibold border ${ready ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {ready ? "Ready" : "Not ready"}
              </span>
              {status?.message && <span className="px-2 py-1 rounded-full font-semibold border border-slate-200 bg-white text-slate-600">{status.message}</span>}
            </div>
            {loadingStatus && <div className="mt-3 text-sm text-[var(--text-secondary)]">Ładowanie statusu...</div>}
            {!loadingStatus && status && (
              <div className="mt-3 text-xs text-[var(--text-tertiary)] flex flex-wrap gap-2">
                <span>Refresh {status.hasRefreshToken ? "OK" : "missing"}</span>
                <span>Client ID {status.hasClientId ? "OK" : "missing"}</span>
                <span>Client secret {status.hasClientSecret ? "OK" : "missing"}</span>
                <span>Marketplace {status.marketplaceId || "—"}</span>
              </div>
            )}
          </div>

          {!loadingStatus && (!status || !ready) ? (
            <div className="rounded-2xl border p-5" style={{ background: "var(--bg-body)", borderColor: "var(--border-default)" }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">!</div>
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">Amazon nie jest jeszcze gotowy</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">{status?.message || "Brak wymaganej konfiguracji źródła."}</div>
                  {missingConfig.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {missingConfig.map((item) => (
                        <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Szukaj</div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void searchAmazon(); }}
                    placeholder="ASIN, EAN lub keyword"
                    className="w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-input)" }}
                  />
                  <button
                    onClick={() => {
                      if (searchBlocked) return;
                      void searchAmazon();
                    }}
                    aria-disabled={searchBlocked}
                    className={`rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition ${
                      searchBlocked ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    {searching ? "Szukam..." : "Szukaj"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Pobierz po identyfikatorze</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex gap-2">
                    <input
                      value={asin}
                      onChange={(e) => setAsin(e.target.value)}
                      placeholder="ASIN"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-input)" }}
                    />
                    <button
                      onClick={() => {
                        if (asinBlocked) return;
                        void fetchDirectItem("asin", asin);
                      }}
                      aria-disabled={asinBlocked}
                      className={`rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition ${
                        asinBlocked ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {directLoading === "asin" ? "..." : "Pobierz"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={ean}
                      onChange={(e) => setEan(e.target.value)}
                      placeholder="EAN"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-input)" }}
                    />
                    <button
                      onClick={() => {
                        if (eanBlocked) return;
                        void fetchDirectItem("ean", ean);
                      }}
                      aria-disabled={eanBlocked}
                      className={`rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition ${
                        eanBlocked ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      {directLoading === "ean" ? "..." : "Pobierz"}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
                  <div className="border-b px-4 py-3 text-sm font-semibold" style={{ background: "var(--bg-body)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}>
                    Wyniki katalogu
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                    {searchResults.map((item, index) => (
                      <button
                        key={`${item.asin || item.ean || index}`}
                        onClick={() => {
                          if (item.asin) {
                            void fetchDirectItem("asin", item.asin);
                            return;
                          }
                          if (item.ean) {
                            void fetchDirectItem("ean", item.ean);
                            return;
                          }
                          applyItem(item);
                        }}
                        className="w-full text-left px-4 py-3 transition hover:bg-indigo-500/5"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[var(--text-primary)]">{item.title || "Brak tytułu"}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              {item.brand && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{item.brand}</span>}
                              {item.asin && <span className="font-mono">ASIN {item.asin}</span>}
                              {item.ean && <span className="font-mono">EAN {item.ean}</span>}
                            </div>
                          </div>
                          <span className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-xs font-semibold text-white">
                            Użyj w produkcie
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : query.trim() && !searching ? (
                <div className="rounded-2xl border px-4 py-5 text-center text-sm" style={{ background: "var(--bg-body)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                  Brak wyników. Spróbuj ponownie inną frazą, ASIN albo EAN.
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
