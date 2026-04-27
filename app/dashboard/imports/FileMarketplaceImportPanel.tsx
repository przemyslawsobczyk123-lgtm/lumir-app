"use client";

import { useRef, useState } from "react";

import { useLang } from "../LangContext";
import type { MarketplaceImportMode } from "../products/import-hub-helpers";
import {
  type FileImportMarketplace,
  getImportDestination,
  isAllowedImportFileName,
} from "./file-import-helpers";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type QueuedFileImportJob = {
  id: string;
  type?: string | null;
  status: string;
  progressPercent?: number | null;
  currentMessage?: string | null;
  requestedItems?: number | null;
  createdAt?: string | null;
};

type Props = {
  marketplace: FileImportMarketplace;
  onBack: () => void;
  onClose: () => void;
  onQueued: (payload: {
    job: QueuedFileImportJob;
    provider: FileImportMarketplace;
    mode: MarketplaceImportMode;
    selectedCount: number;
  }) => void;
};

type CustomImportTargetMarketplace = Exclude<FileImportMarketplace, "custom">;

const COPY = {
  pl: {
    eyebrow: "Import pliku",
    title: "Import produktow",
    fileLabel: "Plik produktow",
    targetLabel: "Mapuj do",
    pickFile: "Wybierz plik",
    noFile: "Wybierz plik XLSX, XLS albo CSV.",
    badFile: "Ten format nie jest obslugiwany. Wgraj XLSX, XLS albo CSV.",
    selected: "Wybrany plik",
    start: "Start importu",
    starting: "Uruchamiam...",
    close: "Zamknij",
    back: "Wroc",
    queueError: "Nie udalo sie uruchomic importu",
  },
  en: {
    eyebrow: "File import",
    title: "Product import",
    fileLabel: "Product file",
    targetLabel: "Map to",
    pickFile: "Choose file",
    noFile: "Choose an XLSX, XLS, or CSV file.",
    badFile: "This format is not supported. Upload XLSX, XLS, or CSV.",
    selected: "Selected file",
    start: "Start import",
    starting: "Starting...",
    close: "Close",
    back: "Back",
    queueError: "Failed to start import",
  },
} as const;

const CUSTOM_IMPORT_TARGETS: CustomImportTargetMarketplace[] = ["mediaexpert", "empik"];

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function FileMarketplaceImportPanel({ marketplace, onBack, onClose, onQueued }: Props) {
  const { lang } = useLang();
  const copy = lang === "en" ? COPY.en : COPY.pl;
  const destination = getImportDestination(marketplace);
  const isCustom = marketplace === "custom";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customTarget, setCustomTarget] = useState<CustomImportTargetMarketplace>("mediaexpert");

  const handleFileChange = (nextFile: File | null) => {
    setError("");
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!isAllowedImportFileName(nextFile.name)) {
      setFile(null);
      setError(copy.badFile);
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!file) {
      setError(copy.noFile);
      return;
    }
    if (!isAllowedImportFileName(file.name)) {
      setError(copy.badFile);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("products", file, file.name);
      form.append("marketplace", isCustom ? customTarget : marketplace);
      form.append("sourceFormat", isCustom ? "custom" : "marketplace");
      form.append("useAllegro", "false");

      const res = await fetch(`${API}/api/products/import`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        const code = typeof json.code === "string" ? `${json.code}: ` : "";
        throw new Error(`${code}${json.error || copy.queueError}`);
      }

      onQueued({
        job: json.data?.job as QueuedFileImportJob,
        provider: marketplace,
        mode: "import_and_ai",
        selectedCount: Number(json.data?.job?.requestedItems || 1),
      });
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, copy.queueError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#020617] shadow-[0_30px_80px_rgba(2,6,23,0.65)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.3),_transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/80">{copy.eyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{destination?.label || copy.title}</h2>
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
        </div>

        <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,1))] px-6 py-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.fileLabel}</div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-indigo-300/40 bg-indigo-500/15 px-4 py-3 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25"
              >
                {copy.pickFile}
              </button>
              <div className="min-w-0 text-sm text-slate-300">
                {file ? (
                  <span><span className="text-slate-500">{copy.selected}: </span>{file.name}</span>
                ) : (
                  <span>{copy.noFile}</span>
                )}
              </div>
            </div>
          </div>

          {isCustom && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.targetLabel}</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {CUSTOM_IMPORT_TARGETS.map((target) => {
                  const targetDestination = getImportDestination(target);
                  const selected = customTarget === target;
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setCustomTarget(target)}
                      aria-pressed={selected}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        selected
                          ? "border-indigo-300 bg-indigo-500/20 text-white"
                          : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {targetDestination?.label || target}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-slate-950/80 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={onBack}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              {copy.back}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                {copy.close}
              </button>
              <button
                onClick={() => { void handleSubmit(); }}
                aria-disabled={!file || submitting}
                className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition ${
                  !file || submitting
                    ? "cursor-not-allowed bg-indigo-500/40"
                    : "bg-indigo-500 hover:bg-indigo-400"
                }`}
              >
                {submitting ? copy.starting : copy.start}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
