export type AmazonWebsiteAuthorizationSearchParams = {
  amazonCallbackUri: string;
  amazonState: string;
  sellingPartnerId: string;
};

export type AmazonWebsiteAuthorizationSearchParamsResult =
  | { ok: true; value: AmazonWebsiteAuthorizationSearchParams }
  | { ok: false; error: string };

export type StorageLike = {
  getItem(key: string): string | null;
};

export type AmazonAuthContinueRequest = {
  url: string;
  init: {
    method: "POST";
    headers: {
      Authorization: string;
      "Content-Type": "application/json";
    };
    body: string;
  };
};

const AMAZON_AUTH_CONTINUE_PATH = "/api/seller/amazon/auth/continue";
const LU_MIR_TOKEN_KEY = "token";

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function parseAmazonWebsiteAuthorizationSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): AmazonWebsiteAuthorizationSearchParamsResult {
  const amazonCallbackUri = normalizeText(searchParams.get("amazon_callback_uri"));
  const amazonState = normalizeText(searchParams.get("amazon_state"));
  const sellingPartnerId = normalizeText(searchParams.get("selling_partner_id"));

  const missing = [
    !amazonCallbackUri && "amazon_callback_uri",
    !amazonState && "amazon_state",
    !sellingPartnerId && "selling_partner_id",
  ].filter((value): value is string => Boolean(value));

  if (missing.length) {
    return {
      ok: false,
      error: `Brak parametrow: ${missing.join(", ")}`,
    };
  }

  return {
    ok: true,
    value: {
      amazonCallbackUri,
      amazonState,
      sellingPartnerId,
    },
  };
}

export function readLuMirAuthToken(storage?: StorageLike): string {
  const activeStorage = storage || (typeof window !== "undefined" ? window.localStorage : null);
  if (!activeStorage) return "";
  return normalizeText(activeStorage.getItem(LU_MIR_TOKEN_KEY));
}

export function buildAmazonAuthContinueRequest({
  apiBaseUrl,
  token,
  amazonCallbackUri,
  amazonState,
  sellingPartnerId,
}: {
  apiBaseUrl: string;
  token: string;
} & AmazonWebsiteAuthorizationSearchParams): AmazonAuthContinueRequest {
  const baseUrl = normalizeText(apiBaseUrl).replace(/\/+$/, "");
  const authToken = normalizeText(token);

  if (!baseUrl) {
    throw new Error("Brak adresu API");
  }
  if (!authToken) {
    throw new Error("Brak tokenu LuMir");
  }

  return {
    url: `${baseUrl}${AMAZON_AUTH_CONTINUE_PATH}`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amazonCallbackUri,
        amazonState,
        sellingPartnerId,
      }),
    },
  };
}
