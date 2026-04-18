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

function getErrorMessage(err: unknown, fallback = "Wystapil blad"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

async function getResponseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    if (typeof json === "object" && json !== null && "error" in json) {
      const error = (json as { error?: unknown }).error;
      if (typeof error === "string" && error) return error;
    }
  } catch {}

  try {
    const text = await res.text();
    return text || fallback;
  } catch {
    return fallback;
  }
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
type MarketplaceOption = { slug: string; name: string };
type JobSummary = {
  id: string;
  type?: string | null;
  status: string;
  marketplaceSlug?: string | null;
  mode?: string | null;
  requestedItems?: number | null;
  processedItems?: number | null;
  successCount?: number | null;
  errorCount?: number | null;
  progressPercent?: number | null;
  currentStep?: string | null;
  currentMessage?: string | null;
  elapsedSeconds?: number | null;
  etaSeconds?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
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

function normalizeJobSummary(raw: Partial<JobSummary> | null | undefined): JobSummary | null {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    type: raw.type ?? null,
    status: raw.status ?? "queued",
    marketplaceSlug: raw.marketplaceSlug ?? null,
    mode: raw.mode ?? null,
    requestedItems: raw.requestedItems ?? null,
    processedItems: raw.processedItems ?? null,
    successCount: raw.successCount ?? null,
    errorCount: raw.errorCount ?? null,
    progressPercent: raw.progressPercent ?? null,
    currentStep: raw.currentStep ?? null,
    currentMessage: raw.currentMessage ?? null,
    elapsedSeconds: raw.elapsedSeconds ?? null,
    etaSeconds: raw.etaSeconds ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    startedAt: raw.startedAt ?? null,
    finishedAt: raw.finishedAt ?? null,
  };
}

function formatDurationLabel(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds ?? NaN) || seconds == null) return "0s";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rem = total % 60;
  if (!minutes) return `${rem}s`;
  return `${minutes}m ${String(rem).padStart(2, "0")}s`;
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

