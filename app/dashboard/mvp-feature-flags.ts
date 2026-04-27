const AMAZON_UI_ENV_VALUE = process.env.NEXT_PUBLIC_ENABLE_AMAZON;

export function isAmazonUiEnabled(value: string | undefined = AMAZON_UI_ENV_VALUE) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function isAmazonMarketplaceId(value: unknown) {
  return String(value || "").trim().toLowerCase() === "amazon";
}

export function withoutAmazonWhenDisabled<T>(
  entries: readonly T[],
  getMarketplaceId: (entry: T) => unknown,
  amazonEnabled = isAmazonUiEnabled()
): T[] {
  if (amazonEnabled) return [...entries];
  return entries.filter((entry) => !isAmazonMarketplaceId(getMarketplaceId(entry)));
}

export function resolveMarketplaceSlugForMvp(slug: string | null | undefined, amazonEnabled = isAmazonUiEnabled()) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (isAmazonMarketplaceId(normalized) && !amazonEnabled) return "allegro";
  return normalized || "allegro";
}
