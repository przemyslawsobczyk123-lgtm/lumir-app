import assert from "node:assert/strict";
import test from "node:test";

import { getCreateProductSuccessRedirectPath } from "./create-product-helpers.ts";

test("new product success redirects to product list", () => {
  assert.equal(getCreateProductSuccessRedirectPath(123), "/dashboard/products");
});
