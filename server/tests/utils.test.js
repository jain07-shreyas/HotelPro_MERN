import test from "node:test";
import assert from "node:assert/strict";
import { getPagination, pageMeta } from "../src/utils/pagination.js";
import { createToken, hashToken } from "../src/utils/tokens.js";

test("pagination defaults, clamping and skip", () => {
  assert.deepEqual(getPagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(getPagination({ page: "3", limit: "10" }), { page: 3, limit: 10, skip: 20 });
  assert.equal(getPagination({ limit: "9999" }).limit, 100);
  assert.equal(getPagination({ page: "-4", limit: "0" }).page, 1);
  assert.deepEqual(pageMeta(45, 2, 20), { total: 45, page: 2, limit: 20, pages: 3 });
  assert.equal(pageMeta(0, 1, 20).pages, 1);
});

test("tokens: raw differs from stored hash, hash is reproducible", () => {
  const { raw, hashed } = createToken();
  assert.notEqual(raw, hashed);
  assert.equal(hashToken(raw), hashed);
  assert.equal(raw.length, 64);
  assert.notEqual(createToken().raw, raw);
});
