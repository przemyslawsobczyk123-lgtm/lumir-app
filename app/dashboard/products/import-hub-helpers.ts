export type MarketplaceImportProvider = "allegro" | "amazon";
export type MarketplaceImportMode = "import_only" | "import_and_ai";

export type AllegroImportItem = {
  remoteId: string;
  title?: string | null;
};

export type AmazonImportItem = {
  asin?: string | null;
  ean?: string | null;
  title?: string | null;
};

export type MarketplaceImportItem = AllegroImportItem | AmazonImportItem;

type BuildMarketplaceImportPayloadInput = {
  provider: MarketplaceImportProvider;
  selectedItems: MarketplaceImportItem[];
  mode?: MarketplaceImportMode;
  accountId?: number | null;
};

type AllegroImportPayload = {
  provider: "allegro";
  mode: MarketplaceImportMode;
  accountId: number | null;
  items: Array<{ remoteId: string }>;
};

type AmazonImportPayload = {
  provider: "amazon";
  mode: MarketplaceImportMode;
  items: Array<{ asin: string | null; ean: string | null }>;
};

export type MarketplaceImportPayload = AllegroImportPayload | AmazonImportPayload;

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
  const mode = input.mode ?? "import_and_ai";

  if (input.provider === "allegro") {
    return {
      provider: "allegro",
      mode,
      accountId: input.accountId ?? null,
      items: input.selectedItems.map((item) => ({
        remoteId: String((item as AllegroImportItem).remoteId || "").trim(),
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