const LIMIT = 50;

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
    } catch (err: unknown) {
      setState("error");
      setErrorMsg(getErrorMessage(err));
    }
  };

  const mpLabel = detectedMp ? (MP_LABELS[detectedMp] || detectedMp) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">Import produkt&oacute;w</h2>
          <button onClick={onClose} className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] rounded-lg transition">
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
              dragging ? "border-indigo-400 bg-indigo-500/10"
              : file   ? "border-green-400 bg-green-500/10"
              :          "border-[var(--border-default)] hover:border-indigo-300 hover:bg-[var(--bg-body)]"
            }`}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }} />
            {file ? (
              <div className="text-sm font-semibold text-green-600">
                {file.name} &middot; {(file.size / 1024).toFixed(0)} KB
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-tertiary)]">
                <UploadIcon />
                <div className="text-sm">Przeci&#261;gnij plik lub kliknij</div>
                <div className="text-xs">.xlsx &middot; .xls &middot; .csv</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-body)]">
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
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl p-3">{errorMsg}</div>
              <button onClick={() => { setState("idle"); setFile(null); setErrorMsg(""); setDetectedMp(null); }}
                className="w-full py-2 rounded-xl text-[var(--text-secondary)] text-sm bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] transition">
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
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-md p-6 animate-[fadeInUp_0.15s_ease-out]">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-[var(--text-primary)] text-center mb-1">
          {count === 1 ? "Usun\u0105\u0107 produkt?" : `Usun\u0105\u0107 ${count} produkt\u00f3w?`}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          {count === 1
            ? "Ten produkt zostanie trwale usuni\u0119ty wraz ze wszystkimi przypisanymi atrybutami i kategoriami. Tej operacji nie mo\u017Cna cofn\u0105\u0107."
            : `Wybrane ${count} produkt\u00f3w zostanie trwale usuni\u0119tych wraz ze wszystkimi przypisanymi atrybutami i kategoriami. Tej operacji nie mo\u017Cna cofn\u0105\u0107.`}
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-sm font-semibold
              text-[var(--text-secondary)] hover:bg-[var(--bg-body)] hover:border-[var(--border-input)] transition disabled:opacity-50">
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

function BulkAIModal({
  count,
  selectedIds,
  marketplaces,
  defaultMarketplace,
  onClose,
}: {
  count: number;
  selectedIds: number[];
  marketplaces: MarketplaceOption[];
  defaultMarketplace: string;
  onClose: () => void;
}) {
  const [marketplaceSlug, setMarketplaceSlug] = useState(defaultMarketplace || marketplaces[0]?.slug || "");
  const [mode, setMode] = useState<"all" | "description" | "attributes">("all");
  const [useAllegro, setUseAllegro] = useState(true);
  const [useIcecat, setUseIcecat] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobSummary | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (defaultMarketplace) setMarketplaceSlug(defaultMarketplace);
  }, [defaultMarketplace]);

  useEffect(() => {
    if (!job?.id) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/jobs/${job.id}`, { headers: authHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nie udało się pobrać statusu joba");
        const nextJob = normalizeJobSummary(json.data);
        if (!nextJob || cancelled) return;
        setJob(nextJob);
        if (nextJob.status === "done" || nextJob.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Nie udało się pobrać statusu joba"));
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [job?.id]);

  const jobActive = !!job && job.status !== "done" && job.status !== "error";
  const submitBlocked = submitting || jobActive || !marketplaceSlug || selectedIds.length === 0 || selectedIds.length > 10;

  const handleSubmit = async () => {
    if (submitBlocked) return;
    setSubmitting(true);
    setError("");
    setJob(null);
    try {
      const res = await fetch(`${API}/api/products/generate-ai-bulk`, {
        method: "POST",
        headers: authHeadersJSON(),
        body: JSON.stringify({
          productIds: selectedIds,
          marketplaceSlug,
          mode,
          useAllegro,
          useIcecat,
        }),
      });
      if (!res.ok) throw new Error(await getResponseErrorMessage(res, "Nie udalo sie wygenerowac draftow AI"));
      const json = await res.json();
      setJob(normalizeJobSummary(json.data?.job));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udalo sie wygenerowac draftow AI"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Bulk AI</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Generowanie draftow dla {count} produktow. Limit MVP: 10 sztuk na jedno odpalenie.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">Marketplace</div>
            <select
              value={marketplaceSlug}
              onChange={e => setMarketplaceSlug(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400"
            >
              {marketplaces.map(mp => (
                <option key={mp.slug} value={mp.slug}>{mp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">Zakres</div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Opis + atrybuty" },
                { value: "description", label: "Tylko opis" },
                { value: "attributes", label: "Tylko atrybuty" },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as "all" | "description" | "attributes")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    mode === option.value
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-body)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">Zrodla</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUseAllegro(v => !v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  useAllegro
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                Allegro {useAllegro ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => setUseIcecat(v => !v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  useIcecat
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                Icecat {useIcecat ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Produkty bez przypisanej kategorii dla wybranego marketplace wroca jako blad per produkt.
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

            {job && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    {job.status === "queued" ? "W kolejce" : job.status === "processing" ? "Przetwarzanie" : job.status}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {Math.max(0, Math.min(100, job.progressPercent ?? 0))}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {formatDurationLabel(job.elapsedSeconds)}
                  </span>
                  {job.etaSeconds != null && (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      ETA {formatDurationLabel(job.etaSeconds)}
                    </span>
                  )}
                </div>

                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, job.progressPercent ?? 0))}%` }}
                  />
                </div>

                <div className="text-sm text-[var(--text-secondary)]">
                  {job.currentMessage || (job.status === "done"
                    ? "Job zakończony. Otwórz produkt, aby zobaczyć drafty."
                    : "Czekam na worker...")}
                </div>
              </div>
            )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-body)] transition"
          >
            Zamknij
          </button>
          <button
            onClick={() => { void handleSubmit(); }}
            aria-disabled={submitBlocked}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              submitBlocked
                ? "bg-indigo-300 text-white cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg"
            }`}
          >
              {submitting ? "Generowanie..." : jobActive ? "W toku..." : "Generuj drafty AI"}
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
  const [showBulkAI, setShowBulkAI]       = useState(false);
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu]           = useState<number | null>(null);
  const [exporting, setExporting]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const requestSeq = useRef(0);
  const loadProducts = useCallback(async (s: string, p: number, st: string, mp: string) => {
    const requestId = ++requestSeq.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: s, page: String(p), limit: String(LIMIT), status: st, marketplace: mp });
      const res = await fetch(`${API}/api/products/list?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Blad ladowania produktow");
      if (requestSeq.current !== requestId) return;
      setProducts(json.data || []);
      setTotal(json.total || 0);
    } catch {
      if (requestSeq.current !== requestId) return;
      setProducts([]);
    } finally {
      if (requestSeq.current === requestId) setLoading(false);
    }
  }, []);

  // Załaduj listę marketplace do filtra
  useEffect(() => {
    fetch(`${API}/api/templates/marketplaces`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { if (j.data) setMarketplaces(j.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadProducts(search, 1, statusFilter, mpFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [loadProducts, search, statusFilter, mpFilter]);

  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

    const handleDelete = async (id: number) => {
    if (!confirm("Usun ten produkt?")) return;
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: "DELETE", headers: authHeadersJSON() });
      if (!res.ok) {
        alert(await getResponseErrorMessage(res, "Nie udalo sie usunac produktu"));
        return;
      }
      loadProducts(search, page, statusFilter, mpFilter);
    } catch {
      alert("Nie udalo sie usunac produktu. Sprawdz polaczenie i sprobuj ponownie.");
    }
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
    } catch (err: unknown) { alert("B\u0142\u0105d eksportu: " + getErrorMessage(err)); }
    finally { setExporting(false); }
  };

    const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      for (const id of selected) {
        try {
          const res = await fetch(`${API}/api/products/${id}`, { method: "DELETE", headers: authHeadersJSON() });
          if (!res.ok) {
            alert(await getResponseErrorMessage(res, "Nie udalo sie usunac wybranych produktow"));
            return;
          }
        } catch {
          alert("Nie udalo sie usunac wybranych produktow. Sprawdz polaczenie i sprobuj ponownie.");
          return;
        }
      }
      setSelected(new Set());
      setShowDeleteConfirm(false);
      loadProducts(search, page, statusFilter, mpFilter);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
  const selectedOverBulkLimit = selected.size > 10;

  return (
    <div>
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); loadProducts(search, page, statusFilter, mpFilter); }}
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

      {showBulkAI && (
        <BulkAIModal
          count={selected.size}
          selectedIds={[...selected]}
          marketplaces={marketplaces}
          defaultMarketplace={mpFilter}
          onClose={() => setShowBulkAI(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Lista produkt&oacute;w</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            {total > 0 ? `${total} produkt${total === 1 ? "" : "ow"}` : "Brak produkt&oacute;w"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm text-[var(--text-primary)]
              bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-body)] shadow-sm transition">
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
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-[var(--bg-input)] border border-[var(--border-default)]
                text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTER.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === f.value
                    ? "bg-indigo-600 text-white"
                    : "text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-body)]"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtr marketplace */}
        {marketplaces.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Marketplace:</span>
            <button onClick={() => setMpFilter("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                mpFilter === ""
                  ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] bg-[var(--bg-card)] border-[var(--border-default)] hover:bg-[var(--bg-body)]"
              }`}>
              Wszystkie
            </button>
            {marketplaces.map(mp => (
              <button key={mp.slug} onClick={() => setMpFilter(mp.slug)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  mpFilter === mp.slug
                    ? "bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] bg-[var(--bg-card)] border-[var(--border-default)] hover:bg-[var(--bg-body)]"
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
            onClick={() => {
              if (selectedOverBulkLimit) return;
              setShowBulkAI(true);
            }}
            aria-disabled={selectedOverBulkLimit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedOverBulkLimit
                ? "bg-indigo-200 text-indigo-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v6"/><path d="M12 15v6"/><path d="M5.64 5.64l4.24 4.24"/><path d="M14.12 14.12l4.24 4.24"/>
              <path d="M3 12h6"/><path d="M15 12h6"/><path d="M5.64 18.36l4.24-4.24"/><path d="M14.12 9.88l4.24-4.24"/>
            </svg>
            Generuj AI
          </button>

          {selectedOverBulkLimit && (
            <span className="text-amber-700 font-medium text-xs">Limit AI MVP: max 10 produktow naraz</span>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto text-red-500 hover:text-red-700 font-medium text-xs">
            Usu&#324; zaznaczone
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)]">

        {/* Column headers */}
        <div className="grid items-center px-4 py-3 bg-[var(--bg-table-header)] border-b border-[var(--border-light)]"
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
            <div key={i} className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] pl-2">{h}</div>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-[var(--text-tertiary)]">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Ladowanie...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-empty-icon)] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="font-semibold text-[var(--text-secondary)] mb-1">
                {search || statusFilter ? "Brak wynikow" : "Brak produktow"}
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">
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
                    text-[var(--text-secondary)] bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] transition">
                  <PlusIcon /> Dodaj recznie
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--border-light)]">
              {products.map(p => {
                const integList  = parseIntegrations(p.integrations);
                const isSelected = selected.has(p.id);

                return (
                  <div key={p.id}
                    className={`grid items-center px-4 py-3 group cursor-pointer transition-colors ${
                      isSelected ? "bg-[var(--bg-card-selected)]" : "hover:bg-[var(--bg-card-hover)]"
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
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--img-placeholder-bg)] flex items-center justify-center flex-shrink-0 border border-[var(--img-placeholder-border)]">
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
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {p.title || <span className="text-[var(--text-tertiary)] font-normal italic">Brak nazwy</span>}
                        </span>
                        {p.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0
                            text-indigo-600 bg-indigo-50">
                            {p.brand}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">ID {p.id}</span>
                        {p.sku  && <span className="text-[10px] text-[var(--text-tertiary)] font-mono">SKU {p.sku}</span>}
                        {p.ean  && <span className="text-[10px] text-[var(--text-tertiary)] font-mono">EAN {p.ean}</span>}
                        {p.asin && <span className="text-[10px] text-[var(--text-tertiary)] font-mono">ASIN {p.asin}</span>}
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
                                      : "bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-default)]"
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
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]
                          rounded-lg transition opacity-0 group-hover:opacity-100">
                        <DotsIcon />
                      </button>
                      {openMenu === p.id && (
                        <div className="absolute right-0 top-8 z-20 w-40 bg-[var(--menu-bg)] rounded-xl shadow-xl
                          border border-[var(--border-default)] overflow-hidden">
                          <button onClick={() => router.push(`/dashboard/products/${p.id}`)}
                            className="w-full text-left px-3 py-2.5 text-xs text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-body)] transition">
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-table-header)]">
                <div className="text-xs text-[var(--text-tertiary)]">
                  Strona {page} z {totalPages} &middot; {total} produkt&oacute;w
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => { const np = page - 1; setPage(np); loadProducts(search, np, statusFilter, mpFilter); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)]
                      text-[var(--text-secondary)] hover:bg-[var(--pagination-bg)] disabled:opacity-40 transition">
                    &larr;
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(pg => (
                    <button key={pg}
                      onClick={() => { setPage(pg); loadProducts(search, pg, statusFilter, mpFilter); }}
                      className={`w-8 h-8 text-xs rounded-lg border transition font-medium ${
                        page === pg
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--pagination-bg)]"
                      }`}>
                      {pg}
                    </button>
                  ))}
                  <button
                    disabled={page === totalPages}
                    onClick={() => { const np = page + 1; setPage(np); loadProducts(search, np, statusFilter, mpFilter); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)]
                      text-[var(--text-secondary)] hover:bg-[var(--pagination-bg)] disabled:opacity-40 transition">
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
