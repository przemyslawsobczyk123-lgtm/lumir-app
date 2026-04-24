export type AmazonStatus = {
  configured: boolean;
  ready: boolean;
  hasRefreshToken: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  marketplaceId: string;
  endpoint: string;
  message: string;
};

export type AmazonCatalogItem = {
  asin?: string;
  title?: string;
  brand?: string;
  ean?: string;
  images?: string[];
  descriptionHtml?: string;
  featureBullets?: string[];
  parameters?: Record<string, string>;
  classifications?: string[];
  productTypes?: string[];
  marketplaceId?: string;
};

export type AmazonImportProductForm = {
  title: string;
  brand: string;
  asin: string;
  ean: string;
  desc: string;
  descHtml: string;
  globalSlots: Array<string | null>;
};

export const AMAZON_IMPORT_KEY = "lumir.amazon-import";

export function stripAmazonHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyAmazonCatalogItemToProductForm(
  current: AmazonImportProductForm,
  item: AmazonCatalogItem,
  slotsCount = current.globalSlots.length || 16
): AmazonImportProductForm {
  const nextSlots = Array.from({ length: slotsCount }, (_, index) => current.globalSlots[index] ?? null);

  if (Array.isArray(item.images) && item.images.length) {
    item.images.forEach((url, index) => {
      if (!url || index >= slotsCount) return;
      nextSlots[index] = url;
    });
  }

  const nextDescriptionHtml = item.descriptionHtml || current.descHtml;
  const strippedDescription = item.descriptionHtml ? stripAmazonHtml(item.descriptionHtml) : "";

  return {
    title: item.title || current.title,
    brand: item.brand || current.brand,
    asin: item.asin || current.asin,
    ean: item.ean || current.ean,
    desc: strippedDescription || current.desc,
    descHtml: nextDescriptionHtml,
    globalSlots: nextSlots,
  };
}
