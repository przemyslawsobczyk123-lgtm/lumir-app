"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { UnoptimizedRemoteImage } from "../_components/UnoptimizedRemoteImage";
import { useLang } from "../LangContext";
import { translations } from "../i18n";
import {
  createProductExportBatchGroups,
  findProductExportCategoryGroup,
  getExportableProductIds,
  getProductExportBatchSummary,
  filterProductsByListingFocus,
  getProductExportCategoryGroups,
  getProductExportPreflight,
  getProductExportSummary,
  getProductListingState,
  getProductListingStats,
  getRetryableProductExportGroups,
  hasActiveProductFilters,
  parseProductIntegrations,
  updateProductExportBatchGroup,
  type ProductExportBatchGroup,
  type ProductExportCategoryGroup,
  type ProductListingFocus,
  type ProductExportPreflightRow,
} from "./ui-helpers";

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
  price?: number | null;
  stock?: number | null;
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
type RecentProductExport = {
  id: number;
  marketplaceSlug: string;
  marketplaceName: string;
  categoryPath: string;
  productIds: number[];
  productCount: number;
  fileName: string;
  createdAt: string;
};
type ProductExportResult =
  | { ok: true }
  | { ok: false; error: string };
const STATUS_META_KEYS = {
  pending: "statusPending",
  mapped: "statusMapped",
  needs_review: "statusNeedsReview",
  exported: "statusExported",
} as const;
type ProductStatusTranslationKeys =
  | (typeof STATUS_META_KEYS)[keyof typeof STATUS_META_KEYS]
  | "statusUnknown";

function getStatusLabel(t: Record<ProductStatusTranslationKeys, string>, status: string) {
  const key = STATUS_META_KEYS[status as keyof typeof STATUS_META_KEYS];
  return key ? t[key] : t.statusUnknown;
}

const PRODUCTS_PAGE_COPY = {
  pl: {
    focusAll: "Widoczne",
    focusReady: "Gotowe",
    focusReview: "Do review",
    focusBlocked: "Zablokowane",
    focusAllHint: "po aktualnych filtrach",
    focusReadyHint: "maja min. 1 gotowy marketplace",
    focusReviewHint: "wymagaja sprawdzenia",
    focusBlockedHint: "brakuje mapowania lub atrybutow",
    blockedMixHint: "bez marketplace: {unmapped} • braki atrybutow: {attributes}",
    focusEmpty: "Brak pozycji dla wybranego focusu.",
    focusReset: "Pokaz wszystko",
    issueReady: "Gotowe",
    issuePartial: "Czesciowo gotowe",
    issueReview: "Review",
    issueUnmapped: "Brak marketplace",
    issueMissingAttrs: "Braki atrybutow",
    exportPreflightTitle: "Preflight eksportu",
    exportPreflightDesc: "Przed eksportem sprawdzam, co jest gotowe dla wybranego marketplace.",
    exportPreflightReady: "Gotowe",
    exportPreflightBlocked: "Zablokowane",
    exportPreflightReasonMapped: "Produkt nie ma przypisanego tego marketplace.",
    exportPreflightReasonAttrs: "Marketplace ma brakujace atrybuty do uzupelnienia.",
    exportPreflightReasonCategory: "Produkt nie ma zapisanej kategorii dla tego marketplace.",
    exportPreflightOpen: "Otworz produkt",
    exportPreflightRun: "Eksportuj gotowe",
    exportPreflightNoReady: "Brak gotowych pozycji do eksportu.",
    exportPreflightMixedTitle: "Mix kategorii",
    exportPreflightMixedDesc: "Gotowe produkty sa w kilku kategoriach. Eksportuj osobno per kategoria.",
    exportPreflightGroupsTitle: "Grupy kategorii",
    exportPreflightGroupRun: "Eksportuj grupe",
    exportPreflightPickGroup: "Wybierz grupe kategorii",
    splitSelectionStart: "Podziel gotowe per kategoria",
    splitSelectionTitle: "Split kategorii",
    splitSelectionDesc: "Przelaczaj grupy i eksportuj seryjnie bez recznego zaznaczania.",
    splitSelectionOff: "Wylacz split",
    splitSelectionRunAll: "Eksportuj wszystkie grupy",
    splitSelectionRetryFailed: "Powtorz fail",
    splitSelectionReportClose: "Schowaj raport",
    splitSelectionReportTitle: "Raport serii eksportu",
    splitSelectionReportDesc: "Kazda kategoria leci osobno. Fail zostaje gotowy do retry.",
    splitSelectionStatusPending: "Czeka",
    splitSelectionStatusRunning: "Leci",
    splitSelectionStatusSuccess: "OK",
    splitSelectionStatusFailed: "Fail",
    splitSelectionGroupsLabel: "grup",
    splitSelectionOpenGroup: "Otworz grupe",
    recentExportsTitle: "Ostatnie eksporty",
    recentExportsDesc: "Szybki powrot do ostatnio wygenerowanych paczek i ponowne pobranie bez skladania zaznaczen od zera.",
    recentExportsEmpty: "Brak historii eksportow. Pierwszy eksport pojawi sie tutaj.",
    recentExportsLoading: "Laduje historie eksportow...",
    recentExportsRetry: "Powtorz eksport",
    recentExportsProducts: "produktow",
    recentExportsCategory: "Kategoria",
    recentExportsFile: "Plik",
  },
  en: {
    focusAll: "Visible",
    focusReady: "Ready",
    focusReview: "Review",
    focusBlocked: "Blocked",
    focusAllHint: "after current filters",
    focusReadyHint: "have at least 1 ready marketplace",
    focusReviewHint: "need manual check",
    focusBlockedHint: "missing mapping or attributes",
    blockedMixHint: "no marketplace: {unmapped} • attr gaps: {attributes}",
    focusEmpty: "No rows for selected focus.",
    focusReset: "Show all",
    issueReady: "Ready",
    issuePartial: "Partially ready",
    issueReview: "Review",
    issueUnmapped: "No marketplace",
    issueMissingAttrs: "Attr gaps",
    exportPreflightTitle: "Export preflight",
    exportPreflightDesc: "Before export, check what is ready for the selected marketplace.",
    exportPreflightReady: "Ready",
    exportPreflightBlocked: "Blocked",
    exportPreflightReasonMapped: "Product is not mapped to this marketplace.",
    exportPreflightReasonAttrs: "Marketplace still has missing attributes to fill.",
    exportPreflightReasonCategory: "Product has no saved category for this marketplace.",
    exportPreflightOpen: "Open product",
    exportPreflightRun: "Export ready",
    exportPreflightNoReady: "No ready rows to export.",
    exportPreflightMixedTitle: "Mixed categories",
    exportPreflightMixedDesc: "Ready products span multiple categories. Export them separately per category.",
    exportPreflightGroupsTitle: "Category groups",
    exportPreflightGroupRun: "Export group",
    exportPreflightPickGroup: "Pick a category group",
    splitSelectionStart: "Split ready by category",
    splitSelectionTitle: "Category split",
    splitSelectionDesc: "Switch groups and export them in sequence without manual reselection.",
    splitSelectionOff: "Disable split",
    splitSelectionRunAll: "Export all groups",
    splitSelectionRetryFailed: "Retry failed",
    splitSelectionReportClose: "Hide report",
    splitSelectionReportTitle: "Batch export report",
    splitSelectionReportDesc: "Each category runs separately. Failed groups stay ready for retry.",
    splitSelectionStatusPending: "Pending",
    splitSelectionStatusRunning: "Running",
    splitSelectionStatusSuccess: "OK",
    splitSelectionStatusFailed: "Failed",
    splitSelectionGroupsLabel: "groups",
    splitSelectionOpenGroup: "Open group",
    recentExportsTitle: "Recent exports",
    recentExportsDesc: "Quick return to the latest generated packages and one-click download retry without rebuilding selection.",
    recentExportsEmpty: "No export history yet. The first export will appear here.",
    recentExportsLoading: "Loading export history...",
    recentExportsRetry: "Retry export",
    recentExportsProducts: "products",
    recentExportsCategory: "Category",
    recentExportsFile: "File",
  },
} as const;

