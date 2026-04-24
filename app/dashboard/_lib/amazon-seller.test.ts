import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAmazonAuthContinueRequest,
  parseAmazonWebsiteAuthorizationSearchParams,
  readLuMirAuthToken,
} from "./amazon-seller.ts";

test("parseAmazonWebsiteAuthorizationSearchParams reads website auth params", () => {
  const result = parseAmazonWebsiteAuthorizationSearchParams(
    new URLSearchParams({
      amazon_callback_uri: "https://amazon.com/apps/authorize/confirm/app-1",
      amazon_state: "1",
      selling_partner_id: "A3EXAMPLE123",
    })
  );

  assert.deepEqual(result, {
    ok: true,
    value: {
      amazonCallbackUri: "https://amazon.com/apps/authorize/confirm/app-1",
      amazonState: "1",
      sellingPartnerId: "A3EXAMPLE123",
    },
  });
});

test("parseAmazonWebsiteAuthorizationSearchParams reports missing params", () => {
  const result = parseAmazonWebsiteAuthorizationSearchParams(new URLSearchParams());

  assert.equal(result.ok, false);
  assert.match(result.error, /amazon_callback_uri/i);
  assert.match(result.error, /amazon_state/i);
  assert.match(result.error, /selling_partner_id/i);
});

test("buildAmazonAuthContinueRequest includes bearer token and backend payload", () => {
  const request = buildAmazonAuthContinueRequest({
    apiBaseUrl: "https://api.lumirai.pl/",
    token: "lumir-token",
    amazonCallbackUri: "https://amazon.com/apps/authorize/confirm/app-1",
    amazonState: "1",
    sellingPartnerId: "A3EXAMPLE123",
  });

  assert.equal(request.url, "https://api.lumirai.pl/api/seller/amazon/auth/continue");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(request.init.headers, {
    Authorization: "Bearer lumir-token",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    amazonCallbackUri: "https://amazon.com/apps/authorize/confirm/app-1",
    amazonState: "1",
    sellingPartnerId: "A3EXAMPLE123",
  });
});

test("readLuMirAuthToken returns trimmed token from storage", () => {
  const token = readLuMirAuthToken({
    getItem(key) {
      return key === "token" ? "  lumir-token  " : null;
    },
  });

  assert.equal(token, "lumir-token");
});
