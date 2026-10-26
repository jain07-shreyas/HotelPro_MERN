import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeObject } from "../src/utils/sanitize.js";

test("removes $-operators and dotted keys at any depth", () => {
  const out = sanitizeObject({ email: { $ne: "" }, a: { b: { $gt: 1, ok: 2 } }, "x.y": 1, list: [{ $where: "1", keep: true }] });
  assert.deepEqual(out, { email: {}, a: { b: { ok: 2 } }, list: [{ keep: true }] });
});

test("keeps normal values, dates and numbers; strips null bytes", () => {
  const d = new Date();
  const out = sanitizeObject({ name: "Ra\0vi", n: 5, flag: false, d });
  assert.equal(out.name, "Ravi");
  assert.equal(out.n, 5);
  assert.equal(out.flag, false);
  assert.equal(out.d, d);
});