function formatBlockedMixHint(template: string, unmapped: number, attributes: number) {
  return template
    .replace("{unmapped}", String(unmapped))
    .replace("{attributes}", String(attributes));
}

function getListingIssueMeta(
  lang: keyof typeof PRODUCTS_PAGE_COPY,
  state: ReturnType<typeof getProductListingState>
) {
  const copy = PRODUCTS_PAGE_COPY[lang];

  if (state.focus === "review") {
    return { label: copy.issueReview, className: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (state.blockerKind === "unmapped") {
    return { label: copy.issueUnmapped, className: "border-slate-200 bg-slate-100 text-slate-700" };
  }
  if (state.blockerKind === "attributes") {
    return { label: copy.issueMissingAttrs, className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (state.missingMarketplaceCount > 0) {
    return { label: copy.issuePartial, className: "border-sky-200 bg-sky-50 text-sky-700" };
  }
  return { label: copy.issueReady, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

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
  const { lang } = useLang();
  const t = translations[lang].products.importModal;

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
      setErrorMsg(t.acceptedFormats);
      setState("error"); return;
    }
    setFile(f); setState("idle"); setErrorMsg(""); setDetectedMp(null); setMissingCats([]);
  };

  useEffect(() => {
    if (!importId) return;
    const poll = async () => {
      try {
        const res  = await fetch(`${API}/api/products/import-status/${importId}`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac statusu importu");
        const d    = json.data;
        if (!d) return;
        if (d.status === "done") {
          clearInterval(pollRef.current!);
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
      } catch (err: unknown) {
        clearInterval(pollRef.current!);
        setState("error");
        setErrorMsg(getErrorMessage(err, "Nie udalo sie pobrac statusu importu"));
      }
    };

    void poll();
    pollRef.current = setInterval(() => {
      void poll();
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
          <h2 className="font-bold text-[var(--text-primary)] text-lg">{t.title}</h2>
          <button onClick={onClose} className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] rounded-lg transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Auto-detect info */}
          <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
            <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>{t.autoDetect}</span>
          </div>

          {mpLabel && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {t.detected} {mpLabel}
            </div>
          )}

          {missingCats.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <div className="font-semibold mb-1">{t.missingCats}</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {missingCats.slice(0, 5).map(c => <li key={c} className="font-mono text-xs">{c}</li>)}
                {missingCats.length > 5 && <li className="text-xs">...{t.missingCatsMore && `i ${missingCats.length - 5} ${t.missingCatsMore}`}</li>}
              </ul>
              <div className="mt-2 text-xs text-amber-700">
                {t.missingCatsHint}
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
                <div className="text-sm">{t.dragOrClick}</div>
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
              {t.importBtn}
            </button>
          )}
          {(state === "uploading" || state === "processing") && (
            <div className="w-full py-3 text-center text-sm text-indigo-600 font-medium flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {state === "processing" ? `${t.processing}${mpLabel ? ` (${mpLabel})` : ""}...` : t.uploading}
            </div>
          )}
          {state === "success" && (
            <button onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-green-500 hover:bg-green-600 transition">
              {t.doneBtn}
            </button>
          )}
          {state === "error" && (
            <div className="space-y-2">
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl p-3">{errorMsg}</div>
              <button onClick={() => { setState("idle"); setFile(null); setErrorMsg(""); setDetectedMp(null); }}
                className="w-full py-2 rounded-xl text-[var(--text-secondary)] text-sm bg-[var(--bg-input)] hover:bg-[var(--bg-input-alt)] transition">
                {t.retry}
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
  return parseProductIntegrations(raw);
}

// ── Confirm delete modal ──────────────────────────────────────────
function ConfirmDeleteModal({ count, onConfirm, onCancel, loading }: {
  count: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const { lang } = useLang();
  const t = translations[lang].products.deleteModal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-md p-6 animate-[fadeInUp_0.15s_ease-out]">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-[var(--text-primary)] text-center mb-1">
          {count === 1 ? t.titleSingle : `${t.titleMulti} ${count} ${t.titleMultiSuffix}`}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          {count === 1 ? t.bodySingle : `${count} ${t.bodyMulti}`}
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-sm font-semibold
              text-[var(--text-secondary)] hover:bg-[var(--bg-body)] hover:border-[var(--border-input)] transition disabled:opacity-50">
            {t.cancel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-white transition ${loading ? "bg-red-300 cursor-wait" : "bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"}`}>
            {loading
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>{t.deleting}</>
              : <><svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>{count === 1 ? t.confirmSingle : `${t.confirmMulti} ${count}`}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportPreflightModal({
  marketplaceName,
  rows,
  exporting,
  onConfirm,
  onExportCategory,
  onOpenProduct,
  onCancel,
}: {
  marketplaceName: string;
  rows: ProductExportPreflightRow[];
  exporting: boolean;
  onConfirm: () => void;
  onExportCategory: (group: ProductExportCategoryGroup) => void;
  onOpenProduct: (productId: number) => void;
  onCancel: () => void;
}) {
  const { lang } = useLang();
  const copy = PRODUCTS_PAGE_COPY[lang];
  const cancelLabel = translations[lang].products.bulkModal.close;
  const summary = getProductExportSummary(rows);
  const categoryGroups = getProductExportCategoryGroups(rows);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{copy.exportPreflightTitle}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.exportPreflightDesc} <span className="font-semibold text-[var(--text-primary)]">{marketplaceName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">{copy.exportPreflightReady}</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-800">{summary.ready}</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700">{copy.exportPreflightBlocked}</div>
            <div className="mt-2 text-3xl font-semibold text-rose-800">{summary.blocked}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Marketplace</div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{marketplaceName}</div>
          </div>
        </div>

        <div className="mt-5 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {rows.map((row) => {
            const ready = row.status === "ready";
            const reason = row.reason === "marketplace_not_mapped"
              ? copy.exportPreflightReasonMapped
              : row.reason === "missing_attributes"
                ? `${copy.exportPreflightReasonAttrs}${row.missing ? ` (${row.missing})` : ""}`
                : row.reason === "category_missing"
                  ? copy.exportPreflightReasonCategory
                : copy.exportPreflightReady;

            return (
              <div key={row.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        ready ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"
                      }`}>
                        {ready ? copy.exportPreflightReady : copy.exportPreflightBlocked}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-tertiary)]">ID {row.id}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{row.title}</div>
                    {row.categoryPath && (
                      <div className="mt-2 inline-flex rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                        {row.categoryPath}
                      </div>
                    )}
                    <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{reason}</div>
                  </div>

                  <button
                    onClick={() => onOpenProduct(row.id)}
                    className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
                  >
                    {copy.exportPreflightOpen}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {summary.mixedCategories && categoryGroups.length > 1 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
              {copy.exportPreflightMixedTitle}
            </div>
            <p className="mt-2 text-sm text-amber-800">
              {copy.exportPreflightMixedDesc}
            </p>
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-amber-900">{copy.exportPreflightGroupsTitle}</div>
              <div className="flex flex-wrap gap-2">
                {categoryGroups.map((group) => (
                  <button
                    key={group.categoryPath}
                    onClick={() => onExportCategory(group)}
                    disabled={exporting}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      exporting
                        ? "cursor-not-allowed bg-amber-200 text-amber-700"
                        : "bg-amber-600 text-white hover:bg-amber-700"
                    }`}
                  >
                    {copy.exportPreflightGroupRun}: {group.categoryPath} ({group.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={exporting || summary.ready === 0 || summary.mixedCategories}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              exporting || summary.ready === 0 || summary.mixedCategories
                ? "cursor-not-allowed bg-emerald-200 text-emerald-700"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {summary.ready === 0
              ? copy.exportPreflightNoReady
              : summary.mixedCategories
                ? copy.exportPreflightPickGroup
                : `${copy.exportPreflightRun} (${summary.ready})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRecentExportDate(value: string, lang: keyof typeof PRODUCTS_PAGE_COPY) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function RecentExportsPanel({
  rows,
  loading,
  exporting,
  onRetry,
}: {
  rows: RecentProductExport[];
  loading: boolean;
  exporting: boolean;
  onRetry: (row: RecentProductExport) => void;
}) {
  const { lang } = useLang();
  const copy = PRODUCTS_PAGE_COPY[lang];

  return (
    <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {copy.recentExportsTitle}
          </div>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            {copy.recentExportsDesc}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-6 text-sm text-[var(--text-secondary)]">
            {copy.recentExportsLoading}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-6 text-sm text-[var(--text-secondary)]">
            {copy.recentExportsEmpty}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                    {row.marketplaceName}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                    {formatRecentExportDate(row.createdAt, lang)}
                  </span>
                  <span className="rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    {row.productCount} {copy.recentExportsProducts}
                  </span>
                </div>

                <div className="text-sm text-[var(--text-primary)]">
                  <span className="font-semibold">{copy.recentExportsCategory}:</span>{" "}
                  <span className="text-[var(--text-secondary)]">{row.categoryPath || "-"}</span>
                </div>

                <div className="truncate text-xs text-[var(--text-tertiary)]">
                  <span className="font-semibold">{copy.recentExportsFile}:</span> {row.fileName}
                </div>
              </div>

              <button
                onClick={() => onRetry(row)}
                disabled={exporting || row.productIds.length === 0}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  exporting || row.productIds.length === 0
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-[var(--text-primary)] text-[var(--bg-card)] hover:opacity-90"
                }`}
              >
                {copy.recentExportsRetry}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExportBatchReportPanel({
  groups,
  running,
  onRetryFailed,
  onClose,
  onOpenGroup,
}: {
  groups: ProductExportBatchGroup[];
  running: boolean;
  onRetryFailed: () => void;
  onClose: () => void;
  onOpenGroup: (group: ProductExportCategoryGroup) => void;
}) {
  const { lang } = useLang();
  const copy = PRODUCTS_PAGE_COPY[lang];
  const summary = getProductExportBatchSummary(groups);
  const retryableGroups = getRetryableProductExportGroups(groups);

  if (groups.length === 0) return null;

  return (
    <div className="mb-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {copy.splitSelectionReportTitle}
          </div>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            {copy.splitSelectionReportDesc}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {retryableGroups.length > 0 && (
            <button
              onClick={onRetryFailed}
              disabled={running}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                running
                  ? "cursor-not-allowed bg-amber-200 text-amber-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              {copy.splitSelectionRetryFailed} ({retryableGroups.length})
            </button>
          )}
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.splitSelectionReportClose}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{copy.splitSelectionGroupsLabel}</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{summary.total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">{copy.splitSelectionStatusSuccess}</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-800">{summary.success}</div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700">{copy.splitSelectionStatusFailed}</div>
          <div className="mt-2 text-3xl font-semibold text-rose-800">{summary.failed}</div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            {running ? copy.splitSelectionStatusRunning : copy.splitSelectionStatusPending}
          </div>
          <div className="mt-2 text-3xl font-semibold text-sky-800">
            {running ? summary.running : summary.pending}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {groups.map((group) => {
          const tone = group.status === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : group.status === "failed"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : group.status === "running"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-[var(--border-default)] bg-[var(--bg-body)] text-[var(--text-secondary)]";
          const statusLabel = group.status === "success"
            ? copy.splitSelectionStatusSuccess
            : group.status === "failed"
              ? copy.splitSelectionStatusFailed
              : group.status === "running"
                ? copy.splitSelectionStatusRunning
                : copy.splitSelectionStatusPending;

          return (
            <div
              key={group.categoryPath}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-body)] p-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                    {statusLabel}
                  </span>
                  <span className="rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    {group.count} {copy.recentExportsProducts}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{group.categoryPath}</div>
                {group.error && (
                  <div className="text-xs leading-5 text-rose-700">{group.error}</div>
                )}
              </div>

              <button
                onClick={() => onOpenGroup(group)}
                disabled={running}
                className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.splitSelectionOpenGroup}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkAIModal({
  count,
  selectedIds,
  marketplaces,
  defaultMarketplace,
  onJobChange,
  onClose,
}: {
  count: number;
  selectedIds: number[];
  marketplaces: MarketplaceOption[];
  defaultMarketplace: string;
  onJobChange: (job: JobSummary | null) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const t = translations[lang].products.bulkModal;

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
        onJobChange(nextJob);
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
  }, [job?.id, onJobChange]);

  const jobActive = !!job && job.status !== "done" && job.status !== "error";
  const submitBlocked = submitting || jobActive || !marketplaceSlug || selectedIds.length === 0 || selectedIds.length > 10;

  const handleSubmit = async () => {
    if (submitBlocked) return;
    setSubmitting(true);
    setError("");
    setJob(null);
    onJobChange(null);
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
      const nextJob = normalizeJobSummary(json.data?.job);
      setJob(nextJob);
      onJobChange(nextJob);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nie udalo sie wygenerowac draftow AI"));
    } finally {
      setSubmitting(false);
    }
  };

  const scopeOptions = [
    { value: "all",         label: t.scopeAll  },
    { value: "description", label: t.scopeDesc },
    { value: "attributes",  label: t.scopeAttrs },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-default)] w-full max-w-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{t.title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {t.desc} {count} {t.descSuffix}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">{t.marketplaceLabel}</div>
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
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">{t.scopeLabel}</div>
            <div className="flex flex-wrap gap-2">
              {scopeOptions.map(option => (
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
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">{t.sourcesLabel}</div>
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

          <div className="rounded-xl border px-3 py-2 text-sm" style={{ background: "var(--bg-input-alt)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
            {t.noCategoryHint}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

            {job && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    {job.status === "queued" ? t.jobQueued : job.status === "processing" ? t.jobProcessing : job.status}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
                    {Math.max(0, Math.min(100, job.progressPercent ?? 0))}%
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
                    {formatDurationLabel(job.elapsedSeconds)}
                  </span>
                  {job.etaSeconds != null && (
                    <span className="px-2 py-1 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
                      ETA {formatDurationLabel(job.etaSeconds)}
                    </span>
                  )}
                </div>

                <div className="h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, job.progressPercent ?? 0))}%` }}
                  />
                </div>

                <div className="text-sm text-[var(--text-secondary)]">
                  {job.currentMessage || (job.status === "done" ? t.jobDone : t.jobWaiting)}
                </div>
              </div>
            )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-body)] transition"
          >
            {t.close}
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
            {submitting ? t.generating : jobActive ? t.inProgress : t.generate}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = translations[lang].products;

  const STATUS_FILTER = [
    { value: "",             label: t.filterAll     },
    { value: "mapped",       label: t.filterActive  },
    { value: "pending",      label: t.filterPending },
    { value: "needs_review", label: t.filterReview  },
    { value: "exported",     label: t.filterExported},
  ];

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
  const [showExportPreflight, setShowExportPreflight] = useState(false);
  const [selected, setSelected]           = useState<Set<number>>(new Set());
  const [openMenu, setOpenMenu]           = useState<number | null>(null);
  const [exporting, setExporting]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [activeInlineJob, setActiveInlineJob] = useState<JobSummary | null>(null);
  const [listingFocus, setListingFocus] = useState<ProductListingFocus>("all");
  const [recentExports, setRecentExports] = useState<RecentProductExport[]>([]);
  const [recentExportsLoading, setRecentExportsLoading] = useState(true);
  const [splitSelectionGroups, setSplitSelectionGroups] = useState<ProductExportCategoryGroup[]>([]);
  const [exportBatchGroups, setExportBatchGroups] = useState<ProductExportBatchGroup[]>([]);
  const [batchExporting, setBatchExporting] = useState(false);
  const inlineJobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const loadRecentExports = useCallback(async () => {
    setRecentExportsLoading(true);
    try {
      const res = await fetch(`${API}/api/products/exports/recent?limit=6`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Blad ladowania historii eksportow");
      setRecentExports(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRecentExports([]);
    } finally {
      setRecentExportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/api/templates/marketplaces`, { headers: authHeaders() })
      .then(r => r.json()).then(j => { if (j.data) setMarketplaces(j.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    void loadRecentExports();
  }, [loadRecentExports]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadProducts(search, 1, statusFilter, mpFilter);
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadProducts, search, statusFilter, mpFilter]);

  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    setSelected((prev) => {
      const visibleIds = new Set(products.map((product) => product.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  useEffect(() => {
    if (!batchExporting && selected.size === 0 && splitSelectionGroups.length > 0) {
      setSplitSelectionGroups([]);
    }
  }, [batchExporting, selected, splitSelectionGroups.length]);

  useEffect(() => {
    setSplitSelectionGroups([]);
    if (!batchExporting) setExportBatchGroups([]);
  }, [batchExporting, mpFilter]);

  useEffect(() => {
    if (!activeInlineJob?.id) return;
    if (activeInlineJob.status === "done" || activeInlineJob.status === "error") return;

    let cancelled = false;
    const stopPolling = () => {
      if (inlineJobPollRef.current) clearInterval(inlineJobPollRef.current);
      inlineJobPollRef.current = null;
    };

    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/jobs/${activeInlineJob.id}`, { headers: authHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nie udalo sie pobrac statusu joba");
        const nextJob = normalizeJobSummary(json.data);
        if (!nextJob || cancelled) return;
        setActiveInlineJob(nextJob);
        if (nextJob.status === "done" || nextJob.status === "error") {
          stopPolling();
          await loadProducts(search, page, statusFilter, mpFilter);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setActiveInlineJob(prev => prev ? {
          ...prev,
          status: "error",
          currentMessage: getErrorMessage(err, "Nie udalo sie pobrac statusu joba"),
        } : prev);
        stopPolling();
      }
    };

    void poll();
    inlineJobPollRef.current = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeInlineJob?.id, activeInlineJob?.status, loadProducts, mpFilter, page, search, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm(t.deleteProduct + "?")) return;
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

  const handleExport = async (
    productIds: number[],
    options?: {
      marketplaceSlug?: string;
      categoryPath?: string | null;
      clearSelection?: boolean;
      suppressErrorAlert?: boolean;
      skipSplitAutoAdvance?: boolean;
    }
  ): Promise<ProductExportResult> => {
    const exportMarketplace = options?.marketplaceSlug || mpFilter;
    if (!exportMarketplace || productIds.length === 0) {
      return { ok: false, error: "Brak danych do eksportu" };
    }
    setExporting(true);
    try {
      const body: {
        productIds: number[];
        marketplace: string;
        category?: string;
      } = {
        productIds,
        marketplace: exportMarketplace,
      };

      const exportCategory = options?.categoryPath?.trim();
      if (exportCategory) body.category = exportCategory;

      const res = await fetch(`${API}/api/products/export`, {
        method: "POST",
        headers: authHeadersJSON(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await getResponseErrorMessage(res, "Blad eksportu"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportMarketplace}_export_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      if (!options?.skipSplitAutoAdvance) {
        const exportedSplitGroup = splitSelectionGroups.length > 0
          ? findProductExportCategoryGroup(splitSelectionGroups, productIds)
          : null;

        if (exportedSplitGroup) {
          const nextGroups = splitSelectionGroups.filter(
            (group) => group.categoryPath !== exportedSplitGroup.categoryPath
          );
          setSplitSelectionGroups(nextGroups);
          if (nextGroups[0]) {
            setSelected(new Set(nextGroups[0].productIds));
          } else {
            setSelected(new Set());
          }
        } else if (options?.clearSelection) {
          setSelected(new Set());
        }
      }
      setShowExportPreflight(false);
      await Promise.all([
        loadProducts(search, page, statusFilter, mpFilter),
        loadRecentExports(),
      ]);
      return { ok: true };
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (!options?.suppressErrorAlert) {
        alert("Blad eksportu: " + message);
      }
      return { ok: false, error: message };
    } /*
    } catch (err: unknown) { alert("Błąd eksportu: " + getErrorMessage(err)); }
    */ finally { setExporting(false); }
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
      setSplitSelectionGroups([]);
      setExportBatchGroups([]);
      setShowDeleteConfirm(false);
      loadProducts(search, page, statusFilter, mpFilter);
    } finally {
      setDeleting(false);
    }
  };

  const activateSplitSelectionGroup = useCallback((group: ProductExportCategoryGroup) => {
    setSelected(new Set(group.productIds));
  }, []);

  const disableSplitSelection = useCallback(() => {
    setSplitSelectionGroups([]);
  }, []);

  const startSplitSelection = useCallback((groups: ProductExportCategoryGroup[]) => {
    if (groups.length <= 1) return;
    setSplitSelectionGroups(groups);
    setExportBatchGroups([]);
    setSelected(new Set(groups[0].productIds));
    setShowExportPreflight(false);
  }, []);

  const focusExportBatchGroup = useCallback((group: ProductExportCategoryGroup) => {
    setSplitSelectionGroups([group]);
    setSelected(new Set(group.productIds));
  }, []);

  const clearExportBatchReport = useCallback(() => {
    if (batchExporting) return;
    setExportBatchGroups([]);
  }, [batchExporting]);

  const runSplitBatchExport = async (groups: ProductExportCategoryGroup[]) => {
    const exportMarketplace = mpFilter;
    if (!exportMarketplace || groups.length === 0 || batchExporting) return;

    setShowExportPreflight(false);
    setBatchExporting(true);
    setSplitSelectionGroups(groups);

    let nextBatchGroups = createProductExportBatchGroups(groups);
    setExportBatchGroups(nextBatchGroups);
    try {
      for (const group of groups) {
        setSelected(new Set(group.productIds));
        nextBatchGroups = updateProductExportBatchGroup(nextBatchGroups, group.categoryPath, {
          status: "running",
          error: null,
        });
        setExportBatchGroups(nextBatchGroups);

        const result = await handleExport(group.productIds, {
          marketplaceSlug: exportMarketplace,
          categoryPath: group.categoryPath,
          suppressErrorAlert: true,
          skipSplitAutoAdvance: true,
        });

        nextBatchGroups = updateProductExportBatchGroup(nextBatchGroups, group.categoryPath, result.ok
          ? { status: "success", error: null }
          : { status: "failed", error: result.error });
        setExportBatchGroups(nextBatchGroups);
      }

      const retryableGroups = getRetryableProductExportGroups(nextBatchGroups);
      setSplitSelectionGroups(retryableGroups);
      if (retryableGroups[0]) {
        setSelected(new Set(retryableGroups[0].productIds));
      } else {
        setSelected(new Set());
      }
    } finally {
      setBatchExporting(false);
    }
  };

  const toggleSelect = (id: number) => {
    if (batchExporting) return;
    setSplitSelectionGroups([]);
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
    if (batchExporting) return;
    setSplitSelectionGroups([]);
    setSelected(prev => {
      const next = new Set(prev);
      const visibleIds = visibleProducts.map((product) => product.id);
      const everyVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));

      if (everyVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }

      return next;
    });
  };
  const clearFilters = useCallback(() => {
    if (batchExporting) return;
    setSearch("");
    setStatusFilter("");
    setMpFilter("");
    setListingFocus("all");
    setSplitSelectionGroups([]);
    setPage(1);
    setOpenMenu(null);
  }, [batchExporting]);

  const visibleProducts = filterProductsByListingFocus(products, listingFocus);
  const listingStats = getProductListingStats(products);
  const totalPages  = Math.ceil(total / LIMIT);
  const allChecked  = visibleProducts.length > 0 && visibleProducts.every((product) => selected.has(product.id));
  const someChecked = visibleProducts.some((product) => selected.has(product.id)) && !allChecked;
  const inlineJobActive = !!activeInlineJob && activeInlineJob.status !== "done" && activeInlineJob.status !== "error";
  const hasFilters = hasActiveProductFilters(search, statusFilter, mpFilter);
  const focusLabels: Record<ProductListingFocus, string> = {
    all: PRODUCTS_PAGE_COPY[lang].focusAll,
    ready: PRODUCTS_PAGE_COPY[lang].focusReady,
    review: PRODUCTS_PAGE_COPY[lang].focusReview,
    blocked: PRODUCTS_PAGE_COPY[lang].focusBlocked,
  };
  const hasListViewFilters = hasFilters || listingFocus !== "all";
  const exportPreflightRows = mpFilter ? getProductExportPreflight(products, [...selected], mpFilter) : [];
  const exportSummary = getProductExportSummary(exportPreflightRows);
  const exportReadyIds = getExportableProductIds(exportPreflightRows);
  const selectedCategoryGroups = getProductExportCategoryGroups(exportPreflightRows);
  const activeSplitSelectionGroup = findProductExportCategoryGroup(splitSelectionGroups, [...selected]);
  const currentMarketplaceName = mpFilter
    ? marketplaces.find((marketplace) => marketplace.slug === mpFilter)?.name ?? mpFilter
    : "";
  const selectedReadyCount = exportSummary.ready;
  const selectedOverBulkLimit = selected.size > 10;
  const exportBusy = exporting || batchExporting;

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

      {showExportPreflight && mpFilter && (
        <ExportPreflightModal
          marketplaceName={currentMarketplaceName}
          rows={exportPreflightRows}
          exporting={exportBusy}
          onConfirm={() => { void handleExport(exportReadyIds, { clearSelection: true }); }}
          onExportCategory={(group) => {
            void handleExport(group.productIds, {
              clearSelection: true,
              categoryPath: group.categoryPath,
            });
          }}
          onOpenProduct={(productId) => {
            setShowExportPreflight(false);
            router.push(`/dashboard/products/${productId}`);
          }}
          onCancel={() => setShowExportPreflight(false)}
        />
      )}

      {showBulkAI && (
        <BulkAIModal
          count={selected.size}
          selectedIds={[...selected]}
          marketplaces={marketplaces}
          defaultMarketplace={mpFilter}
          onJobChange={setActiveInlineJob}
          onClose={() => setShowBulkAI(false)}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t.pageTitle}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
            {total > 0 ? `${total} ${t.productCount}` : t.noProducts}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
          <button onClick={() => setShowImport(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--bg-body)]">
            <UploadIcon /> {t.importBtn}
          </button>
          <button onClick={() => router.push("/dashboard/new-product")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <PlusIcon /> {t.addBtn}
          </button>
        </div>
      </div>

      <RecentExportsPanel
        rows={recentExports}
        loading={recentExportsLoading}
        exporting={exportBusy}
        onRetry={(row) => {
          void handleExport(row.productIds, {
            marketplaceSlug: row.marketplaceSlug,
            categoryPath: row.categoryPath,
          });
        }}
      />

      {/* Toolbar */}
      <div className={`mb-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-sm sm:p-4 ${
        batchExporting ? "pointer-events-none opacity-70" : ""
      }`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-md">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <SearchIcon />
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
              >
                {t.clearFilters}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTER.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === f.value
                    ? "bg-indigo-600 text-white"
                    : "border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-body)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtr marketplace */}
          {marketplaces.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{t.marketplace}</span>
            <button onClick={() => setMpFilter("")}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                mpFilter === ""
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-card)]"
                  : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-body)]"
              }`}
            >
              {t.allMarketplaces}
            </button>
            {marketplaces.map(mp => (
              <button
                key={mp.slug}
                onClick={() => setMpFilter(mp.slug)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                  mpFilter === mp.slug
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-card)]"
                    : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-body)]"
                }`}
              >
                {mp.name}
              </button>
            ))}
            </div>
          )}

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--bg-body)] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{t.filtersActive}</span>
              {search.trim() && (
                <span className="rounded-full bg-[var(--bg-card)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  &quot;{search.trim()}&quot;
                </span>
              )}
              {statusFilter && (
                <span className="rounded-full bg-[var(--bg-card)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {STATUS_FILTER.find(f => f.value === statusFilter)?.label ?? statusFilter}
                </span>
              )}
              {mpFilter && (
                <span className="rounded-full bg-[var(--bg-card)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {marketplaces.find(mp => mp.slug === mpFilter)?.name ?? mpFilter}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-indigo-700">
                {selected.size} {t.selectedCount}
              </span>
              {mpFilter && selectedReadyCount > 0 && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-green-700">
                  {selectedReadyCount} {t.ready}
                </span>
              )}
              {selectedOverBulkLimit && (
                <span className="text-xs font-medium text-amber-700">{t.bulkLimit}</span>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {mpFilter && selectedCategoryGroups.length > 1 && splitSelectionGroups.length === 0 && (
                <button
                  onClick={() => startSplitSelection(selectedCategoryGroups)}
                  disabled={exportBusy}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {PRODUCTS_PAGE_COPY[lang].splitSelectionStart}
                </button>
              )}

              {mpFilter && (
                <button onClick={() => setShowExportPreflight(true)} disabled={exportBusy}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    exportBusy
                      ? "cursor-wait bg-green-200 text-green-700"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}>
                  {exportBusy
                    ? <><svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t.exporting}</>
                    : <><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {t.exportTo} {marketplaces.find(m => m.slug === mpFilter)?.name ?? mpFilter}</>}
                </button>
              )}

              <button
                onClick={() => {
                  if (selectedOverBulkLimit || exportBusy) return;
                  setShowBulkAI(true);
                }}
                aria-disabled={selectedOverBulkLimit || exportBusy}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  selectedOverBulkLimit || exportBusy
                    ? "cursor-not-allowed bg-indigo-200 text-indigo-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 3v6"/><path d="M12 15v6"/><path d="M5.64 5.64l4.24 4.24"/><path d="M14.12 14.12l4.24 4.24"/>
                  <path d="M3 12h6"/><path d="M15 12h6"/><path d="M5.64 18.36l4.24-4.24"/><path d="M14.12 9.88l4.24-4.24"/>
                </svg>
                {t.generateAI}
              </button>

              <button
                disabled={exportBusy}
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.deleteSelected}
              </button>
            </div>
          </div>

          {splitSelectionGroups.length > 0 && (
              <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/70 px-3 py-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
                      {PRODUCTS_PAGE_COPY[lang].splitSelectionTitle}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {PRODUCTS_PAGE_COPY[lang].splitSelectionDesc}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {splitSelectionGroups.length > 1 && (
                    <button
                      onClick={() => { void runSplitBatchExport(splitSelectionGroups); }}
                      disabled={exportBusy}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        exportBusy
                          ? "cursor-wait bg-indigo-200 text-indigo-500"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {PRODUCTS_PAGE_COPY[lang].splitSelectionRunAll}
                    </button>
                  )}
                  <button
                    onClick={disableSplitSelection}
                    disabled={exportBusy}
                    className="rounded-xl border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-body)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {PRODUCTS_PAGE_COPY[lang].splitSelectionOff}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {splitSelectionGroups.map((group) => {
                  const active = activeSplitSelectionGroup?.categoryPath === group.categoryPath;
                  return (
                    <button
                      key={group.categoryPath}
                      onClick={() => activateSplitSelectionGroup(group)}
                      disabled={exportBusy}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {group.categoryPath} ({group.count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ExportBatchReportPanel
        groups={exportBatchGroups}
        running={batchExporting}
        onRetryFailed={() => { void runSplitBatchExport(getRetryableProductExportGroups(exportBatchGroups)); }}
        onClose={clearExportBatchReport}
        onOpenGroup={focusExportBatchGroup}
      />

      {inlineJobActive && activeInlineJob && (
        <div className="mb-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-indigo-900">{t.activeJobTitle}</div>
              <div className="text-xs text-indigo-700">
                {activeInlineJob.currentMessage || t.bulkModal.jobWaiting}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/80 px-2 py-1 font-semibold text-indigo-700">
                {Math.max(0, Math.min(100, activeInlineJob.progressPercent ?? 0))}%
              </span>
              <span className="rounded-full bg-white/80 px-2 py-1 text-indigo-700">
                {formatDurationLabel(activeInlineJob.elapsedSeconds)}
              </span>
              {activeInlineJob.etaSeconds != null && (
                <span className="rounded-full bg-white/80 px-2 py-1 text-indigo-700">
                  ETA {formatDurationLabel(activeInlineJob.etaSeconds)}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-indigo-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, activeInlineJob.progressPercent ?? 0))}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-3 grid gap-3 md:grid-cols-4">
        {[
          {
            focus: "all" as const,
            label: PRODUCTS_PAGE_COPY[lang].focusAll,
            value: listingStats.all,
            hint: PRODUCTS_PAGE_COPY[lang].focusAllHint,
          },
          {
            focus: "ready" as const,
            label: PRODUCTS_PAGE_COPY[lang].focusReady,
            value: listingStats.ready,
            hint: PRODUCTS_PAGE_COPY[lang].focusReadyHint,
          },
          {
            focus: "review" as const,
            label: PRODUCTS_PAGE_COPY[lang].focusReview,
            value: listingStats.review,
            hint: PRODUCTS_PAGE_COPY[lang].focusReviewHint,
          },
          {
            focus: "blocked" as const,
            label: PRODUCTS_PAGE_COPY[lang].focusBlocked,
            value: listingStats.blocked,
            hint: formatBlockedMixHint(
              PRODUCTS_PAGE_COPY[lang].blockedMixHint,
              listingStats.unmapped,
              listingStats.attributesMissing
            ),
          },
        ].map((card) => {
          const active = listingFocus === card.focus;
          return (
            <button
              key={card.focus}
              onClick={() => setListingFocus(card.focus)}
              className="rounded-2xl p-4 text-left transition"
              style={active ? {
                background: "var(--accent-primary-light)",
                border: "1px solid var(--accent-primary-border)",
                boxShadow: "0 0 0 1px var(--accent-primary-border) inset",
              } : {
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: active ? "var(--accent-primary)" : "var(--text-tertiary)" }}>
                {card.label}
              </div>
              <div className="mt-2 text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>{card.value}</div>
              <div className="mt-2 text-sm leading-5" style={{ color: "var(--text-secondary)" }}>{card.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)]">

        {/* Column headers */}
        <div className="hidden items-center border-b border-[var(--border-light)] bg-[var(--bg-table-header)] px-4 py-3 md:grid"
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
          <>
            <div className="divide-y divide-[var(--border-light)] md:hidden">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-3 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-4 w-4 animate-pulse rounded bg-[var(--bg-input)]" />
                    <div className="h-14 w-14 animate-pulse rounded-xl bg-[var(--bg-input)]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--bg-input)]" />
                      <div className="h-4 w-4/5 animate-pulse rounded-full bg-[var(--bg-input)]" />
                      <div className="h-3 w-3/5 animate-pulse rounded-full bg-[var(--bg-input)]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--bg-input)]" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--bg-input)]" />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden divide-y divide-[var(--border-light)] md:block">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: "36px 44px 1fr 180px 40px" }}>
                  <div className="mx-auto h-4 w-4 animate-pulse rounded bg-[var(--bg-input)]" />
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--bg-input)]" />
                  <div className="space-y-2 pl-3">
                    <div className="h-4 w-2/5 animate-pulse rounded-full bg-[var(--bg-input)]" />
                    <div className="h-3 w-3/5 animate-pulse rounded-full bg-[var(--bg-input)]" />
                  </div>
                  <div className="flex gap-2 pl-2">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--bg-input)]" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--bg-input)]" />
                  </div>
                  <div className="mx-auto h-4 w-4 animate-pulse rounded bg-[var(--bg-input)]" />
                </div>
              ))}
            </div>
          </>
        ) : visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-empty-icon)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div className="max-w-md text-center">
              <div className="mb-1 font-semibold text-[var(--text-secondary)]">
                {hasListViewFilters ? t.noResults : t.noProducts}
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">
                {hasFilters
                  ? t.emptyFilterHint
                  : listingFocus !== "all"
                    ? PRODUCTS_PAGE_COPY[lang].focusEmpty
                    : t.emptyHint}
              </div>
            </div>

            {hasListViewFilters && (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {search.trim() && (
                    <span className="rounded-full bg-[var(--bg-body)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      &quot;{search.trim()}&quot;
                    </span>
                  )}
                  {statusFilter && (
                    <span className="rounded-full bg-[var(--bg-body)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {STATUS_FILTER.find(f => f.value === statusFilter)?.label ?? statusFilter}
                    </span>
                  )}
                  {mpFilter && (
                    <span className="rounded-full bg-[var(--bg-body)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {marketplaces.find(mp => mp.slug === mpFilter)?.name ?? mpFilter}
                    </span>
                  )}
                  {listingFocus !== "all" && (
                    <span className="rounded-full bg-[var(--bg-body)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {focusLabels[listingFocus]}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {listingFocus !== "all" && (
                    <button
                      onClick={() => setListingFocus("all")}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
                    >
                      {PRODUCTS_PAGE_COPY[lang].focusReset}
                    </button>
                  )}
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
                    >
                      {t.clearFilters}
                    </button>
                  )}
                </div>
              </>
            )}

            {!hasFilters && listingFocus === "all" && (
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <button onClick={() => setShowImport(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100">
                  <UploadIcon /> {t.importProducts}
                </button>
                <button onClick={() => router.push("/dashboard/new-product")}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--bg-input)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-input-alt)]">
                  <PlusIcon /> {t.addManually}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--border-light)] md:hidden">
              {visibleProducts.map(p => {
                const integList = parseIntegrations(p.integrations);
                const isSelected = selected.has(p.id);
                const statusLabel = getStatusLabel(t, p.status);
                const listingState = getProductListingState(p);
                const listingIssue = getListingIssueMeta(lang, listingState);

                return (
                  <div
                    key={p.id}
                    className={`px-4 py-4 transition-colors ${isSelected ? "bg-[var(--bg-card-selected)]" : "hover:bg-[var(--bg-card-hover)]"}`}
                    onClick={() => router.push(`/dashboard/products/${p.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-indigo-600"
                        />
                      </div>

                      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--img-placeholder-border)] bg-[var(--img-placeholder-bg)]">
                        {p.image_url ? (
                          <UnoptimizedRemoteImage
                            src={p.image_url}
                            alt={p.title || ""}
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                            p.status === "mapped"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : p.status === "pending"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : p.status === "needs_review"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : p.status === "exported"
                                    ? "border-slate-200 bg-slate-100 text-slate-700"
                                    : "border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-secondary)]"
                          }`}>
                            {statusLabel}
                          </span>
                          {p.brand && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                              {p.brand}
                            </span>
                          )}
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${listingIssue.className}`}>
                            {listingIssue.label}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                          {p.title || <span className="italic font-normal text-[var(--text-tertiary)]">{t.noName}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-mono text-[var(--text-tertiary)]">
                          <span>ID {p.id}</span>
                          {p.sku && <span>SKU {p.sku}</span>}
                          {p.ean && <span>EAN {p.ean}</span>}
                          {p.asin && <span>ASIN {p.asin}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {integList.length > 0
                        ? integList.map(integ => {
                            const ready = integ.missing === 0;
                            const isFiltered = mpFilter === integ.slug;
                            return (
                              <span
                                key={integ.slug}
                                title={ready ? "Wszystkie wymagane atrybuty uzupełnione" : `Brakuje ${integ.missing} atrybutów`}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold transition ${
                                  ready
                                    ? isFiltered
                                      ? "border-green-300 bg-green-100 text-green-800"
                                      : "border-green-200 bg-green-50 text-green-700"
                                    : isFiltered
                                      ? "border-amber-300 bg-amber-100 text-amber-800"
                                      : "border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-secondary)]"
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ready ? "bg-green-500" : "bg-amber-400"}`} />
                                {integ.name}{ready ? "" : ` / ${integ.missing}`}
                              </span>
                            );
                          })
                        : <span className="text-[10px] text-slate-300">&mdash;</span>
                      }
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/products/${p.id}`)}
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)]"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        {t.deleteProduct}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden divide-y divide-[var(--border-light)] md:block">
              {visibleProducts.map(p => {
                const integList  = parseIntegrations(p.integrations);
                const isSelected = selected.has(p.id);
                const statusLabel = getStatusLabel(t, p.status);
                const listingState = getProductListingState(p);
                const listingIssue = getListingIssueMeta(lang, listingState);

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
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-[var(--img-placeholder-bg)] flex items-center justify-center flex-shrink-0 border border-[var(--img-placeholder-border)]">
                      {p.image_url ? (
                        <UnoptimizedRemoteImage
                          src={p.image_url}
                          alt={p.title || ""}
                          sizes="36px"
                          className="object-cover"
                        />
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
                          {p.title || <span className="text-[var(--text-tertiary)] font-normal italic">{t.noName}</span>}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                          p.status === "mapped"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : p.status === "needs_review"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : p.status === "exported"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-default)]"
                        }`}>
                          {statusLabel}
                        </span>
                        {p.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0
                            text-indigo-600 bg-indigo-50">
                            {p.brand}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border flex-shrink-0 ${listingIssue.className}`}>
                          {listingIssue.label}
                        </span>
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
                                title={ready ? "Wszystkie wymagane atrybuty uzupełnione" : `Brakuje ${integ.missing} atrybutów`}
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
                                {integ.name}{ready ? "" : ` / ${integ.missing}`}
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
                        className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <DotsIcon />
                      </button>
                      {openMenu === p.id && (
                        <div className="absolute right-0 top-8 z-20 w-40 bg-[var(--menu-bg)] rounded-xl shadow-xl
                          border border-[var(--border-default)] overflow-hidden">
                          <button onClick={() => router.push(`/dashboard/products/${p.id}`)}
                            className="w-full text-left px-3 py-2.5 text-xs text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-body)] transition">
                            {t.edit}
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            className="w-full text-left px-3 py-2.5 text-xs text-red-500 font-medium hover:bg-red-50 transition">
                            {t.deleteProduct}
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
              <div className="flex flex-col gap-2 border-t border-[var(--border-light)] bg-[var(--bg-table-header)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--text-tertiary)]">
                  {t.page} {page} {t.of} {totalPages} &middot; {total} {t.productCount}
                </div>
                <div className="flex flex-wrap gap-1">
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
