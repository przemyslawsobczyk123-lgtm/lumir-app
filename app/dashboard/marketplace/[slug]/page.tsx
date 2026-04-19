"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const MP_LABELS: Record<string, string> = {
  mediaexpert: "Media Expert",
  allegro:     "Allegro",
  empik:       "Empik",
};

const IMPORT_ENABLED  = ["mediaexpert", "empik"];
const ALLEGRO_SLUG    = "allegro";

// ── Types ────────────────────────────────────────────────────────────
type DbCategory = { id: number; path: string; name: string; field_count: number };

type AllegroCategory = {
  id: string; name: string; leaf: boolean;
  parent?: { id: string } | null;
};

type AllegroStatus = {
  status: string;
  hoursLeft: number;
  minutesLeft: number;
};

type SellerAllegroAccount = {
  environment: string;
  status: string;
  minutesLeft: number;
};

type ImportSummary = {
  catCount?: number;
  fieldCount?: number;
};

type Favorite = {
  id: number; category_id: number; category_path: string;
  category_name: string; is_pinned: number; use_count: number; last_used_at: string | null;
};

type Tab = "categories" | "favorites" | "import";

// ── Helpers ──────────────────────────────────────────────────────────
function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
}
function authHeadersForm() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ── Icons ────────────────────────────────────────────────────────────
function StarIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}
      fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function PinIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill={active ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5c0 3.5-5 13-5 13S7 10.5 7 7a5 5 0 0 1 5-5z"/>
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

// ── Search input ─────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <SearchIcon />
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-input)" }}
        className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm
          border-2 placeholder-[var(--text-tertiary)] outline-none
          focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition" />
      {value && (
        <button onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"
            stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

// ── Allegro: Integration banner ───────────────────────────────────────
function AllegroIntegrationBanner({ status }: { status: AllegroStatus | null }) {
  const isValid  = status?.status === "valid";
  const hoursLeft = status?.hoursLeft ?? 0;
  const minLeft   = status?.minutesLeft ? status.minutesLeft % 60 : 0;

  return (
    <div
      className="rounded-2xl border p-4 mb-6 flex items-start gap-4"
      style={{
        background: isValid ? "var(--bg-input-alt)" : "var(--color-red-bg, #fef2f2)",
        borderColor: isValid ? "var(--border-default)" : "#fca5a5",
      }}
    >
      {/* Allegro badge — project gradient */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-sm shadow-sm"
        style={{ background: isValid ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#f87171" }}
      >
        A
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Integracja Allegro API</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
            isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}>
            {isValid ? "● Połączono" : "● Brak połączenia"}
          </span>
          {isValid && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              Token ważny {hoursLeft}h {minLeft}min
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Kategorie pobierane <strong>automatycznie z Allegro API</strong> — nie trzeba importować plików.
          Przeglądaj drzewo kategorii i wybierz odpowiednią dla swojego produktu.
        </p>
        {!isValid && (
          <a href={`${API}/allegro/auth/login`} target="_blank"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white
              px-3 py-1.5 rounded-lg transition hover:shadow-md hover:scale-105"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Zaloguj się do Allegro →
          </a>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 text-right">
        <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Synchronizacja</div>
        <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Automatyczna</div>
        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Live z Allegro</div>
      </div>
    </div>
  );
}

// ── Allegro: Category tree browser ───────────────────────────────────
type BreadcrumbItem = { id: string | null; name: string };

function AllegroTreeBrowser({
  favSet, onToggleFav, onSelect,
}: {
  favSet: Set<number>;
  onToggleFav: (cat: { id: string; name: string; path: string }) => void;
  onSelect: (cat: { id: string; name: string; path: string }) => void;
}) {
  const [items, setItems]           = useState<AllegroCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: null, name: "Allegro" },
  ]);

  const loadCategories = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setError("");
    setSearch("");
    try {
      const url = parentId
        ? `${API}/api/allegro/categories?parentId=${parentId}`
        : `${API}/api/allegro/categories`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd API");
      setItems(json.data || []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Nie udało się pobrać kategorii Allegro"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(null); }, [loadCategories]);

  function navigate(cat: AllegroCategory) {
    if (cat.leaf) return; // leaf — handled by row click
    setBreadcrumb(prev => [...prev, { id: cat.id, name: cat.name }]);
    loadCategories(cat.id);
  }

  function goToBreadcrumb(index: number) {
    const newBc = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBc);
    loadCategories(newBc[newBc.length - 1].id);
  }

  const filtered = useMemo(() =>
    search
      ? items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      : items,
    [items, search]);

  const pathFor = (cat: AllegroCategory) =>
    [...breadcrumb.map(b => b.name), cat.name].filter(n => n !== "Allegro").join(" / ");

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b flex items-center gap-1 flex-wrap" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)" }}>
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight />}
            <button
              onClick={() => goToBreadcrumb(i)}
              className={`text-xs px-2 py-1 rounded-lg transition ${
                i === breadcrumb.length - 1
                  ? "font-semibold text-indigo-600 bg-indigo-50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {b.name}
            </button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border-light)" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Szukaj w tej kategorii..." />
      </div>

      {/* List */}
      <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: "var(--border-light)" }}>
        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block w-5 h-5 border-2 border-indigo-300 border-t-indigo-600
              rounded-full animate-spin mb-2" />
            <div className="text-sm text-slate-400">Pobieranie z Allegro API...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-400 font-medium text-sm mb-1">{error}</div>
            <div className="text-xs text-slate-400">
              Sprawdź czy jesteś zalogowany do Allegro.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Brak wyników</div>
        ) : filtered.map(cat => {
          const path    = pathFor(cat);
          const catKey  = parseInt(cat.id, 10);   // ID Allegro jest numeryczny — używamy bezpośrednio
          const isFav   = favSet.has(catKey);

          return (
            <div key={cat.id}
              className="flex items-center justify-between px-4 py-3 group transition"
              style={{ cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={cat.leaf ? "text-slate-400" : "text-indigo-400"}>
                  {cat.leaf ? <TagIcon /> : <FolderIcon />}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cat.name}</div>
                  {!cat.leaf && (
                    <div className="text-[11px] text-slate-400">Kliknij aby rozwinąć</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {cat.leaf ? (
                  <>
                    <button
                      onClick={() => onToggleFav({ id: cat.id, name: cat.name, path })}
                      title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                      className={`p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 ${
                        isFav
                          ? "text-amber-400 opacity-100 hover:text-slate-400"
                          : "text-slate-200 hover:text-amber-400"
                      }`}
                    >
                      <StarIcon filled={isFav} className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onSelect({ id: cat.id, name: cat.name, path })}
                      className="px-3 py-1.5 text-xs font-medium text-white
                        rounded-lg transition opacity-0 group-hover:opacity-100 hover:scale-105"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                    >
                      Wybierz
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => navigate(cat)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                      text-slate-500 hover:text-indigo-600 hover:bg-indigo-50
                      rounded-lg transition opacity-0 group-hover:opacity-100"
                  >
                    Otwórz <ChevronRight />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t text-xs flex justify-between" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)", color: "var(--text-tertiary)" }}>
        <span>{filtered.length} pozycji</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
          Allegro API
        </span>
      </div>
    </div>
  );
}

// ── Favorite row ─────────────────────────────────────────────────────
function FavRow({ fav, onUse, onRemove, onPin }: {
  fav: Favorite; onUse: (f: Favorite) => void;
  onRemove: (id: number) => void; onPin: (id: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3
      group border-b last:border-0 transition"
      style={{ borderColor: "var(--border-light)" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "")}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{fav.category_name}</div>
        <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{fav.category_path}</div>
        {fav.use_count > 0 && (
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted, var(--text-tertiary))" }}>używana {fav.use_count}×</div>
        )}
      </div>
      <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => onPin(fav.category_id)} title={fav.is_pinned ? "Odepnij" : "Przypnij"}
          className={`p-1.5 rounded-lg transition ${
            fav.is_pinned
              ? "text-indigo-500 bg-indigo-50 hover:bg-indigo-100"
              : "text-slate-300 hover:text-indigo-400 hover:bg-indigo-50"
          }`}>
          <PinIcon active={!!fav.is_pinned} />
        </button>
        <button onClick={() => onRemove(fav.category_id)} title="Usuń z ulubionych"
          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
            stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <button onClick={() => onUse(fav)}
          className="px-3 py-1.5 text-xs font-semibold bg-indigo-500 text-white
            rounded-lg hover:bg-indigo-600 transition ml-1">
          Wybierz →
        </button>
      </div>
    </div>
  );
}

// ── Import tab (Mirakl only) ──────────────────────────────────────────
function ImportTab({ slug, label }: { slug: string; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState]       = useState<"idle"|"uploading"|"success"|"error">("idle");
  const [result, setResult]     = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const pickFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMsg("Akceptowane formaty: .xlsx, .xls"); setState("error"); return;
    }
    setFile(f); setState("idle"); setErrorMsg(""); setResult(null);
  };

  const doUpload = async () => {
    if (!file) return;
    setState("uploading"); setErrorMsg(""); setResult(null);
    const fd = new FormData();
    fd.append("template", file); fd.append("marketplace", slug);
    try {
      const res  = await fetch(`${API}/api/templates/import`, {
        method: "POST", headers: authHeadersForm(), body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd importu");
      const importData = typeof json.data === "object" && json.data
        ? json.data as ImportSummary
        : {};
      setResult(importData); setState("success"); setFile(null);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, "Nie udało się zaimportować szablonu")); setState("error");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border rounded-2xl p-5 mb-6 flex gap-4" style={{ background: "var(--bg-input-alt)", borderColor: "var(--border-default)" }}>
        <div className="text-2xl">ℹ️</div>
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Import szablonu kategorii — {label}
          </div>
          <div className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
            <p>Wgraj plik <strong>.xlsx</strong> pobrany z panelu Mirakl ({label}).</p>
            <p>System automatycznie wykryje kategorie i pola wymagane dla tego marketplace.</p>
            <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
              ⚠️ Nowy import <strong>dezaktywuje poprzedni</strong> szablon dla tego marketplace.
            </p>
          </div>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200 ${
          dragging ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
          : file ? "border-green-400 bg-green-500/10"
          : "border-[var(--border-default)] hover:border-indigo-300"
        }`}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-800">{file.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <div className="text-xs text-slate-400">Kliknij, aby wybrać inny plik</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor"
                strokeWidth={1.5} strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-600">Przeciągnij plik lub kliknij</div>
              <div className="text-xs mt-1">Obsługiwane: .xlsx, .xls</div>
            </div>
          </div>
        )}
      </div>

      {file && state !== "uploading" && (
        <button onClick={doUpload}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-white text-sm
            bg-gradient-to-r from-indigo-500 to-purple-500
            hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all">
          Importuj szablon dla {label}
        </button>
      )}
      {state === "uploading" && (
        <div className="mt-4 w-full py-3 rounded-xl bg-indigo-100 text-indigo-600
          text-sm font-semibold text-center flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Przetwarzanie...
        </div>
      )}
      {state === "success" && result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</div>
            Import zakończony pomyślnie!
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Kategorie",   value: result.catCount   ?? "—" },
              { label: "Pola",        value: result.fieldCount ?? "—" },
              { label: "Marketplace", value: label },
            ].map(({ label: l, value }) => (
              <div key={l} className="rounded-xl border border-green-100 p-3 text-center" style={{ background: "var(--bg-card)" }}>
                <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { setState("idle"); setResult(null); }}
            className="mt-3 text-xs text-green-600 hover:text-green-800 underline">
            Importuj kolejny plik
          </button>
        </div>
      )}
      {state === "error" && errorMsg && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <div className="text-red-500 mt-0.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-red-700">Błąd importu</div>
            <div className="text-sm text-red-600 mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════
export default function MarketplaceCategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params.slug as string;
  const label  = MP_LABELS[slug] || slug;
  const isAllegro  = slug === ALLEGRO_SLUG;
  const canImport  = IMPORT_ENABLED.includes(slug);

  const [tab, setTab]                 = useState<Tab>("categories");
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [favorites, setFavorites]     = useState<Favorite[]>([]);
  const [search, setSearch]           = useState("");
  const [favSearch, setFavSearch]     = useState("");
  const [loading, setLoading]         = useState(true);
  const [favLoading, setFavLoading]   = useState(false);
  const [pending, setPending]         = useState<Set<number>>(new Set());
  const [allegroStatus, setAllegroStatus] = useState<AllegroStatus | null>(null);

  // Load Allegro status — per-seller accounts (same source as Konta Allegro page)
  useEffect(() => {
    if (!isAllegro) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    fetch(`${API}/api/seller/allegro/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(j => {
        const accounts = Array.isArray(j.data) ? j.data as SellerAllegroAccount[] : [];
        if (!accounts.length) return;
        // Use production account first, fallback to sandbox
        const prod = accounts.find(account => account.environment === "production");
        const acct = prod ?? accounts[0];
        setAllegroStatus({
          status:     acct.status,
          hoursLeft:  Math.floor(acct.minutesLeft / 60),
          minutesLeft: acct.minutesLeft,
        });
      })
      .catch(() => {});
  }, [isAllegro]);

  // Load DB categories (Mirakl only)
  useEffect(() => {
    if (isAllegro) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API}/api/templates/categories?marketplace=${slug}`)
      .then(r => r.json())
      .then(j => setDbCategories((j.data || []).filter((c: DbCategory) => c.field_count > 13)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, isAllegro]);

  // Load favorites
  const loadFavorites = useCallback(() => {
    setFavLoading(true);
    fetch(`${API}/api/favorites/${slug}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setFavorites(j.data || []))
      .catch(() => {})
      .finally(() => setFavLoading(false));
  }, [slug]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const favSet = useMemo(() => new Set(favorites.map(f => f.category_id)), [favorites]);

  const filteredDbCats = useMemo(() =>
    dbCategories.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.path.toLowerCase().includes(search.toLowerCase())
    ), [dbCategories, search]);

  const filteredFavs = useMemo(() =>
    favorites.filter(f =>
      f.category_name.toLowerCase().includes(favSearch.toLowerCase()) ||
      f.category_path.toLowerCase().includes(favSearch.toLowerCase())
    ), [favorites, favSearch]);

  // Toggle favorite — optimistic (works for both Allegro and Mirakl)
  async function toggleDbFavorite(cat: DbCategory) {
    if (pending.has(cat.id)) return;
    setPending(p => new Set(p).add(cat.id));
    const isFav = favSet.has(cat.id);
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.category_id !== cat.id));
    } else {
      setFavorites(prev => [{
        id: Date.now(), category_id: cat.id, category_path: cat.path,
        category_name: cat.name, is_pinned: 0, use_count: 0, last_used_at: null,
      }, ...prev]);
    }
    try {
      if (isFav) {
        await fetch(`${API}/api/favorites/${slug}/${cat.id}`, { method: "DELETE", headers: authHeaders() });
      } else {
        await fetch(`${API}/api/favorites/${slug}`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ categoryId: cat.id, categoryPath: cat.path, categoryName: cat.name }),
        });
      }
    } catch { loadFavorites(); }
    finally { setPending(p => { const s = new Set(p); s.delete(cat.id); return s; }); }
  }

  // Allegro category toggle: store real numeric Allegro ID
  async function toggleAllegroFavorite(cat: { id: string; name: string; path: string }) {
    const numId = parseInt(cat.id, 10); // Allegro IDs są liczbami — nie używamy hash hex
    if (pending.has(numId)) return;
    setPending(p => new Set(p).add(numId));
    const isFav = favSet.has(numId);
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.category_id !== numId));
    } else {
      setFavorites(prev => [{
        id: Date.now(), category_id: numId, category_path: cat.path,
        category_name: cat.name, is_pinned: 0, use_count: 0, last_used_at: null,
      }, ...prev]);
    }
    try {
      if (isFav) {
        await fetch(`${API}/api/favorites/${slug}/${numId}`, { method: "DELETE", headers: authHeaders() });
      } else {
        await fetch(`${API}/api/favorites/${slug}`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ categoryId: numId, categoryPath: cat.path, categoryName: cat.name }),
        });
      }
    } catch { loadFavorites(); }
    finally { setPending(p => { const s = new Set(p); s.delete(numId); return s; }); }
  }

  async function removeFavorite(categoryId: number) {
    setFavorites(prev => prev.filter(f => f.category_id !== categoryId));
    await fetch(`${API}/api/favorites/${slug}/${categoryId}`, { method: "DELETE", headers: authHeaders() });
  }

  async function togglePin(categoryId: number) {
    setFavorites(prev => prev.map(f =>
      f.category_id === categoryId ? { ...f, is_pinned: f.is_pinned ? 0 : 1 } : f
    ));
    await fetch(`${API}/api/favorites/${slug}/${categoryId}/pin`, { method: "PATCH", headers: authHeaders() });
  }

  async function useCategory(fav: Favorite) {
    fetch(`${API}/api/favorites/${slug}/${fav.category_id}/use`, { method: "POST", headers: authHeaders() });
    router.push(`/dashboard/new-product?marketplace=${slug}&category=${encodeURIComponent(fav.category_path)}`);
  }

  const pinnedFavs   = filteredFavs.filter(f => f.is_pinned);
  const unpinnedFavs = filteredFavs.filter(f => !f.is_pinned);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1">
          <span className="cursor-pointer hover:text-slate-600"
            onClick={() => router.push("/dashboard")}>Dashboard</span>
          {" / "}{label}
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{label}</h1>
          {isAllegro && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold
              bg-indigo-100 text-indigo-700 border border-indigo-200">
              API Integration
            </span>
          )}
        </div>
      </div>

      {/* Allegro banner */}
      {isAllegro && <AllegroIntegrationBanner status={allegroStatus} />}

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b-2" style={{ borderColor: "var(--border-default)" }}>
        <button onClick={() => setTab("categories")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-0.5 transition ${
            tab === "categories"
              ? `border-b-2 ${isAllegro ? "border-indigo-500 text-indigo-600" : "border-indigo-500 text-indigo-600"}`
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}>
          Kategorie
        </button>

        <button onClick={() => setTab("favorites")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-0.5 transition flex items-center gap-2 ${
            tab === "favorites"
              ? `border-b-2 ${isAllegro ? "border-indigo-500 text-indigo-600" : "border-indigo-500 text-indigo-600"}`
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}>
          Ulubione
          {favorites.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              tab === "favorites" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
            }`}>{favorites.length}</span>
          )}
        </button>

        {canImport && (
          <button onClick={() => setTab("import")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-0.5 transition flex items-center gap-2 ${
              tab === "import"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import Kategorii
          </button>
        )}
      </div>

      {/* ── KATEGORIE ── */}
      {tab === "categories" && (
        isAllegro ? (
          <AllegroTreeBrowser
            favSet={favSet}
            onToggleFav={toggleAllegroFavorite}
            onSelect={cat => router.push(
              `/dashboard/new-product?marketplace=${slug}&category=${encodeURIComponent(cat.path)}`
            )}
          />
        ) : (
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)" }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Szukaj kategorii..." />
            </div>
            {loading ? (
              <div className="p-10 text-center text-slate-400">Ładowanie kategorii...</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto" style={{ borderColor: "var(--border-light)" }}>
                {filteredDbCats.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    {search ? <>Brak wyników dla &bdquo;{search}&rdquo;</> : "Brak kategorii — zaimportuj szablon Mirakl."}
                  </div>
                ) : filteredDbCats.map(cat => {
                  const isFav = favSet.has(cat.id);
                  return (
                    <div key={cat.id}
                      className="flex items-center justify-between px-5 py-3 group transition"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cat.name}</div>
                        <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{cat.path}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => toggleDbFavorite(cat)}
                          disabled={pending.has(cat.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isFav
                              ? "text-amber-400 hover:text-slate-400"
                              : "text-slate-200 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                          }`}>
                          <StarIcon filled={isFav} className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => router.push(
                            `/dashboard/new-product?marketplace=${slug}&category=${encodeURIComponent(cat.path)}`
                          )}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-500 text-white
                            rounded-lg hover:bg-indigo-600 transition opacity-0 group-hover:opacity-100">
                          Wybierz
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-3 border-t text-xs" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)", color: "var(--text-tertiary)" }}>
              {filteredDbCats.length} kategorii{search && ` • filtr: "${search}"`}
            </div>
          </div>
        )
      )}

      {/* ── ULUBIONE ── */}
      {tab === "favorites" && (
        <div className="grid grid-cols-[1fr_1.4fr] gap-6">
          {/* Lewa — przeglądanie */}
          <div className="rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)" }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                Dodaj do ulubionych
              </div>
              {!isAllegro && (
                <SearchInput value={search} onChange={setSearch} placeholder="Szukaj kategorii..." />
              )}
            </div>
            {isAllegro ? (
              <div className="p-4 text-sm text-slate-500">
                Przejdź do zakładki <strong>Kategorie</strong> i kliknij ⭐ przy dowolnej kategorii-liść.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 max-h-[520px] divide-y" style={{ borderColor: "var(--border-light)" }}>
                {loading ? (
                  <div className="p-8 text-center text-slate-400">Ładowanie...</div>
                ) : filteredDbCats.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Brak wyników</div>
                ) : filteredDbCats.map(cat => {
                  const isFav = favSet.has(cat.id);
                  return (
                    <div key={cat.id}
                      className="flex items-center justify-between px-4 py-2.5
                        group transition cursor-pointer"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                      onClick={() => toggleDbFavorite(cat)}>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm" style={{ color: "var(--text-primary)" }}>{cat.name}</div>
                        <div className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>{cat.path}</div>
                      </div>
                      <div className={`ml-3 flex-shrink-0 transition ${
                        isFav ? "text-amber-400" : "text-slate-200 group-hover:text-slate-300"
                      }`}>
                        <StarIcon filled={isFav} className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prawa — lista ulubionych */}
          <div className="rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-body)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Twoje ulubione</div>
                {favorites.length > 0 && (
                  <span className="bg-amber-100 text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {favorites.length}
                  </span>
                )}
              </div>
              <SearchInput value={favSearch} onChange={setFavSearch} placeholder="Szukaj w ulubionych..." />
            </div>
            <div className="overflow-y-auto flex-1 max-h-[520px]">
              {favLoading ? (
                <div className="p-8 text-center text-slate-400">Ładowanie...</div>
              ) : favorites.length === 0 ? (
                <div className="p-10 text-center">
                  <StarIcon filled={false} className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-500 mb-1">Brak ulubionych</div>
                  <div className="text-xs text-slate-400">Kliknij gwiazdkę przy kategorii, aby ją dodać.</div>
                </div>
              ) : filteredFavs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Brak wyników dla &bdquo;{favSearch}&rdquo;</div>
              ) : (
                <div>
                  {pinnedFavs.length > 0 && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase border-b
                        flex items-center gap-1.5"
                        style={{ color: "var(--text-tertiary)", background: "var(--bg-body)", borderColor: "var(--border-light)" }}>
                        <PinIcon active={true} /> Przypięte
                      </div>
                      {pinnedFavs.map(fav => (
                        <FavRow key={fav.id} fav={fav}
                          onUse={useCategory} onRemove={removeFavorite} onPin={togglePin} />
                      ))}
                    </>
                  )}
                  {unpinnedFavs.length > 0 && (
                    <>
                      {pinnedFavs.length > 0 && (
                        <div className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase border-b"
                          style={{ color: "var(--text-tertiary)", background: "var(--bg-body)", borderColor: "var(--border-light)" }}>
                          Pozostałe
                        </div>
                      )}
                      {unpinnedFavs.map(fav => (
                        <FavRow key={fav.id} fav={fav}
                          onUse={useCategory} onRemove={removeFavorite} onPin={togglePin} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT ── */}
      {tab === "import" && canImport && <ImportTab slug={slug} label={label} />}
    </div>
  );
}
