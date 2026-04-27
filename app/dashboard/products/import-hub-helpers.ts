export type MarketplaceImportProvider = "allegro" | "amazon";
export type MarketplaceImportMode = "import_only" | "import_and_ai";
export type AllegroImportSourceKind = "seller_offer" | "external_link";

export type AllegroImportItem = {
  remoteId: string;
  title?: string | null;
  url?: string | null;
  offerId?: string | null;
  productId?: string | null;
};

export type AmazonImportItem = {
  asin?: string | null;
  ean?: string | null;
  title?: string | null;
};

export type MarketplaceImportItem = AllegroImportItem | AmazonImportItem;

type BuildMarketplaceImportPayloadInput = {
  provider: MarketplaceImportProvider;
  sourceKind?: AllegroImportSourceKind;
  selectedItems: MarketplaceImportItem[];
  mode?: MarketplaceImportMode;
  accountId?: number | null;
};

type AllegroImportPayload = {
  provider: "allegro";
  sourceKind?: AllegroImportSourceKind;
  mode: MarketplaceImportMode;
  accountId: number | null;
  items: Array<{ remoteId: string; url?: string; offerId?: string; productId?: string }>;
};

type AmazonImportPayload = {
  provider: "amazon";
  mode: MarketplaceImportMode;
  items: Array<{ asin: string | null; ean: string | null }>;
};

export type MarketplaceImportPayload = AllegroImportPayload | AmazonImportPayload;

const ALLEGRO_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parseAllegroExternalLink(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{6,}$/.test(raw)) {
    return { url: null, remoteId: raw, offerId: raw, productId: null };
  }

  const uuidOnly = raw.match(ALLEGRO_UUID_RE)?.[0]?.toLowerCase() || "";
  if (uuidOnly && !/^https?:\/\//i.test(raw)) {
    return { url: null, remoteId: uuidOnly, offerId: null, productId: uuidOnly };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (!hostname.endsWith("allegro.pl") && !hostname.endsWith("allegrosandbox.pl")) {
    return null;
  }

  const offerId = parsed.searchParams.get("offerId")?.trim()
    || parsed.pathname.match(/(?:^|[-/])(\d{8,})(?:$|[/?#-])/i)?.[1]
    || null;
  const productId = parsed.pathname.match(ALLEGRO_UUID_RE)?.[0]?.toLowerCase() || null;
  const remoteId = offerId || productId;
  if (!remoteId) return null;

  return {
    url: raw,
    remoteId,
    offerId,
    productId,
  };
}

export function getImportItemKey(provider: MarketplaceImportProvider, item: MarketplaceImportItem) {
  if (provider === "allegro") {
    const remoteId = String((item as AllegroImportItem).remoteId || "").trim();
    return `allegro:${remoteId}`;
  }

  const asin = String((item as AmazonImportItem).asin || "").trim();
  const ean = String((item as AmazonImportItem).ean || "").trim();
  return `amazon:${asin || "-"}:${ean || "-"}`;
}

export function toggleImportSelection(selectedKeys: Set<string>, itemKey: string) {
  const next = new Set(selectedKeys);
  if (next.has(itemKey)) {
    next.delete(itemKey);
    return next;
  }
  next.add(itemKey);
  return next;
}

export function toggleVisibleImportSelection(selectedKeys: Set<string>, visibleKeys: string[]) {
  const next = new Set(selectedKeys);
  const pageKeys = visibleKeys.filter(Boolean);
  const allSelected = pageKeys.length > 0 && pageKeys.every((key) => next.has(key));

  for (const key of pageKeys) {
    if (allSelected) next.delete(key);
    else next.add(key);
  }

  return next;
}

export function buildMarketplaceImportPayload(
  input: BuildMarketplaceImportPayloadInput
): MarketplaceImportPayload {
  const sourceKind = input.provider === "allegro" ? (input.sourceKind || "seller_offer") : undefined;
  const mode = sourceKind === "external_link" ? "import_and_ai" : (input.mode ?? "import_and_ai");

  if (input.provider === "allegro") {
    return {
      provider: "allegro",
      ...(sourceKind === "external_link" ? { sourceKind } : {}),
      mode,
      accountId: input.accountId ?? null,
      items: input.selectedItems.map((item) => ({
        remoteId: String((item as AllegroImportItem).remoteId || "").trim(),
        ...normalizeOptionalField("url", (item as AllegroImportItem).url),
        ...normalizeOptionalField("offerId", (item as AllegroImportItem).offerId),
        ...normalizeOptionalField("productId", (item as AllegroImportItem).productId),
      })),
    };
  }

  return {
    provider: "amazon",
    mode,
    items: input.selectedItems.map((item) => ({
      asin: normalizeOptionalString((item as AmazonImportItem).asin),
      ean: normalizeOptionalString((item as AmazonImportItem).ean),
    })),
  };
}

function normalizeOptionalString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function normalizeOptionalField(key: "url" | "offerId" | "productId", value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? { [key]: normalized } : {};
}
