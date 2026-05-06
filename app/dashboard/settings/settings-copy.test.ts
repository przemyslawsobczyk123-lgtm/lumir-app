import assert from "node:assert/strict";
import test from "node:test";

import { translations, type Lang } from "../i18n.ts";

test("settings copy does not expose moved billing banner", () => {
  for (const lang of ["pl", "en"] satisfies Lang[]) {
    const settings = translations[lang].settings as Record<string, string>;
    const copy = Object.values(settings).join(" ");

    assert.equal("billingBanner" in settings, false);
    assert.equal("billingBannerDesc" in settings, false);
    assert.equal("openBilling" in settings, false);
    assert.doesNotMatch(copy, /billing przeniesiony|billing moved|payment history/i);
  }
});
