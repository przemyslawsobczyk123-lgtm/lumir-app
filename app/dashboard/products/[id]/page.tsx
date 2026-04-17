"use client";

import { useRouter, useParams } from "next/navigation";
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
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}
function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white
      text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-4
      focus:ring-indigo-100 transition text-sm ${props.className ?? ""}`} />
  );
}
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select {...props} className={`w-full appearance-none px-3 py-2.5 rounded-xl border-2 border-slate-200
        bg-white text-slate-800 outline-none focus:border-indigo-400 pr-8 cursor-pointer text-sm
        transition ${props.className ?? ""}`}>
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6"/></svg>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const router = useRouter();
  const [tab, setTab]     = useState("produkt");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  // Produkt
  const [title, setTitle] = useState("");
  const [ean,   setEan]   = useState("");
  const [sku,   setSku]   = useState("");
  const [asin,  setAsin]  = useState("");
  const [brand, setBrand] = useState("");
  const [tags,  setTags]  = useState("");

  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  // Parametry techniczne
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm,  setWidthCm]  = useState("");
  const [lengthCm, setLengthCm] = useState("");

  // Opis
  const [desc,      setDesc]      = useState("");
  const [descHtml,  setDescHtml]  = useState("");
  const [desc2,     setDesc2]     = useState("");
  const [desc2Html, setDesc2Html] = useState("");

  // Marketplace categories
  const [mktCats,     setMktCats]     = useState<Record<string, MarketplaceCategory>>({});
  const [dbCats,      setDbCats]      = useState<Record<string, { id: number; path: string; name: string }[]>>({});
  const [allegroTree, setAllegroTree] = useState<{ id: string; name: string }[]>([]);

  // Atrybuty
  const [attrMp,     setAttrMp]     = useState("");
  const [attrFields, setAttrFields] = useState<Field[]>([]);
  const [attrVals,   setAttrVals]   = useState<Record<string, string>>({});
  const [attrLoading,setAttrLoading]= useState(false);

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

  // Load categories when on marketplace tab
  useEffect(() => {
    if (tab !== "marketplace") return;
    marketplaces.forEach(async mp => {
      if (mp.slug === "allegro") {
        if (!allegroTree.length) {
          const j = await fetch(`${API}/api/allegro/categories`, { headers: authHeaders() }).then(r => r.json());
          if (j.data) setAllegroTree(j.data);
        }
      } else if (!dbCats[mp.slug]) {
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

    if (!categoryPath && !allegroId) { setAttrFields([]); return; }
    setAttrLoading(true);

    const load = async () => {
      try {
        if (allegroId) {
          // Allegro: pobierz parametry kategorii przez API
          const r = await fetch(`${API}/api/allegro/categories/${allegroId}/parameters`, { headers: authHeaders() });
          const j = await r.json();
          if (j.data) {
            setAttrFields(j.data.map((p: any) => ({
              field_code:    p.id,
              label:         p.name,
              description:   p.description || "",
              required:      !!p.required,
              allowedValues: p.restrictions?.allowedValues?.map((v: any) => v.value) ?? [],
            })));
          } else setAttrFields([]);
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
      } catch { setAttrFields([]); }
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

  
  useEffect(() => {
    fetch(`${API}/api/products/${id}`, { headers: authHeaders(), cache: "no-store" })
      .then(res => res.json())
      .then(json => {
        if(json.data) {
          const p = json.data;
          setProduct(p);
          try {
            setTitle(p.title || "");
            setEan(p.ean || "");
            setSku(p.sku || "");
            setAsin(p.asin || "");
            setBrand(p.brand || "");
            setTags(p.tags || "");
            setPrice(p.price != null ? String(p.price) : "");
            setStock(p.stock != null ? String(p.stock) : "0");
            setWeightKg(p.weight_kg != null ? String(p.weight_kg) : "");
            setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
            setWidthCm(p.width_cm != null ? String(p.width_cm) : "");
            setLengthCm(p.length_cm != null ? String(p.length_cm) : "");
            setDesc(p.description || "");
            setDescHtml(p.description || "");
          } catch(e) { console.error("Error loading basic fields:", e); }
          
          try {
            if(p.images) {
              const arr = Array(16).fill(null);
              const imgArray = Array.isArray(p.images) ? p.images : [];
              imgArray.forEach((img: string, i: number) => { if(i<16) arr[i] = img; });
              setGlobalSlots(arr);
            }
          } catch(e) { console.error("Error loading images:", e); }
          
          try {
            if(p.marketplaceCategories) {
              const mcs: Record<string, any> = {};
              if (Array.isArray(p.marketplaceCategories)) {
                  p.marketplaceCategories.forEach((mc: any) => {
                    mcs[mc.slug] = {
                      marketplaceId: mc.marketplace_id,
                      marketplaceSlug: mc.slug,
                      marketplaceLabel: mc.marketplace_name,
                      categoryId: mc.category_id,
                      categoryPath: mc.category_path,
                      allegroId: mc.allegro_category_id,
                      allegroName: mc.allegro_category_name
                    };
                  });
              }
              setMktCats(mcs);
            }
          } catch(e) { console.error("Error loading marketplace categories:", e); }
          
          try {
            if(p.attributes) {
              const attrs: Record<string, string> = {};
              if (Array.isArray(p.attributes)) {
                  p.attributes.forEach((a: any) => {
                    attrs[a.field_code] = a.value === "❗ UZUPEŁNIJ" ? "" : a.value;
                  });
              }
              setAttrVals(attrs);
            }
          } catch(e) { console.error("Error loading attributes:", e); }
        } else if (json.error) {
          setError(json.error);
        }
      })
      .catch(err => {
        console.error("Product load error:", err);
        setError("Nie udało się wczytać produktu");
      })
      .finally(() => setLoadingProduct(false));
  }, [id]);

  const totalImages = globalSlots.filter(Boolean).length;
  const assignedCount = Object.values(mktCats).filter(c => c.categoryPath || c.allegroName).length;

  if (loadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <svg className="animate-spin w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Wczytywanie produktu...
      </div>
    );
  }


  const handleSave = async () => {
    if (!title.trim()) { setError("Podaj nazwę produktu"); setTab("produkt"); return; }
    setSaving(true); setError("");
    try {
      const images = globalSlots.filter(Boolean) as string[];
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "PUT", headers: authHeaders(true),
        body: JSON.stringify({
          title, ean, sku, asin, brand, tags,
          price: price ? parseFloat(price) : null,
          stock: stock ? parseInt(stock) : 0,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          width_cm:  widthCm  ? parseFloat(widthCm)  : null,
          length_cm: lengthCm ? parseFloat(lengthCm) : null,
          description: desc || descHtml,
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


  return (
    <div className="max-w-[900px] mx-auto pb-24">

      {/* Back */}
      <button onClick={() => router.push("/dashboard/products")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition mb-5">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6"/></svg>
        Wróć do listy produktów
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
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
          <h1 className="text-2xl font-bold text-slate-800 truncate">{title || "Edycja produktu"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Zaktualizuj dane i przypisz do marketplace</p>
        </div>
      </div>

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => {
            let badge = "";
            if (t.id === "media" && totalImages) badge = String(totalImages);
            if (t.id === "marketplace" && assignedCount) badge = String(assignedCount);
            if (t.id === "atrybuty" && attrFields.length) badge = String(attrFields.length);
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.id
                    ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                {t.label}
                {badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cena (PLN)</Label>
                <div className="flex">
                  <Inp type="number" step="0.01" min="0" value={price}
                    onChange={e => setPrice(e.target.value)} placeholder="0.00"
                    className="!rounded-r-none !border-r-0" />
                  <span className="flex items-center px-3 bg-slate-100 border-2 border-slate-200 border-l-0 rounded-r-xl text-xs text-slate-500 font-medium">PLN</span>
                </div>
              </div>
              <div>
                <Label>Stan magazynowy</Label>
                <div className="flex">
                  <Inp type="number" step="1" min="0" value={stock}
                    onChange={e => setStock(e.target.value)} placeholder="0"
                    className="!rounded-r-none !border-r-0" />
                  <span className="flex items-center px-3 bg-slate-100 border-2 border-slate-200 border-l-0 rounded-r-xl text-xs text-slate-500 font-medium">szt.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Wymiary i waga</div>
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
                      <span className="flex items-center px-3 bg-slate-100 border-2 border-slate-200 border-l-0 rounded-r-xl text-xs text-slate-500 font-medium whitespace-nowrap">
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
          <div className="p-6 space-y-4">
            <DescriptionBlock
              label="Opis"
              plain={desc} setPlain={setDesc}
              html={descHtml} setHtml={setDescHtml}
            />
            <DescriptionBlock
              label="Opis dodatkowy 1"
              plain={desc2} setPlain={setDesc2}
              html={desc2Html} setHtml={setDesc2Html}
            />
          </div>
        )}

        {/* ── Tab: Marketplace ────────────────────────────────────── */}
        {tab === "marketplace" && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              Przypisz produkt do kategorii na każdym marketplace. Jeden produkt może mieć inne kategorie na różnych platformach.
            </p>
            {marketplaces.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">Ładowanie marketplace...</div>
            ) : marketplaces.map(mp => (
              <MarketplaceCard key={mp.slug} marketplace={mp} selected={mktCats[mp.slug]}
                dbCategories={dbCats[mp.slug] || []} allegroTree={allegroTree}
                onChange={val => setMktCat(mp, val)} />
            ))}
          </div>
        )}

        {/* ── Tab: Atrybuty ───────────────────────────────────────── */}
        {tab === "atrybuty" && (
          <div className="p-6">
            {/* Marketplace selector */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {marketplaces.map(mp => {
                const cat = mktCats[mp.slug];
                const assigned = !!(cat?.categoryPath || cat?.allegroName);
                return (
                  <button key={mp.slug} onClick={() => setAttrMp(mp.slug)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                      attrMp === mp.slug
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}>
                    <span>{mp.name}</span>
                    {assigned
                      ? <span className="w-2 h-2 rounded-full bg-green-500" title="Kategoria przypisana" />
                      : <span className="w-2 h-2 rounded-full bg-slate-300" title="Brak kategorii" />}
                  </button>
                );
              })}
            </div>

            {/* Category info */}
            {attrMp && (() => {
              const cat = mktCats[attrMp];
              const catName = cat?.categoryPath || cat?.allegroName;
              if (!catName) return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Najpierw przypisz kategorię w zakładce <button onClick={() => setTab("marketplace")} className="underline font-medium ml-1">Marketplace</button>
                </div>
              );
              return (
                <div className="mb-4 flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="text-slate-500">Kategoria:</span>
                  <span className="font-medium text-slate-700 truncate">{catName}</span>
                </div>
              );
            })()}

            {/* Fields */}
            {attrLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Ładowanie atrybutów...
              </div>
            ) : attrFields.length > 0 ? (
              <div className="space-y-6">
                {/* Required */}
                {attrFields.filter(f => f.required).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-red-500">Wymagane</span>
                      <span className="text-xs text-slate-400">({attrFields.filter(f => f.required).length} pól)</span>
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
                      <span className="text-xs text-slate-400">({attrFields.filter(f => !f.required).length} pól)</span>
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
      <div className="fixed bottom-0 left-[220px] right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-8 py-4">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {title ? <span className="font-medium text-slate-600">{title}</span> : <span className="italic">Nowy produkt</span>}
            {ean && <span className="ml-3 font-mono">EAN: {ean}</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard/products")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600
                bg-slate-100 hover:bg-slate-200 border border-slate-200 transition">
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
               : (<><SaveIcon />Zapisz zmiany</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Description block with HTML toggle ───────────────────────────
function DescriptionBlock({ label, plain, setPlain, html, setHtml }: {
  label: string;
  plain: string; setPlain: (v: string) => void;
  html: string;  setHtml:  (v: string) => void;
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
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Accordion header */}
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${
          open ? "bg-indigo-50" : "bg-slate-50 hover:bg-slate-100"
        }`}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${open ? "rotate-90 text-indigo-500" : "text-slate-400"}`}
            fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6"/></svg>
          <span className={`font-semibold text-sm ${open ? "text-indigo-700" : "text-slate-700"}`}>{label}</span>
          {isEmpty
            ? <span className="text-[11px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Pusty</span>
            : <span className="text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Wypełniony</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {!isEmpty && <span>{(plain || html).length} znaków</span>}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="p-5 border-t border-slate-100">
          {/* Mode tabs */}
          <div className="flex items-center gap-1 mb-3 bg-slate-100 rounded-xl p-1 w-fit">
            {(["tekst", "html"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setPreview(false); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  mode === m ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
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
              value={plain}
              onChange={e => handlePlain(e.target.value)}
              rows={7}
              placeholder="Wpisz opis produktu..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm text-slate-800
                outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                resize-none transition placeholder-slate-400"
            />
          ) : preview ? (
            <div className="w-full min-h-[140px] px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html || "<p class='text-slate-400 italic'>Brak treści HTML</p>" }} />
          ) : (
            <textarea
              value={html}
              onChange={e => handleHtml(e.target.value)}
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
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
        <span className="ml-1.5 text-[10px] font-mono text-slate-400">{field.field_code}</span>
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

// ── Marketplace category card ─────────────────────────────────────
function MarketplaceCard({ marketplace, selected, dbCategories, allegroTree, onChange }: {
  marketplace: Marketplace; selected?: MarketplaceCategory;
  dbCategories: { id: number; path: string; name: string }[];
  allegroTree: { id: string; name: string }[];
  onChange: (val: Partial<MarketplaceCategory>) => void;
}) {
  const isAllegro  = marketplace.slug === "allegro";
  const [search, setSearch] = useState("");
  const filtered = isAllegro
    ? allegroTree.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : dbCategories.filter(c => c.path.toLowerCase().includes(search.toLowerCase()));
  const isAssigned = !!(selected?.categoryPath || selected?.allegroName);

  return (
    <div className={`rounded-xl border-2 p-4 transition ${isAssigned ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAssigned ? "bg-green-500" : "bg-slate-300"}`} />
          <span className="font-semibold text-slate-700 text-sm">{marketplace.name}</span>
          {isAllegro && (
            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-semibold">API</span>
          )}
        </div>
        {isAssigned && (
          <button onClick={() => onChange({ categoryId: undefined, categoryPath: undefined, allegroId: undefined, allegroName: undefined })}
            className="text-xs text-red-400 hover:text-red-600 transition">Usuń</button>
        )}
      </div>
      {isAssigned ? (
        <div className="text-xs bg-white rounded-lg border border-green-200 px-3 py-2 text-slate-700 font-medium">
          {selected?.categoryPath || selected?.allegroName}
        </div>
      ) : (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAllegro ? "Szukaj kategorii Allegro..." : "Szukaj kategorii..."}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none
              focus:border-indigo-400 bg-white text-slate-700 placeholder-slate-400 mb-2" />
          {search && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-50">
              {filtered.length === 0
                ? <div className="px-3 py-2 text-xs text-slate-400">Brak wyników</div>
                : filtered.slice(0, 25).map(c => (
                    <button key={(c as any).id}
                      onClick={() => {
                        isAllegro
                          ? onChange({ allegroId: (c as any).id, allegroName: (c as any).name })
                          : onChange({ categoryId: (c as any).id, categoryPath: (c as any).path });
                        setSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                      {isAllegro ? (c as any).name : (c as any).path}
                    </button>
                  ))}
            </div>
          )}
          {!search && <div className="text-xs text-slate-400 text-center py-1">Wpisz frazę aby wyszukać kategorię</div>}
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
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Marketplace</div>
            <Sel value={mediaViewMp} onChange={e => setMediaViewMp(e.target.value)}>
              <option value="__global__">Globalne (domyślne)</option>
              {marketplaces.map(mp => <option key={mp.slug} value={mp.slug}>{mp.name}</option>)}
            </Sel>
          </div>
          {!isGlobal && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Opcje</div>
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

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 space-x-3">
            <span><span className="font-medium text-slate-600">{filledCount}</span> / {SLOTS} zdjęć</span>
            <span>·</span>
            <span>Akceptowane: <span className="font-medium text-slate-600">JPG · PNG · WEBP · GIF</span></span>
            <span>· Max <span className="font-medium text-slate-600">{MAX_MB} MB</span></span>
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
          ${url ? "border-slate-200 bg-slate-100"
            : drag ? "border-indigo-400 bg-indigo-50 scale-[1.02]"
            : readOnly ? "border-slate-100 bg-slate-50 cursor-default"
            : "border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"}`}>
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
