"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
}
function authHeaders(json = true) {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ── Types ────────────────────────────────────────────────────────
type Marketplace = { id: number; slug: string; name: string };
type MarketplaceCategory = {
  marketplaceId: number; marketplaceSlug: string; marketplaceLabel: string;
  categoryId?: number; categoryPath?: string;
  allegroId?: string; allegroName?: string;
};
type Field = { id: number; field_code: string; label: string; description?: string; required: boolean; allowedValues: string[] };
type MediaOption = "global" | "separate" | "override";
const SLOTS = 16;

// ── Tabs ─────────────────────────────────────────────────────────
const TABS = [
  { id: "produkt",    label: "Produkt"      },
  { id: "opis",       label: "Opis produktu"},
  { id: "marketplace",label: "Marketplace"  },
  { id: "atrybuty",   label: "Atrybuty"    },
  { id: "media",      label: "Media"        },
];

// ── Small UI ─────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}
function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`w-full px-3 py-2.5 rounded-xl border-2 border-[var(--border-input)] bg-[var(--bg-input)]
      text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-indigo-400 focus:ring-4
      focus:ring-indigo-500/20 transition text-sm ${props.className ?? ""}`} />
  );
}
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select {...props} className={`w-full appearance-none px-3 py-2.5 rounded-xl border-2 border-[var(--border-input)]
        bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-indigo-400 pr-8 cursor-pointer text-sm
        transition ${props.className ?? ""}`}>
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
    </div>
  );
}

// ── Allegro Import Modal ─────────────────────────────────────────
type AllegroAccount = { id: number; environment: string; allegro_login: string; status: string };
type AllegroOffer   = {
  id: string; name: string;
  primaryImage?: { url: string };
  sellingMode?: { price?: { amount: string; currency: string } };
  publication?: { status: string };
  category?: { id: string };
};
type AllegroOfferImport = {
  title: string; ean: string; images: string[];
  descHtml: string; allegroId: string; allegroName: string; allegroPath: string;
  parameters: Record<string, string>;
};

function AllegroImportModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (data: AllegroOfferImport) => void;
}) {
  const [accounts,  setAccounts]  = useState<AllegroAccount[]>([]);
  const [env,       setEnv]       = useState<"production" | "sandbox">("production");
  const [offers,    setOffers]    = useState<AllegroOffer[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const PAGE_SIZE = 20;

  // Load accounts
  useEffect(() => {
    fetch(`${API}/api/seller/allegro/accounts`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => {
        if (j.data?.length) {
          setAccounts(j.data);
          const prod = j.data.find((a: AllegroAccount) => a.environment === "production" && a.status === "valid");
          if (prod) setEnv("production");
          else {
            const any = j.data.find((a: AllegroAccount) => a.status === "valid");
            if (any) setEnv(any.environment);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load offers when env or page changes
  useEffect(() => {
    if (!accounts.length) return;
    const active = accounts.find(a => a.environment === env && a.status === "valid");
    if (!active) return;
    setLoading(true); setError("");
    fetch(`${API}/api/seller/allegro/offers?env=${env}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
      headers: authHeaders(),
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) { setOffers(j.offers || []); setTotal(j.totalCount || 0); }
        else setError(j.error || "B\u0142\u0105d pobierania ofert");
      })
      .catch(() => setError("Nie mo\u017Cna pobra\u0107 ofert"))
      .finally(() => setLoading(false));
  }, [env, page, accounts]);

  const activeAccount = accounts.find(a => a.environment === env && a.status === "valid");
  const pages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? offers.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : offers;

  const handleSelect = async (offer: AllegroOffer) => {
    setImporting(true);
    try {
      // Fetch full offer details
      const r = await fetch(`${API}/api/seller/allegro/offers/${offer.id}?env=${env}`, { headers: authHeaders() });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "B\u0142\u0105d");
      const d = j.data;

      // Extract EAN from external.id or parameters
      const ean = d.external?.id || "";

      // Extract images
      const images: string[] = [];
      if (d.images?.length) {
        d.images.forEach((img: { url: string }) => { if (img.url) images.push(img.url); });
      } else if (d.primaryImage?.url) {
        images.push(d.primaryImage.url);
      }

      // Extract HTML description
      let descHtml = "";
      if (d.description?.sections?.length) {
        for (const section of d.description.sections) {
          for (const item of section.items || []) {
            if (item.type === "TEXT") descHtml += item.content || "";
            else if (item.type === "IMAGE" && item.url) descHtml += `<img src="${item.url}" alt="" style="max-width:100%">`;
          }
        }
      }

      // Extract parameters
      const parameters: Record<string, string> = {};
      if (d.parameters?.length) {
        for (const p of d.parameters) {
          const val = (p.values?.[0] || p.valuesIds?.[0] || "").toString();
          if (val) parameters[String(p.id)] = val;
        }
      }

      // Fetch category name
      let allegroName = d.category?.id || "";
      let allegroPath = "";
      try {
        const cr = await fetch(`${API}/api/allegro/categories/${d.category?.id}`, { headers: authHeaders() });
        const cj = await cr.json();
        if (cj.data?.name) { allegroName = cj.data.name; allegroPath = cj.data.path || cj.data.name; }
      } catch { /* use id as name */ }

      onImport({
        title:       d.name || offer.name,
        ean,
        images,
        descHtml,
        allegroId:   d.category?.id || "",
        allegroName,
        allegroPath,
        parameters,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] text-sm">Import z Allegro</div>
              <div className="text-xs text-[var(--text-tertiary)]">Wybierz ofert&#x119; aby uzupe&#x142;ni&#x107; dane produktu</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* No accounts */}
        {!loading && accounts.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-empty-icon)] flex items-center justify-center mb-2">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="font-semibold text-[var(--text-primary)]">Brak po&#322;&#261;czonego konta Allegro</div>
            <div className="text-sm text-[var(--text-tertiary)]">Przejd&#378; do Ustawie&#324; i po&#322;&#261;cz swoje konto Allegro, aby m&#243;c importowa&#263; oferty.</div>
          </div>
        )}

        {/* Account selector + content */}
        {accounts.length > 0 && (
          <>
            {/* Account bar */}
            <div className="px-6 py-3 bg-[var(--bg-body)] border-b border-[var(--border-light)] flex items-center gap-3 flex-wrap">
              {accounts.map(a => (
                <button key={a.id}
                  onClick={() => { setEnv(a.environment as "production" | "sandbox"); setPage(0); }}
                  disabled={a.status !== "valid"}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    env === a.environment && a.status === "valid"
                      ? "border-indigo-400 bg-indigo-500/10 text-indigo-600"
                      : a.status !== "valid"
                        ? "border-[var(--border-default)] text-[var(--text-muted)] cursor-not-allowed"
                        : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-input)] hover:text-[var(--text-primary)]"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${a.status === "valid" ? "bg-green-500" : "bg-red-400"}`} />
                  {a.allegro_login || a.environment}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    a.environment === "production" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"
                  }`}>{a.environment === "production" ? "PROD" : "SBX"}</span>
                </button>
              ))}
              <div className="ml-auto text-xs text-[var(--text-tertiary)]">{total > 0 && `${total} ofert`}</div>
            </div>

            {/* Search */}
            <div className="px-6 pt-3 pb-0">
              <div className="relative">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Szukaj po nazwie..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border-default)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] bg-[var(--bg-input)]" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  {error.includes("403")
                    ? <><strong>Brak uprawnień (403)</strong> — aplikacja Allegro nie ma dostępu do ofert. Sprawdź uprawnienia aplikacji w <a href="https://apps.developer.allegro.pl" target="_blank" className="underline">portalu dewelopera Allegro</a> (wymagany scope: <code className="bg-red-100 px-1 rounded">allegro:api:offers:read</code>).</>
                    : error
                  }
                </div>
              </div>
            )}

            {/* Offers list */}
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-tertiary)] text-sm">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  &#321;adowanie ofert...
                </div>
              ) : !activeAccount ? (
                <div className="text-center py-10 text-sm text-red-500">Brak aktywnego konta dla wybranego &#347;rodowiska</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  <div className="text-sm font-medium text-slate-500">Brak ofert na tym koncie</div>
                  <div className="text-xs text-slate-400">Dodaj produkty na Allegro, aby móc je importować</div>
                </div>
              ) : filtered.map(offer => (
                <button key={offer.id} onClick={() => handleSelect(offer)} disabled={importing}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-[var(--border-default)] hover:border-indigo-300 hover:bg-indigo-500/5 transition group">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--img-placeholder-bg)] flex-shrink-0 flex items-center justify-center">
                    {offer.primaryImage?.url ? (
                      <img src={offer.primaryImage.url} alt={offer.name} className="w-full h-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-indigo-600 line-clamp-2 leading-tight">{offer.name}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {offer.sellingMode?.price && (
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {parseFloat(offer.sellingMode.price.amount).toFixed(2)} {offer.sellingMode.price.currency}
                        </span>
                      )}
                      {offer.publication?.status && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          offer.publication.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : offer.publication.status === "ENDED"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-100 text-amber-700"
                        }`}>{offer.publication.status}</span>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono truncate">ID: {offer.id}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {importing
                      ? <svg className="animate-spin w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      : <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="m9 18 6-6-6-6"/>
                        </svg>}
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-6 py-3 border-t border-[var(--border-light)] flex items-center justify-between">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] disabled:opacity-40 disabled:cursor-not-allowed transition">
                  &#8592; Poprzednia
                </button>
                <span className="text-xs text-[var(--text-tertiary)]">Strona {page + 1} z {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1 || loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Nast&#x119;pna &#8594;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function NewProductPage() {
  const router = useRouter();
  const [tab, setTab]       = useState("produkt");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");
  const [showAllegroImport, setShowAllegroImport] = useState(false);

  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  // Produkt
  const [title, setTitle] = useState("");
  const [ean,   setEan]   = useState("");
  const [sku,   setSku]   = useState("");
  const [asin,  setAsin]  = useState("");
  const [brand, setBrand] = useState("");
  const [tags,  setTags]  = useState("");

  // Parametry techniczne
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm,  setWidthCm]  = useState("");
  const [lengthCm, setLengthCm] = useState("");

  // Opis — globalny
  const [desc,      setDesc]      = useState("");
  const [descHtml,  setDescHtml]  = useState("");
  const [desc2,     setDesc2]     = useState("");
  const [desc2Html, setDesc2Html] = useState("");

  // Opis — per marketplace
  type DescOption = "global" | "separate";
  type MpDescData = { desc: string; descHtml: string; desc2: string; desc2Html: string };
  const [mpDescOption, setMpDescOption] = useState<Record<string, DescOption>>({});
  const [mpDescData,   setMpDescData]   = useState<Record<string, MpDescData>>({});
  const [descViewMp,   setDescViewMp]   = useState("__global__");

  const getMpDesc = (slug: string): MpDescData =>
    mpDescData[slug] ?? { desc: "", descHtml: "", desc2: "", desc2Html: "" };
  const setMpDescField = (slug: string, field: keyof MpDescData, val: string) =>
    setMpDescData(prev => ({ ...prev, [slug]: { ...getMpDesc(slug), [field]: val } }));

  // Marketplace categories
  const [mktCats, setMktCats] = useState<Record<string, MarketplaceCategory>>({});
  const [dbCats,  setDbCats]  = useState<Record<string, { id: number; path: string; name: string }[]>>({});

  // Atrybuty
  const [attrMp,       setAttrMp]       = useState("");
  const [attrFields,   setAttrFields]   = useState<Field[]>([]);
  const [attrFieldsMp, setAttrFieldsMp] = useState(""); // dla którego mp załadowano attrFields
  const [attrVals,     setAttrVals]     = useState<Record<string, string>>({});
  const [attrLoading,  setAttrLoading]  = useState(false);
  const [mpAttrProgress, setMpAttrProgress] = useState<Record<string, { filled: number; total: number }>>({});

  // Przelicz progress tylko gdy attrFields należą do aktywnego attrMp
  useEffect(() => {
    if (!attrMp || !attrFields.length || attrFieldsMp !== attrMp) return;
    const required = attrFields.filter(f => f.required);
    const filled   = required.filter(f => (attrVals[f.field_code] ?? "").trim() !== "").length;
    setMpAttrProgress(prev => ({ ...prev, [attrMp]: { filled, total: required.length } }));
  }, [attrMp, attrFields, attrFieldsMp, attrVals]);

  // Gdy kategoria zostaje usunięta, wyczyść progress dla tego marketplace
  useEffect(() => {
    setMpAttrProgress(prev => {
      const next = { ...prev };
      let changed = false;
      for (const slug of Object.keys(next)) {
        const cat = mktCats[slug];
        if (!cat?.categoryPath && !cat?.allegroId) {
          delete next[slug];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mktCats]);

  // Media
  const emptySlots = (): (string | null)[] => Array(SLOTS).fill(null);
  const [globalSlots,   setGlobalSlots]   = useState<(string | null)[]>(emptySlots());
  const [mpSlots,       setMpSlots]       = useState<Record<string, (string | null)[]>>({});
  const [mpMediaOption, setMpMediaOption] = useState<Record<string, MediaOption>>({});
  const [mediaViewMp,   setMediaViewMp]   = useState("__global__");

  // Load marketplaces
  useEffect(() => {
    fetch(`${API}/api/templates/marketplaces`, { headers: authHeaders() })
      .then(r => r.json()).then(j => {
        if (j.data) { setMarketplaces(j.data); if (j.data.length) setAttrMp(j.data[0].slug); }
      }).catch(() => {});
  }, []);

  // Load categories when on marketplace tab (tylko non-Allegro — Allegro obsługuje swój picker)
  useEffect(() => {
    if (tab !== "marketplace") return;
    marketplaces.forEach(async mp => {
      if (mp.slug !== "allegro" && !dbCats[mp.slug]) {
        const j = await fetch(`${API}/api/templates/categories?marketplace=${mp.slug}`, { headers: authHeaders() }).then(r => r.json());
        if (j.data) setDbCats(prev => ({ ...prev, [mp.slug]: j.data }));
      }
    });
  }, [tab, marketplaces]);

  // Load attribute fields when marketplace or category changes
  useEffect(() => {
    if (!attrMp) return;
    const cat = mktCats[attrMp];
    const categoryPath = cat?.categoryPath;
    const allegroId    = cat?.allegroId;

    if (!categoryPath && !allegroId) { setAttrFields([]); setAttrFieldsMp(""); return; }
    setAttrFields([]);       // wyczyść natychmiast — bez tego stare pola migają
    setAttrFieldsMp("");     // pola nie należą jeszcze do żadnego mp (ładowanie)
    setAttrLoading(true);
    const loadingFor = attrMp; // zapamiętaj dla którego mp zaczęto ładowanie

    const load = async () => {
      try {
        if (allegroId) {
          // Allegro: pobierz parametry kategorii przez API
          const r = await fetch(`${API}/api/allegro/categories/${allegroId}/parameters`, { headers: authHeaders() });
          const j = await r.json();
          const fields = j.data
            ? j.data.map((p: any) => ({
                field_code:    String(p.id),
                label:         p.name,
                description:   p.description || "",
                required:      !!p.required,
                allowedValues: p.restrictions?.allowedValues?.map((v: any) => v.value) ?? [],
              }))
            : [];
          setAttrFields(fields);
        } else {
          // Mirakl: pobierz pola z DB
          const r = await fetch(
            `${API}/api/templates/fields?marketplace=${attrMp}&category=${encodeURIComponent(categoryPath!)}`,
            { headers: authHeaders() }
          );
          const j = await r.json();
          const all = [...(j.required ?? []), ...(j.optional ?? [])];
          // deduplikacja po field_code (zabezpieczenie przed duplikatami z DB)
          const seen = new Set<string>();
          const unique = all.filter(f => { if (seen.has(f.field_code)) return false; seen.add(f.field_code); return true; });
          setAttrFields(unique);
        }
        setAttrFieldsMp(loadingFor); // pola załadowane — przypnij do właściwego mp
      } catch { setAttrFields([]); setAttrFieldsMp(""); }
      finally { setAttrLoading(false); }
    };
    load();
  }, [attrMp, mktCats]);

  const setMktCat = (mp: Marketplace, val: Partial<MarketplaceCategory>) => {
    setMktCats(prev => {
      const ex = prev[mp.slug] ?? { marketplaceId: mp.id, marketplaceSlug: mp.slug, marketplaceLabel: mp.name };
      return { ...prev, [mp.slug]: { ...ex, ...val } };
    });
  };

  const handleAllegroImport = (data: AllegroOfferImport) => {
    setShowAllegroImport(false);
    if (data.title) setTitle(data.title);
    if (data.ean)   setEan(data.ean);
    if (data.descHtml) {
      setDescHtml(data.descHtml);
      const stripped = data.descHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      setDesc(stripped);
    }
    if (data.images.length) {
      setGlobalSlots(prev => {
        const next = [...prev];
        data.images.forEach((url, i) => { if (i < SLOTS) next[i] = url; });
        return next;
      });
    }
    if (data.allegroId) {
      const allegroMp = marketplaces.find(m => m.slug === "allegro");
      setMktCats(prev => {
        const existing = prev["allegro"] ?? {
          marketplaceId: allegroMp?.id ?? 0,
          marketplaceSlug: "allegro",
          marketplaceLabel: allegroMp?.name ?? "Allegro",
        };
        return { ...prev, allegro: { ...existing, allegroId: data.allegroId, allegroName: data.allegroName || data.allegroId } };
      });
      setAttrMp("allegro");
    }
    if (Object.keys(data.parameters).length) {
      setAttrVals(prev => ({ ...prev, ...data.parameters }));
    }
    if (data.allegroId) setTab("marketplace");
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Podaj nazwę produktu"); setTab("produkt"); return; }
    setSaving(true); setError("");
    try {
      const images = globalSlots.filter(Boolean) as string[];
      const res = await fetch(`${API}/api/products/create`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          title, ean, sku, asin, brand, tags,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          width_cm:  widthCm  ? parseFloat(widthCm)  : null,
          length_cm: lengthCm ? parseFloat(lengthCm) : null,
          description: desc || descHtml,
          description2: desc2 || desc2Html,
          marketplaceDescriptions: Object.fromEntries(
            Object.entries(mpDescOption)
              .filter(([, opt]) => opt === "separate")
              .map(([slug]) => {
                const d = getMpDesc(slug);
                return [slug, {
                  desc:     d.desc || d.descHtml,
                  desc2:    d.desc2 || d.desc2Html,
                  descHtml: d.descHtml,
                  desc2Html: d.desc2Html,
                }];
              })
          ),
          images,
          marketplaceCategories: Object.values(mktCats),
          attributes: attrVals,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd zapisu");
      setSaved(true);
      setTimeout(() => router.push("/dashboard/products"), 700);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const totalImages = globalSlots.filter(Boolean).length;
  const assignedCount = Object.values(mktCats).filter(c => c.categoryPath || c.allegroName).length;

  return (
    <div className="max-w-[900px] mx-auto pb-24">

      {/* Back */}
      <button onClick={() => router.push("/dashboard/products")}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition mb-5">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6"/></svg>
        Wróć do listy produktów
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--img-placeholder-bg)] border border-[var(--img-placeholder-border)] flex-shrink-0 flex items-center justify-center">
          {globalSlots[0] ? (
            <img src={globalSlots[0]} alt={title || ""} className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">{title || "Nowy produkt"}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Wype&#322;nij dane i przypisz do marketplace</p>
        </div>
        <button onClick={() => setShowAllegroImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:shadow-md hover:scale-105 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Import z Allegro
        </button>
      </div>

      {showAllegroImport && (
        <AllegroImportModal onClose={() => setShowAllegroImport(false)} onImport={handleAllegroImport} />
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden mb-5">
        <div className="flex border-b border-[var(--border-light)] overflow-x-auto">
          {TABS.map(t => {
            let badge = "";
            if (t.id === "media" && totalImages) badge = String(totalImages);
            if (t.id === "marketplace" && assignedCount) badge = String(assignedCount);
            if (t.id === "atrybuty" && attrFields.length) badge = String(attrFields.length);
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.id
                    ? "border-indigo-500 text-indigo-600 bg-indigo-500/5"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)]"
                }`}>
                {t.label}
                {badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? "bg-indigo-500/15 text-indigo-600" : "bg-[var(--bg-input)] text-[var(--text-tertiary)]"
                  }`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Produkt ────────────────────────────────────────── */}
        {tab === "produkt" && (
          <div className="p-6 space-y-5">
            <div>
              <Label required>Nazwa produktu</Label>
              <Inp value={title} onChange={e => setTitle(e.target.value)} placeholder="np. Samsung Galaxy S24 Ultra 256GB" />
              <div className="text-right text-[11px] text-slate-400 mt-1">{title.length} znaków</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>SKU</Label><Inp value={sku}  onChange={e => setSku(e.target.value)}  placeholder="SAM-S24U-256" /></div>
              <div><Label>EAN / GTIN</Label><Inp value={ean}  onChange={e => setEan(e.target.value)}  placeholder="8806095076065" /></div>
              <div><Label>ASIN</Label><Inp value={asin} onChange={e => setAsin(e.target.value)} placeholder="B0CXXXXXXXXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Producent / Marka</Label><Inp value={brand} onChange={e => setBrand(e.target.value)} placeholder="Samsung" /></div>
              <div><Label>Tagi (przecinek)</Label><Inp value={tags}  onChange={e => setTags(e.target.value)}  placeholder="smartfon, android, 5G" /></div>
            </div>
            <div className="border-t border-[var(--border-light)] pt-5">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Wymiary i waga</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Waga", unit: "kg", val: weightKg, set: setWeightKg, ph: "0.233" },
                  { label: "Wysokość", unit: "cm", val: heightCm, set: setHeightCm, ph: "16.1" },
                  { label: "Szerokość", unit: "cm", val: widthCm,  set: setWidthCm,  ph: "7.9"  },
                  { label: "Długość",   unit: "cm", val: lengthCm, set: setLengthCm, ph: "0.9"  },
                ].map(f => (
                  <div key={f.label}>
                    <Label>{f.label}</Label>
                    <div className="flex">
                      <Inp type="number" step="0.01" min="0" value={f.val}
                        onChange={e => f.set(e.target.value)} placeholder={f.ph}
                        className="!rounded-r-none !border-r-0" />
                      <span className="flex items-center px-3 bg-[var(--bg-input)] border-2 border-[var(--border-input)] border-l-0 rounded-r-xl text-xs text-[var(--text-secondary)] font-medium whitespace-nowrap">
                        {f.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kraj produkcji</Label><Inp placeholder="np. Polska" /></div>
              <div><Label>Gwarancja</Label><Inp placeholder="np. 24 miesiące" /></div>
              <div><Label>Materiał</Label><Inp placeholder="np. Aluminium, Szkło" /></div>
              <div><Label>Kolor</Label><Inp placeholder="np. Czarny" /></div>
            </div>
          </div>
        )}

        {/* ── Tab: Opis produktu ──────────────────────────────────── */}
        {tab === "opis" && (
          <div className="p-6 space-y-5">

            {/* Marketplace selector */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Kana&#322;</div>
              <div className="flex gap-2 flex-wrap">
                {/* Globalny */}
                <button
                  onClick={() => setDescViewMp("__global__")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                    descViewMp === "__global__"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  Globalny (domy&#347;lny)
                  {(desc || descHtml || desc2 || desc2Html)
                    ? <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    : <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />}
                </button>

                {/* Per marketplace */}
                {marketplaces.map(mp => {
                  const opt    = mpDescOption[mp.slug] || "global";
                  const isSep  = opt === "separate";
                  const d      = getMpDesc(mp.slug);
                  const hasCnt = !!(d.desc || d.descHtml || d.desc2 || d.desc2Html);
                  const isActive = descViewMp === mp.slug;
                  return (
                    <button key={mp.slug} onClick={() => setDescViewMp(mp.slug)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                        isActive
                          ? isSep
                            ? "border-green-500 bg-green-50 text-green-800"
                            : "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : isSep
                            ? "border-green-200 text-green-700 bg-green-50/50 hover:border-green-400"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}>
                      {mp.name}
                      {isSep
                        ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasCnt ? "bg-green-500" : "bg-amber-400"}`}
                            title={hasCnt ? "Osobny opis — wypełniony" : "Osobny opis — pusty"} />
                        : <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" title="Używa globalnego" />}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Osobny opis wypełniony</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Osobny opis — pusty</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Używa globalnego</span>
              </div>
            </div>

            {/* ── Globalny ────────────────────────────────────────── */}
            {descViewMp === "__global__" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-secondary)]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Opis globalny &mdash; stosowany domy&#347;lnie wszędzie tam, gdzie nie ustawiono osobnego opisu dla danego marketplace.
                </div>
                <DescriptionBlock label="Opis"
                  plain={desc} setPlain={setDesc}
                  html={descHtml} setHtml={setDescHtml} />
                <DescriptionBlock label="Opis dodatkowy 1"
                  plain={desc2} setPlain={setDesc2}
                  html={desc2Html} setHtml={setDesc2Html} />
              </div>
            )}

            {/* ── Per-marketplace ─────────────────────────────────── */}
            {descViewMp !== "__global__" && (() => {
              const mp  = marketplaces.find(m => m.slug === descViewMp);
              if (!mp) return null;
              const opt = mpDescOption[mp.slug] || "global";
              const d   = getMpDesc(mp.slug);
              const isSep = opt === "separate";
              return (
                <div className="space-y-4">
                  {/* Opcja — toggle */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                    isSep ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSep ? "bg-green-100" : "bg-slate-100"
                      }`}>
                        <svg viewBox="0 0 24 24" className={`w-4 h-4 ${isSep ? "text-green-600" : "text-slate-400"}`}
                          fill="none" stroke="currentColor" strokeWidth={2}>
                          {isSep
                            ? <><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M17.586 3.586a2 2 0 1 1 2.828 2.828L12 15l-4 1 1-4 8.586-8.414z"/></>
                            : <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>}
                        </svg>
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${isSep ? "text-green-800" : "text-slate-700"}`}>
                          {isSep ? `Osobny opis dla ${mp.name}` : "U\u017Cywa opisu globalnego"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isSep
                            ? "Ten kana\u0142 ma w\u0142asny opis niezale\u017Cny od globalnego"
                            : "Kliknij prze\u0142\u0105cznik, aby ustawi\u0107 osobny opis dla tego kana\u0142u"}
                        </div>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={() => setMpDescOption(prev => ({ ...prev, [mp.slug]: isSep ? "global" : "separate" }))}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        isSep ? "bg-green-500" : "bg-slate-300"
                      }`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        isSep ? "translate-x-6" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {!isSep ? (
                    /* Podgląd globalnego (read-only) */
                    <div className="space-y-3 opacity-50 pointer-events-none select-none">
                      <DescriptionBlock label="Opis" readonly
                        plain={desc} setPlain={() => {}}
                        html={descHtml} setHtml={() => {}} />
                      <DescriptionBlock label="Opis dodatkowy 1" readonly
                        plain={desc2} setPlain={() => {}}
                        html={desc2Html} setHtml={() => {}} />
                    </div>
                  ) : (
                    /* Edytowalny opis per marketplace */
                    <div className="space-y-3">
                      <DescriptionBlock
                        label={`Opis \u2014 ${mp.name}`}
                        plain={d.desc} setPlain={v => setMpDescField(mp.slug, "desc", v)}
                        html={d.descHtml} setHtml={v => setMpDescField(mp.slug, "descHtml", v)} />
                      <DescriptionBlock
                        label={`Opis dodatkowy 1 \u2014 ${mp.name}`}
                        plain={d.desc2} setPlain={v => setMpDescField(mp.slug, "desc2", v)}
                        html={d.desc2Html} setHtml={v => setMpDescField(mp.slug, "desc2Html", v)} />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Tab: Marketplace ────────────────────────────────────── */}
        {tab === "marketplace" && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Przypisz produkt do kategorii na każdym marketplace. Jeden produkt może mieć inne kategorie na różnych platformach.
            </p>
            {marketplaces.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">&#321;adowanie marketplace...</div>
            ) : marketplaces.map(mp => (
              <MarketplaceCard key={mp.slug} marketplace={mp} selected={mktCats[mp.slug]}
                dbCategories={dbCats[mp.slug] || []}
                onChange={val => setMktCat(mp, val)} />
            ))}
          </div>
        )}

        {/* ── Tab: Atrybuty ───────────────────────────────────────── */}
        {tab === "atrybuty" && (
          <div className="p-6">
            {/* Marketplace selector z kolorami ukończenia */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {marketplaces.map(mp => {
                const cat      = mktCats[mp.slug];
                const assigned = !!(cat?.categoryPath || cat?.allegroName);
                const prog     = mpAttrProgress[mp.slug];
                const allDone  = assigned && prog && prog.total > 0 && prog.filled === prog.total;
                const partial  = assigned && prog && prog.total > 0 && prog.filled > 0 && !allDone;
                const isActive = attrMp === mp.slug;
                return (
                  <button key={mp.slug} onClick={() => setAttrMp(mp.slug)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                      isActive
                        ? allDone  ? "border-green-500 bg-green-50 text-green-800"
                          : partial ? "border-amber-400 bg-amber-50 text-amber-800"
                          :           "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : allDone  ? "border-green-200 text-green-700 bg-green-50/40 hover:border-green-400"
                          : partial ? "border-amber-200 text-amber-700 bg-amber-50/40 hover:border-amber-400"
                          :           "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}>
                    <span>{mp.name}</span>
                    {allDone
                      ? <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Wszystkie wymagane uzupe\u0142nione" />
                      : partial
                        ? <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Cz\u0119\u015bciowo wype\u0142nione" />
                        : assigned
                          ? <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" title="Brak atrybut\u00f3w" />
                          : <span className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" title="Brak kategorii" />}
                    {prog && prog.total > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        allDone ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>{prog.filled}/{prog.total}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category info + pasek postępu */}
            {attrMp && (() => {
              const cat     = mktCats[attrMp];
              const catName = cat?.categoryPath || cat?.allegroName;
              const prog    = mpAttrProgress[attrMp];
              const allDone = prog && prog.total > 0 && prog.filled === prog.total;
              const pct     = prog && prog.total > 0 ? Math.round((prog.filled / prog.total) * 100) : 0;

              if (!catName) return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2 mb-4">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Najpierw przypisz kategorię w zakładce <button onClick={() => setTab("marketplace")} className="underline font-medium ml-1">Marketplace</button>
                </div>
              );
              return (
                <div className="mb-4 space-y-2">
                  {/* Breadcrumb kategorii */}
                  <div className="flex items-center gap-2 text-xs bg-[var(--bg-body)] border border-[var(--border-default)] rounded-xl px-4 py-2.5">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="text-[var(--text-secondary)]">Kategoria:</span>
                    <span className="font-medium text-[var(--text-primary)] truncate">{catName}</span>
                  </div>

                  {/* Pasek postępu wymaganych atrybutów */}
                  {prog && prog.total > 0 && (
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                      allDone ? "border-green-300 bg-green-50" : "border-amber-200 bg-amber-50"
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${allDone ? "text-green-700" : "text-amber-700"}`}>
                            {allDone
                              ? "Wszystkie wymagane atrybuty uzupe\u0142nione \u2014 produkt gotowy do eksportu"
                              : `Uzupe\u0142nij wymagane atrybuty: ${prog.filled} / ${prog.total} p\u00f3l`}
                          </span>
                          <span className={`text-xs font-bold ${allDone ? "text-green-600" : "text-amber-600"}`}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        allDone ? "bg-green-100" : "bg-amber-100"
                      }`}>
                        {allDone
                          ? <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Fields */}
            {attrLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-tertiary)]">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                &#321;adowanie atrybut&oacute;w...
              </div>
            ) : attrFields.length > 0 ? (
              <div className="space-y-6">
                {/* Required */}
                {attrFields.filter(f => f.required).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-red-500">Wymagane</span>
                      <span className="text-xs text-slate-400">({attrFields.filter(f => f.required).length} p&oacute;l)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {attrFields.filter(f => f.required).map(f => (
                        <AttrField key={f.field_code} field={f}
                          value={attrVals[f.field_code] ?? ""}
                          onChange={v => setAttrVals(prev => ({ ...prev, [f.field_code]: v }))} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional */}
                {attrFields.filter(f => !f.required).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Opcjonalne</span>
                      <span className="text-xs text-slate-400">({attrFields.filter(f => !f.required).length} p&oacute;l)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {attrFields.filter(f => !f.required).map(f => (
                        <AttrField key={f.field_code} field={f}
                          value={attrVals[f.field_code] ?? ""}
                          onChange={v => setAttrVals(prev => ({ ...prev, [f.field_code]: v }))} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : mktCats[attrMp]?.categoryPath || mktCats[attrMp]?.allegroName ? (
              <div className="text-center py-10 text-slate-400 text-sm">Brak atrybutów dla tej kategorii</div>
            ) : null}
          </div>
        )}

        {/* ── Tab: Media ──────────────────────────────────────────── */}
        {tab === "media" && (
          <MediaTab
            marketplaces={marketplaces}
            globalSlots={globalSlots} setGlobalSlots={setGlobalSlots}
            mpSlots={mpSlots} setMpSlots={setMpSlots}
            mpMediaOption={mpMediaOption} setMpMediaOption={setMpMediaOption}
            mediaViewMp={mediaViewMp} setMediaViewMp={setMediaViewMp}
          />
        )}
      </div>

      {/* ── Fixed bottom action bar ─────────────────────────────── */}
      <div className="fixed bottom-0 left-[220px] right-0 z-40 bg-[var(--bg-topbar)] border-t border-[var(--border-default)] shadow-lg px-8 py-4">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="text-xs text-[var(--text-tertiary)]">
            {title ? <span className="font-medium text-[var(--text-secondary)]">{title}</span> : <span className="italic">Nowy produkt</span>}
            {ean && <span className="ml-3 font-mono">EAN: {ean}</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard/products")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-secondary)]
                bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] border border-[var(--border-default)] transition">
              Anuluj
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className={`flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all ${
                saved ? "bg-green-500 text-white"
                : saving ? "bg-indigo-300 text-white cursor-wait"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-105 hover:shadow-lg"
              }`}>
              {saved ? (<><CheckIcon />Zapisano!</>)
               : saving ? (<><SpinIcon />Zapisywanie...</>)
               : (<><SaveIcon />Utwórz produkt</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Description block with HTML toggle ───────────────────────────
function DescriptionBlock({ label, plain, setPlain, html, setHtml, readonly }: {
  label: string;
  plain: string; setPlain: (v: string) => void;
  html: string;  setHtml:  (v: string) => void;
  readonly?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [mode, setMode]     = useState<"tekst" | "html">("tekst");
  const [preview, setPreview] = useState(false);

  // Sync: when plain changes in tekst mode, update html
  const handlePlain = (v: string) => {
    setPlain(v);
    // Convert plain to basic HTML only if html is empty or was auto-generated
    if (!html || html === `<p>${plain}</p>`) setHtml(`<p>${v.replace(/\n/g, "</p><p>")}</p>`);
  };
  // When html changes, extract plain text
  const handleHtml = (v: string) => {
    setHtml(v);
    // Strip tags for plain preview
    const stripped = v.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    setPlain(stripped);
  };

  const isEmpty = !plain && !html;

  return (
    <div className="border border-[var(--border-default)] rounded-2xl overflow-hidden">
      {/* Accordion header */}
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${
          open ? "bg-indigo-500/8" : "bg-[var(--bg-body)] hover:bg-[var(--bg-input)]"
        }`}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${open ? "rotate-90 text-indigo-500" : "text-slate-400"}`}
            fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6"/></svg>
          <span className={`font-semibold text-sm ${open ? "text-indigo-600" : "text-[var(--text-primary)]"}`}>{label}</span>
          {isEmpty
            ? <span className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-input)] px-2 py-0.5 rounded-full">Pusty</span>
            : <span className="text-[11px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">Wypełniony</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {!isEmpty && <span>{(plain || html).length} znaków</span>}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="p-5 border-t border-[var(--border-light)]">
          {/* Mode tabs */}
          <div className="flex items-center gap-1 mb-3 bg-[var(--bg-input)] rounded-xl p-1 w-fit">
            {(["tekst", "html"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setPreview(false); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  mode === m ? "bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                {m === "tekst" ? "Tekst" : "HTML"}
              </button>
            ))}
            {mode === "html" && (
              <button onClick={() => setPreview(p => !p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  preview ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-700"
                }`}>
                Podgląd
              </button>
            )}
          </div>

          {mode === "tekst" ? (
            <textarea
              readOnly={readonly}
              value={plain}
              onChange={e => !readonly && handlePlain(e.target.value)}
              rows={7}
              placeholder="Wpisz opis produktu..."
              className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border-input)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]
                outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20
                resize-none transition placeholder-[var(--text-tertiary)]"
            />
          ) : preview ? (
            <div className="w-full min-h-[140px] px-4 py-3 rounded-xl border-2 border-[var(--border-input)] bg-[var(--bg-body)] text-sm text-[var(--text-primary)] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html || "<p class='text-slate-400 italic'>Brak treści HTML</p>" }} />
          ) : (
            <textarea
              readOnly={readonly}
              value={html}
              onChange={e => !readonly && handleHtml(e.target.value)}
              rows={7}
              placeholder="<p>Wpisz opis w HTML...</p>"
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-900 text-sm text-green-400
                font-mono outline-none focus:border-indigo-400 resize-none transition placeholder-slate-600"
            />
          )}

          {mode === "html" && !preview && (
            <div className="mt-2 text-[11px] text-slate-400">
              Akceptowane tagi: &lt;p&gt; &lt;b&gt; &lt;i&gt; &lt;ul&gt; &lt;li&gt; &lt;h3&gt; &lt;br&gt; &lt;a&gt;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single attribute field ────────────────────────────────────────
function AttrField({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
        <span className="ml-1.5 text-[10px] font-mono text-[var(--text-tertiary)]">{field.field_code}</span>
      </label>
      {field.allowedValues?.length > 0 ? (
        <Sel value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— wybierz —</option>
          {field.allowedValues.map(v => <option key={v} value={v}>{v}</option>)}
        </Sel>
      ) : (
        <Inp
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.description || field.label}
          className={!value && field.required ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}
        />
      )}
    </div>
  );
}

// ── Allegro tree picker ───────────────────────────────────────────
type AllegroCategory = { id: string; name: string; leaf: boolean };
type FavCategory     = { category_id: string; category_name: string; category_path: string; use_count: number };

function AllegroTreePicker({ onSelect }: { onSelect: (id: string, name: string, path: string) => void }) {
  const [crumbs,    setCrumbs]  = useState<{ id: string; name: string }[]>([]);
  const [cats,      setCats]    = useState<AllegroCategory[]>([]);
  const [loading,   setLoading] = useState(false);
  const [search,    setSearch]  = useState("");
  const [favs,      setFavs]    = useState<FavCategory[]>([]);
  const [activeTab, setTab]     = useState<"browse" | "favorites">("browse");

  // Załaduj ulubione — napraw stare ID zapisane błędnie jako parseInt(id, 16)
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    const h = { Authorization: `Bearer ${t}` };
    fetch(`${API}/api/favorites/allegro`, { headers: h })
      .then(r => r.json())
      .then(j => {
        if (!j.data?.length) return;
        const fixed: FavCategory[] = j.data.map((fav: FavCategory) => {
          const rawId  = Number(fav.category_id);
          const hexStr = rawId.toString(16); // np. 550179 → "86523"
          if (/^\d+$/.test(hexStr)) {
            // Cyfry-only w hex → prawdopodobnie błędnie zapisany jako parseInt(id, 16)
            const candidate = parseInt(hexStr, 10); // "86523" → 86523
            if (candidate > 0 && candidate < rawId) {
              // Napraw w tle: usuń stary wpis i dodaj poprawny
              fetch(`${API}/api/favorites/allegro/${rawId}`, { method: "DELETE", headers: h }).catch(() => {});
              fetch(`${API}/api/favorites/allegro`, {
                method: "POST",
                headers: { ...h, "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: candidate, categoryPath: fav.category_path, categoryName: fav.category_name }),
              }).catch(() => {});
              return { ...fav, category_id: String(candidate) };
            }
          }
          return { ...fav, category_id: String(rawId) };
        });
        setFavs(fixed);
        setTab("favorites");
      }).catch(() => {});
  }, []);

  // Załaduj kategorie dla bieżącego poziomu
  useEffect(() => {
    const parentId = crumbs.length ? crumbs[crumbs.length - 1].id : undefined;
    setLoading(true); setSearch("");
    const t   = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const url = parentId ? `${API}/api/allegro/categories?parentId=${parentId}` : `${API}/api/allegro/categories`;
    fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(j => { if (j.data) setCats(j.data.map((c: any) => ({ id: c.id, name: c.name, leaf: !!c.leaf }))); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [crumbs]);

  const drillIn = (cat: AllegroCategory) => {
    if (cat.leaf) {
      const path = [...crumbs, cat].map(c => c.name).join(" / ");
      onSelect(cat.id, cat.name, path);
    } else {
      setCrumbs(prev => [...prev, { id: cat.id, name: cat.name }]);
    }
  };

  const filtered = cats.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1 w-fit">
        <button onClick={() => setTab("browse")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "browse" ? "bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
          Kategorie
        </button>
        {favs.length > 0 && (
          <button onClick={() => setTab("favorites")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeTab === "favorites" ? "bg-[var(--bg-card)] shadow-sm text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            <span>&#9733;</span> Ulubione
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{favs.length}</span>
          </button>
        )}
      </div>

      {activeTab === "favorites" ? (
        /* Ulubione */
        <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)]">
          {favs.map(fav => (
            <button key={String(fav.category_id)}
              onClick={() => onSelect(String(fav.category_id), fav.category_name, fav.category_path)}
              className="w-full text-left px-3 py-2.5 hover:bg-indigo-500/5 transition group">
              <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-indigo-600">{fav.category_name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{fav.category_path}</div>
              {fav.use_count > 0 && (
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{"U\u017Cywana "}{fav.use_count}{"×"}</div>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Drzewo kategorii */
        <>
          {/* Breadcrumb */}
          {crumbs.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap text-[11px] bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg px-3 py-1.5">
              <button onClick={() => setCrumbs([])} className="text-indigo-500 hover:underline font-medium">Allegro</button>
              {crumbs.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6"/></svg>
                  <button onClick={() => setCrumbs(prev => prev.slice(0, i + 1))}
                    className={`hover:underline ${i === crumbs.length - 1 ? "text-[var(--text-primary)] font-semibold" : "text-indigo-500"}`}>
                    {c.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Wyszukiwarka */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj w tej kategorii..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-xs outline-none focus:border-indigo-400 bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]" />

          {/* Lista */}
          <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                &#321;adowanie...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center">Brak wynik&oacute;w</div>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => drillIn(c)}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-500/5 hover:text-indigo-600 transition flex items-center justify-between group">
                <span className="font-medium text-[var(--text-primary)] group-hover:text-indigo-600">{c.name}</span>
                {c.leaf
                  ? <span className="text-[10px] text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Wybierz</span>
                  : <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6"/></svg>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Marketplace category card ─────────────────────────────────────
function MarketplaceCard({ marketplace, selected, dbCategories, onChange }: {
  marketplace: Marketplace; selected?: MarketplaceCategory;
  dbCategories: { id: number; path: string; name: string }[];
  onChange: (val: Partial<MarketplaceCategory>) => void;
}) {
  const isAllegro  = marketplace.slug === "allegro";
  const [search,    setSearch]  = useState("");
  const [favs,      setFavs]    = useState<FavCategory[]>([]);
  const [activeTab, setTab]     = useState<"browse" | "favorites">("browse");
  const isAssigned = !!(selected?.categoryPath || selected?.allegroName);

  // Ulubione dla non-Allegro
  useEffect(() => {
    if (isAllegro) return;
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    fetch(`${API}/api/favorites/${marketplace.slug}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(j => {
        if (j.data?.length) { setFavs(j.data); setTab("favorites"); }
      }).catch(() => {});
  }, [marketplace.slug, isAllegro]);

  const filtered = dbCategories.filter(c => c.path.toLowerCase().includes(search.toLowerCase()));

  const selectAllegro = (id: string, name: string, _path: string) => {
    onChange({ allegroId: id, allegroName: name });
    // Zarejestruj użycie
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    fetch(`${API}/api/favorites/allegro/${id}/use`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
  };

  const selectMirakl = (cat: { id: number; path: string; name: string }) => {
    onChange({ categoryId: cat.id, categoryPath: cat.path });
    setSearch("");
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    fetch(`${API}/api/favorites/${marketplace.slug}/${cat.id}/use`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition ${isAssigned ? "border-green-400/50 bg-green-500/5" : "border-[var(--border-default)] bg-[var(--bg-body)]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAssigned ? "bg-green-500" : "bg-slate-300"}`} />
          <span className="font-semibold text-[var(--text-primary)] text-sm">{marketplace.name}</span>
          {isAllegro && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">API</span>}
        </div>
        {isAssigned && (
          <button onClick={() => onChange({ categoryId: undefined, categoryPath: undefined, allegroId: undefined, allegroName: undefined })}
            className="text-xs text-red-400 hover:text-red-600 transition">Usu&#324;</button>
        )}
      </div>

      {isAssigned ? (
        <div className="flex items-start gap-2 bg-[var(--bg-card)] rounded-lg border border-green-400/40 px-3 py-2">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-xs text-[var(--text-primary)] font-medium">{selected?.categoryPath || selected?.allegroName}</span>
        </div>
      ) : isAllegro ? (
        <AllegroTreePicker onSelect={selectAllegro} />
      ) : (
        /* Non-Allegro: Tabs browse / favorites */
        <>
          {favs.length > 0 && (
            <div className="flex gap-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-1 w-fit mb-2">
              <button onClick={() => setTab("browse")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === "browse" ? "bg-[var(--bg-input)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
                Szukaj
              </button>
              <button onClick={() => setTab("favorites")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === "favorites" ? "bg-[var(--bg-input)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
                &#9733; Ulubione
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 rounded-full">{favs.length}</span>
              </button>
            </div>
          )}

          {activeTab === "favorites" ? (
            <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)]">
              {favs.map(fav => (
                <button key={fav.category_id}
                  onClick={() => onChange({ categoryId: parseInt(fav.category_id), categoryPath: fav.category_path })}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-500/5 transition group">
                  <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-indigo-600">{fav.category_name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] truncate">{fav.category_path}</div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Szukaj kategorii..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-xs outline-none focus:border-indigo-400 bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] mb-2" />
              {search ? (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-light)]">
                  {filtered.length === 0
                    ? <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">Brak wynik&oacute;w</div>
                    : filtered.slice(0, 30).map(c => (
                      <button key={c.id} onClick={() => selectMirakl(c)}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-indigo-500/5 hover:text-indigo-600 transition">
                        {c.path}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-1">Wpisz fraz&#281; aby wyszuka&#263; kategori&#281;</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Media Tab ─────────────────────────────────────────────────────
const MEDIA_OPTIONS: { value: MediaOption; label: string; desc: string }[] = [
  { value: "global",   label: "Użyj mediów globalnych",    desc: "Ten marketplace wyświetla domyślny zestaw zdjęć produktu." },
  { value: "separate", label: "Oddzielne media dla kanału", desc: "Osobne zdjęcia tylko dla tego marketplace." },
  { value: "override", label: "Nadpisz wybór i kolejność", desc: "Zmień kolejność lub zastąp wybrane zdjęcia z globalnych." },
];
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB   = 5;

function MediaTab({ marketplaces, globalSlots, setGlobalSlots, mpSlots, setMpSlots, mpMediaOption, setMpMediaOption, mediaViewMp, setMediaViewMp }: {
  marketplaces: Marketplace[];
  globalSlots: (string | null)[];     setGlobalSlots: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  mpSlots: Record<string, (string | null)[]>; setMpSlots: React.Dispatch<React.SetStateAction<Record<string, (string | null)[]>>>;
  mpMediaOption: Record<string, MediaOption>; setMpMediaOption: React.Dispatch<React.SetStateAction<Record<string, MediaOption>>>;
  mediaViewMp: string; setMediaViewMp: (v: string) => void;
}) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const multiRef = useRef<HTMLInputElement>(null);

  const isGlobal  = mediaViewMp === "__global__";
  const curOption = !isGlobal ? (mpMediaOption[mediaViewMp] ?? "global") : null;
  const slots: (string | null)[] = isGlobal
    ? globalSlots
    : (curOption === "separate" || curOption === "override")
      ? (mpSlots[mediaViewMp] ?? Array(SLOTS).fill(null))
      : globalSlots;
  const readOnly = !isGlobal && curOption === "global";

  const setSlot = (idx: number, url: string | null) => {
    if (isGlobal) {
      setGlobalSlots(prev => { const n = [...prev]; n[idx] = url; return n; });
    } else if (curOption === "separate" || curOption === "override") {
      setMpSlots(prev => {
        const cur = prev[mediaViewMp] ?? Array(SLOTS).fill(null);
        const n = [...cur]; n[idx] = url;
        return { ...prev, [mediaViewMp]: n };
      });
    }
  };

  const uploadFile = useCallback(async (file: File, slotIdx: number) => {
    if (!ACCEPTED.includes(file.type)) { setUploadError(`Nieobsługiwany format: ${file.name}`); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setUploadError(`Plik za duży: ${file.name} (max ${MAX_MB} MB)`); return; }
    setUploading(slotIdx); setUploadError("");
    try {
      const fd = new FormData(); fd.append("image", file);
      const res  = await fetch(`${API}/api/products/upload-image`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd uploadu");
      setSlot(slotIdx, json.url);
    } catch (e: any) { setUploadError(e.message); }
    finally { setUploading(null); }
  }, [isGlobal, curOption, mediaViewMp]);

  const handleMultiUpload = async (files: FileList) => {
    const emptyIdxs = slots.map((s, i) => (!s ? i : -1)).filter(i => i >= 0);
    let ei = 0;
    for (const file of Array.from(files)) { if (ei >= emptyIdxs.length) break; await uploadFile(file, emptyIdxs[ei++]); }
  };

  const filledCount = slots.filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-body)] space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5">Marketplace</div>
            <Sel value={mediaViewMp} onChange={e => setMediaViewMp(e.target.value)}>
              <option value="__global__">Globalne (domyślne)</option>
              {marketplaces.map(mp => <option key={mp.slug} value={mp.slug}>{mp.name}</option>)}
            </Sel>
          </div>
          {!isGlobal && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5">Opcje</div>
              <Sel value={curOption ?? "global"} onChange={e => setMpMediaOption(prev => ({ ...prev, [mediaViewMp]: e.target.value as MediaOption }))}>
                {MEDIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Sel>
            </div>
          )}
        </div>
        {!isGlobal && curOption && (
          <div className={`text-xs px-3 py-2 rounded-lg border ${
            curOption === "global"   ? "bg-blue-50 text-blue-700 border-blue-100"
            : curOption === "separate" ? "bg-purple-50 text-purple-700 border-purple-100"
            : "bg-orange-50 text-orange-700 border-orange-100"}`}>
            {MEDIA_OPTIONS.find(o => o.value === curOption)?.desc}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="p-6">
        {readOnly && (
          <div className="mb-3 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            Wyświetlane są media globalne (tylko do odczytu). Zmień opcję aby edytować media dla tego kanału.
          </div>
        )}
        {uploadError && (
          <div className="mb-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {uploadError}
            <button onClick={() => setUploadError("")} className="ml-auto">✕</button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: SLOTS }, (_, i) => (
            <ImageSlot key={i} index={i} url={slots[i] ?? null}
              uploading={uploading === i} readOnly={readOnly}
              onFile={f => uploadFile(f, i)} onRemove={() => setSlot(i, null)} />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-light)]">
          <div className="text-xs text-[var(--text-tertiary)] space-x-3">
            <span><span className="font-medium text-[var(--text-secondary)]">{filledCount}</span> / {SLOTS} zdjęć</span>
            <span>·</span>
            <span>Akceptowane: <span className="font-medium text-[var(--text-secondary)]">JPG · PNG · WEBP · GIF</span></span>
            <span>· Max <span className="font-medium text-[var(--text-secondary)]">{MAX_MB} MB</span></span>
          </div>
          {!readOnly && (
            <>
              <input ref={multiRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden"
                onChange={e => { if (e.target.files?.length) handleMultiUpload(e.target.files); e.target.value = ""; }} />
              <button onClick={() => multiRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600
                  bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-100 hover:border-indigo-300 transition">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Załaduj więcej zdjęć
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Image slot ────────────────────────────────────────────────────
function ImageSlot({ index, url, uploading, readOnly, onFile, onRemove }: {
  index: number; url: string | null; uploading: boolean; readOnly: boolean;
  onFile: (f: File) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (readOnly) return;
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  };

  return (
    <div className="relative aspect-square">
      <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-black/40 backdrop-blur-sm
        flex items-center justify-center text-[10px] font-bold text-white select-none">{index + 1}</div>
      <div
        onDragOver={e => { e.preventDefault(); if (!readOnly) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => { if (!readOnly && !url && !uploading) inputRef.current?.click(); }}
        className={`w-full h-full rounded-xl border-2 overflow-hidden flex items-center justify-center transition-all group
          ${url ? "border-[var(--border-default)] bg-[var(--img-placeholder-bg)]"
            : drag ? "border-indigo-400 bg-indigo-500/10 scale-[1.02]"
            : readOnly ? "border-[var(--border-light)] bg-[var(--bg-body)] cursor-default"
            : "border-dashed border-[var(--border-default)] bg-[var(--bg-body)] hover:border-indigo-400 hover:bg-indigo-500/5 cursor-pointer"}`}>
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5 text-indigo-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-[10px]">Wysyłanie...</span>
          </div>
        ) : url ? (
          <>
            <img src={url} alt="" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {!readOnly && (
              <button onClick={e => { e.stopPropagation(); onRemove(); }}
                className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-bold">
                ✕
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            {!readOnly && <span className="text-[10px]">Dodaj</span>}
          </div>
        )}
      </div>
      {!readOnly && !url && !uploading && (
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden"
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }} />
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────
function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6 9 17l-5-5"/></svg>;
}
function SpinIcon() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}
function SaveIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
}
