export type PendingAllegroLink = {
  marketplaceSlug: "allegro";
  accountId: number;
  remoteOfferId: string;
  remoteOfferTitle: string | null;
  remoteExternalId: string | null;
};

export type AllegroImportCheckResponse = {
  exists: boolean;
  productId: number | null;
  productTitle: string | null;
  remoteOfferId: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPendingAllegroLink(input: {
  accountId: number;
  offerId: string;
  offerTitle?: string | null;
}): PendingAllegroLink {
  return {
    marketplaceSlug: "allegro",
    accountId: input.accountId,
    remoteOfferId: normalizeText(input.offerId),
    remoteOfferTitle: normalizeText(input.offerTitle) || null,
    remoteExternalId: null,
  };
}

export function getAllegroDuplicateImportMessage(
  input: AllegroImportCheckResponse | null | undefined
): string {
  if (!input?.exists) {
    return "";
  }

  const productId = Number.isInteger(input.productId) ? input.productId : "?";
  const productTitle = normalizeText(input.productTitle) || "Produkt z LuMir";

  return `Produkt juz istnieje w LuMir (#${productId}: ${productTitle}). Pomijamy import tej oferty. Usun lokalny produkt, jesli chcesz zaimportowac te oferte ponownie.`;
}

export function getAllegroDuplicateImportDeleteConfirmMessage(
  input: AllegroImportCheckResponse | null | undefined
): string {
  if (!input?.exists || !Number.isInteger(input.productId)) {
    return "";
  }

  const productTitle = normalizeText(input.productTitle) || "Produkt z LuMir";

  return `Produkt juz istnieje w LuMir (#${input.productId}: ${productTitle}). Usunac tylko lokalny produkt w LuMir i pobrac oferte ponownie? Oferta Allegro nie zostanie usunieta.`;
}

export function buildAllegroDescriptionHtml(rawSections: unknown): string {
  const sections = Array.isArray(rawSections) ? rawSections : [];
  let html = "";

  for (const sectionValue of sections) {
    const section = sectionValue && typeof sectionValue === "object"
      ? sectionValue as { items?: unknown[] | null }
      : {};
    const items = Array.isArray(section.items) ? section.items : [];

    for (const itemValue of items) {
      const item = itemValue && typeof itemValue === "object"
        ? itemValue as { type?: unknown; content?: unknown; url?: unknown }
        : {};
      const type = normalizeText(item.type).toUpperCase();
      if (type === "TEXT") {
        html += escapeHtml(item.content);
      } else if (type === "IMAGE") {
        const url = normalizeText(item.url);
        if (url) {
          html += `<img src="${escapeHtml(url)}" alt="" style="max-width:100%">`;
        }
      }
    }
  }

  return html;
}
