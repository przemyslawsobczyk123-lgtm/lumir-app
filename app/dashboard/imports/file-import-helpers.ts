import { isAmazonUiEnabled, withoutAmazonWhenDisabled } from "../mvp-feature-flags.ts";

export type FileImportMarketplace = "mediaexpert" | "empik" | "custom";
export type RemoteImportMarketplace = "allegro" | "amazon";
export type ImportDestinationId = FileImportMarketplace | RemoteImportMarketplace;

export type ImportDestination = {
  id: ImportDestinationId;
  kind: "file" | "remote";
  label: string;
  accent: string;
};

const ALLOWED_IMPORT_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

export const FILE_IMPORT_MARKETPLACES: FileImportMarketplace[] = ["mediaexpert", "empik", "custom"];

export const IMPORT_DESTINATIONS: ImportDestination[] = [
  { id: "mediaexpert", kind: "file", label: "Media Expert", accent: "border-amber-400/60" },
  { id: "empik", kind: "file", label: "Empik", accent: "border-rose-400/60" },
  { id: "custom", kind: "file", label: "W\u0142asny plik", accent: "border-cyan-400/60" },
  { id: "allegro", kind: "remote", label: "Allegro", accent: "border-emerald-400/60" },
  { id: "amazon", kind: "remote", label: "Amazon", accent: "border-orange-400/60" },
];

export function isAllowedImportFileName(fileName: string) {
  const normalized = String(fileName || "").trim().toLowerCase();
  const ext = normalized.split(".").pop() || "";
  return Boolean(normalized && ext && ALLOWED_IMPORT_EXTENSIONS.has(ext));
}

export function getImportDestination(id: ImportDestinationId) {
  return IMPORT_DESTINATIONS.find((item) => item.id === id) || null;
}

export function getVisibleImportDestinations(amazonEnabled = isAmazonUiEnabled()) {
  return withoutAmazonWhenDisabled(IMPORT_DESTINATIONS, (item) => item.id, amazonEnabled);
}
