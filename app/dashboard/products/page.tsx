"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}
function authHeadersJSON() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}

type Product = {
  id: number;
  ean: string | null;
  sku: string | null;
  asin: string | null;
  title: string | null;
  brand: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  integrations: string | null;
};

// ── Icons ──────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  );
}

// ── Import modal ──────────────────────────────────────────────────
type ImportState = "idle" | "uploading" | "processing" | "success" | "error";

const MP_LABELS: Record<string, string> = {
  mediaexpert: "Media Expert",
  allegro:     "Allegro",
  empik:       "Empik",
  decathlon:   "Decathlon",
  xkom:        "X-Kom",
};

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]               = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [state, setState]             = useState<ImportState>("idle");
  const [errorMsg, setErrorMsg]       = useState("");
  const [importId, setImportId]       = useState<number | null>(null);
  const [detectedMp, setDetectedMp]   = useState<string | null>(null);
  const [missingCats, setMissingCats] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMsg("Akceptowane formaty: .xlsx, .xls, .csv");
      setState("error"); return;
    }
    setFile(f); setState("idle"); setErrorMsg(""); setDetectedMp(null); setMissingCats([]);
  };

  useEffect(() => {
    if (!importId) return;
    pollRef.current = setInterval(async () => {
      const res  = await fetch(`${API}/api/products/import-status/${importId}`, { headers: authHeaders() });
      const json = await res.json();
      const d    = json.data;
      if (!d) return;
      if (d.status === "done") {
        clearInterval(pollRef.current!);
        // Sprawdz czy sa brakujace kategorie
        if (d.error_message) {
          try {
            const parsed = JSON.parse(d.error_message);
            if (parsed.missingCategories?.length) {
              setMissingCats(parsed.missingCategories);
            }
          } catch {}
        }
        setState("success");
        onSuccess();
      }
      if (d.status === "error") {
        clearInterval(pollRef.current!);
        setState("error");
        let msg = d.error_message || "Blad importu";
        try { const p = JSON.parse(msg); msg = p.hint || msg; } catch {}
        setErrorMsg(msg);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [importId, onSuccess]);

  const doUpload = async () => {
    if (!file) return;
    setState("uploading"); setErrorMsg(""); setDetectedMp(null); setMissingCats([]);
    const fd = new FormData();
    fd.append("products", file);
    try {
      const res  = await fetch(`${API}/api/products/import`, { method: "POST", headers: authHeaders(), body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Blad importu");
      setImportId(json.importId);
      setDetectedMp(json.detectedMarketplace || null);
      setState("processing");
    } catch (err: any) {
      setState("error"); setErrorMsg(err.message);
    }
  };

  const mpLabel = detectedMp ? (MP_LABELS[detectedMp] || detectedMp) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Import produkt&oacute;w</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info o auto-wykrywaniu */}
          <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
            <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>Format pliku (Media Expert, Allegro&hellip;) jest wykrywany automatycznie.</span>
          </div>

          {/* Wykryty marketplace (po wgraniu) */}
          {mpLabel && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Wykryto: {mpLabel}
            </div>
          )}

          {/* Ostrzezenie o brakujacych kategoriach */}
          {missingCats.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <div className="font-semibold mb-1">Brak kategorii w bazie:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {missingCats.slice(0, 5).map(c => <li key={c} className="font-mono text-xs">{c}</li>)}
                {missingCats.length > 5 && <li className="text-xs">...i {missingCats.length - 5} wi&#281;cej</li>}
              </ul>
              <div className="mt-2 text-xs text-amber-700">
                Zaimportuj szablon marketplace, aby produkty z tych kategorii by&#322;y w pe&#322;ni mapowane.
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging ? "border-indigo-400 bg-indigo-50"
              : file   ? "border-green-400 bg-green-50"
              :          "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            }`}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }} />
            {file ? (
              <div className="text-sm font-semibold text-green-700">
                {file.name} &middot; {(file.size / 1024).toFixed(0)} KB
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <UploadIcon />
                <div className="text-sm">Przeci&#261;gnij plik lub kliknij</div>
                <div className="text-xs">.xlsx &middot; .xls &middot; .csv</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          {state === "idle" && (
            <button onClick={doUpload} disabled={!file}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                bg-gradient-to-r from-indigo-500 to-purple-500
                disabled:opacity-40 shadow-md hover:shadow-lg transition-all">
              Importuj produkty
            </button>
          )}
          {(state === "uploading" || state === "processing") && (
            <div className="w-full py-3 text-center text-sm text-indigo-600 font-medium flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {state === "processing" ? `Przetwarzanie${mpLabel ? ` (${mpLabel})` : ""}...` : "Wysylanie..."}
            </div>
          )}
          {state === "success" && (
            <button onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-green-500 hover:bg-green-600 transition">
              Gotowe &mdash; poka&#380; produkty
            </button>
          )}
          {state === "error" && (
            <div className="space-y-2">
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{errorMsg}</div>
              <button onClick={() => { setState("idle"); setFile(null); setErrorMsg(""); setDetectedMp(null); }}
                className="w-full py-2 rounded-xl text-slate-600 text-sm bg-slate-100 hover:bg-slate-200 transition">
                Spr&oacute;buj ponownie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Parsuj integracje z formatu "slug\x01name\x01missingCount|||..."
type Integration = { slug: string; name: string; missing: number };
function parseIntegrations(raw: string | null): Integration[] {
  if (!raw) return [];
  return raw.split("|||").filter(Boolean).map(s => {
    const parts = s.split("\x01");
    return { slug: parts[0] ?? "", name: parts[1] ?? parts[0] ?? "", missing: parseInt(parts[2] ?? "0") || 0 };
  });
}

// ── Confirm delete modal ──────────────────────────────────────────
function ConfirmDeleteModal({ count, onConfirm, onCancel, loading }: {
  count: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-[fadeInUp_0.15s_ease-out]">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-slate-800 text-center mb-1">
          {count === 1 ? "Usun\u0105\u0107 produkt?" : `Usun\u0105\u0107 ${count} produkt\u00f3w?`}
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          {count === 1
            ? "Ten produkt zostanie trwale usuni\u0119ty wraz ze wszystkimi przypisanymi atrybutami i kategoriami. Tej operacji nie mo\u017Cna cofn\u0105\u0107."
            : `Wybrane ${count} produkt\u00f3w zostanie trwale usuni\u0119tych wraz ze wszystkimi przypisanymi atrybutami i kategoriami. Tej operacji nie mo\u017Cna cofn\u0105\u0107.`}
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold
              text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50">
            Anuluj
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-white transition ${loading ? "bg-red-300 cursor-wait" : "bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"}`}>
            {loading
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>Usuwanie...</>
              : <><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>{count === 1 ? "Usu\u0144 produkt" : `Usu\u0144 ${count} produkt\u00f3w`}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTER = [
  { value: "",             label: "Wszystkie" },
  { value: "mapped",       label: "Aktywne"   },
  { value: "pending",      label: "Oczekuje"  },
  { value: "needs_review", label: "Do poprawy"},
  { value: "exported",     label: "Eksport"   },
];

// ── Main page ─────────────────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts]           = useState<Product[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [mpFilter, setMpFilter]           = useState("");
  const [marketplaces, setMarketplaces]   = useState<{slug:string;name:string}[]>([]);
  const [page, setPage]                   = useState(1);
  const [showImport, setShowImport]       = useState(false);
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu]           = useState<number | null>(null);
  const [exporting, setExporting]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const LIMIT = 50;

  // Załaduj listę marketplace do filtra
  useEffect(() => {
    fetch(`${API}/api/templates/marketplaces`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { if (j.data) setMarketplaces(j.data); }).catch(() => {});
  }, []);

  const loadProducts = useCallback(async (s = search, p = page, st = statusFilter, mp = mpFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: s, page: String(p), limit: String(LIMIT), status: st, marketplace: mp });
      const res    = await fetch(`${API}/api/products/list?${params}`, { headers: authHeaders() });
      const json   = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProducts(json.data || []);
      setTotal(json.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter, mpFilter]);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadProducts(search, 1, statusFilter, mpFilter); }, 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, mpFilter]);

  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Usun ten produkt?")) return;
    await fetch(`${API}/api/products/${id}`, { method: "DELETE", headers: authHeadersJSON() });
    loadProducts();
  };

  const handleExport = async () => {
    if (!mpFilter || selected.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/api/products/export`, {
        method: "POST", headers: authHeadersJSON(),
        body: JSON.stringify({ productIds: [...selected], marketplace: mpFilter }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${mpFilter}_export_${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert("B\u0142\u0105d eksportu: " + e.message); }
    finally { setExporting(false); }
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      for (const id of selected) {
        await fetch(`${API}/api/products/${id}`, { method: "DELETE", headers: authHeadersJSON() });
      }
      setSelected(new Set());
      setShowDeleteConfirm(false);
      loadProducts();
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p.id)));
  };

  const totalPages  = Math.ceil(total / LIMIT);
  const allChecked  = products.length > 0 && selected.size === products.length;
  const someChecked = selected.size > 0 && selected.size < products.length;
  const selectedReadyCount = mpFilter
    ? [...selected].filter(id => {
        const p = products.find(x => x.id === id);
        if (!p) return false;
        const integ = parseIntegrations(p.integrations);
        const mp    = integ.find(i => i.slug === mpFilter);
        return mp && mp.missing === 0;
      }).length
    : 0;

  return (
    <div>
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); loadProducts(); }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          count={selected.size}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lista produkt&oacute;w</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {total > 0 ? `${total} produkt${total === 1 ? "" : "ow"}` : "Brak produkt&oacute;w"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm text-slate-700
              bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition">
            <UploadIcon /> Import
          </button>
          <button onClick={() => router.push("/dashboard/new-product")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white text-sm
              bg-gradient-to-r from-purple-500 to-indigo-500
              shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200">
            <PlusIcon /> Dodaj produkt
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-2 mb-3">
        {/* Wyszukiwarka + status */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj po nazwie, EAN, SKU, marce..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white border border-slate-200
                text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTER.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === f.value
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtr marketplace */}
        {marketplaces.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Marketplace:</span>
            <button onClick={() => setMpFilter("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                mpFilter === ""
                  ? "bg-slate-700 text-white border-slate-700"
                  : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
              }`}>
              Wszystkie
            </button>
            {marketplaces.map(mp => (
              <button key={mp.slug} onClick={() => setMpFilter(mp.slug)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  mpFilter === mp.slug
                    ? "bg-slate-700 text-white border-slate-700"
                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                }`}>
                {mp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm flex-wrap">
          <span className="text-indigo-700 font-medium">{selected.size} zaznaczonych</span>

          {/* Eksport do marketplace */}
          {mpFilter && (
            <button onClick={handleExport} disabled={exporting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                exporting
                  ? "bg-green-200 text-green-700 cursor-wait"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}>
              {exporting
                ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Eksportowanie...</>
                : <><svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Eksportuj do {marketplaces.find(m => m.slug === mpFilter)?.name ?? mpFilter}
                  {selectedReadyCount > 0 && <span className="ml-1 bg-white/30 px-1 rounded">{selectedReadyCount} gotowych</span>}</>}
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto text-red-500 hover:text-red-700 font-medium text-xs">
            Usu&#324; zaznaczone
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">

        {/* Column headers */}
        <div className="grid items-center px-4 py-3 bg-slate-50 border-b border-slate-100"
          style={{ gridTemplateColumns: "36px 44px 1fr 180px 40px" }}>
          <div className="flex items-center justify-center">
            <input type="checkbox" checked={allChecked} onChange={toggleAll}
              ref={el => { if (el) el.indeterminate = someChecked; }}
              className="w-3.5 h-3.5 rounded cursor-pointer accent-indigo-600" />
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          {["PRODUKT", "INTEGRACJE", ""].map((h, i) => (
            <div key={i} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-2">{h}</div>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Ladowanie...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-600 mb-1">
                {search || statusFilter ? "Brak wynikow" : "Brak produktow"}
              </div>
              <div className="text-sm text-slate-400">
                {!search && !statusFilter
                  ? "Dodaj produkt recznie lub zaimportuj plik CSV / Excel."
                  : "Zmien filtry lub wyszukaj inna fraze."}
              </div>
            </div>
            {!search && !statusFilter && (
              <div className="flex gap-2 mt-1">
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                    text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">
                  <UploadIcon /> Import produktow
                </button>
                <button onClick={() => router.push("/dashboard/new-product")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                    text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                  <PlusIcon /> Dodaj recznie
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {products.map(p => {
                const integList  = parseIntegrations(p.integrations);
                const isSelected = selected.has(p.id);

                return (
                  <div key={p.id}
                    className={`grid items-center px-4 py-3 group cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50"
                    }`}
                    style={{ gridTemplateColumns: "36px 44px 1fr 180px 40px" }}
                    onClick={() => router.push(`/dashboard/products/${p.id}`)}>

                    {/* Checkbox */}
                    <div className="flex items-center justify-center"
                      onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                        className="w-3.5 h-3.5 rounded cursor-pointer accent-indigo-600" />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title || ""} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="min-w-0 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {p.title || <span className="text-slate-400 font-normal italic">Brak nazwy</span>}
                        </span>
                        {p.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0
                            text-indigo-600 bg-indigo-50">
                            {p.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono">ID {p.id}</span>
                        {p.sku  && <span className="text-[10px] text-slate-400 font-mono">SKU {p.sku}</span>}
                        {p.ean  && <span className="text-[10px] text-slate-400 font-mono">EAN {p.ean}</span>}
                        {p.asin && <span className="text-[10px] text-slate-400 font-mono">ASIN {p.asin}</span>}
                      </div>
                    </div>

                    {/* Integrations */}
                    <div className="pl-2 flex items-center gap-1 flex-wrap">
                      {integList.length > 0
                        ? integList.map(integ => {
                            const ready = integ.missing === 0;
                            const isFiltered = mpFilter === integ.slug;
                            return (
                              <span key={integ.slug}
                                title={ready ? "Wszystkie wymagane atrybuty uzupe\u0142nione" : `Brakuje ${integ.missing} atrybut\u00f3w`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                  ready
                                    ? isFiltered
                                      ? "bg-green-100 text-green-800 border-green-300"
                                      : "bg-green-50 text-green-700 border-green-200"
                                    : isFiltered
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ready ? "bg-green-500" : "bg-amber-400"}`} />
                                {integ.name}
                              </span>
                            );
                          })
                        : <span className="text-[10px] text-slate-300">&mdash;</span>
                      }
                    </div>

                    {/* Dots menu */}
                    <div className="relative flex justify-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100
                          rounded-lg transition opacity-0 group-hover:opacity-100">
                        <DotsIcon />
                      </button>
                      {openMenu === p.id && (
                        <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl shadow-xl
                          border border-slate-200 overflow-hidden">
                          <button onClick={() => router.push(`/dashboard/products/${p.id}`)}
                            className="w-full text-left px-3 py-2.5 text-xs text-slate-600 font-medium hover:bg-slate-50 transition">
                            Edytuj
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            className="w-full text-left px-3 py-2.5 text-xs text-red-500 font-medium hover:bg-red-50 transition">
                            Usun produkt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <div className="text-xs text-slate-400">
                  Strona {page} z {totalPages} &middot; {total} produkt&oacute;w
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => { const np = page - 1; setPage(np); loadProducts(search, np, statusFilter); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200
                      text-slate-600 hover:bg-white disabled:opacity-40 transition">
                    &larr;
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(pg => (
                    <button key={pg}
                      onClick={() => { setPage(pg); loadProducts(search, pg, statusFilter); }}
                      className={`w-8 h-8 text-xs rounded-lg border transition font-medium ${
                        page === pg
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}>
                      {pg}
                    </button>
                  ))}
                  <button
                    disabled={page === totalPages}
                    onClick={() => { const np = page + 1; setPage(np); loadProducts(search, np, statusFilter); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200
                      text-slate-600 hover:bg-white disabled:opacity-40 transition">
                    &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
