import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMovement, demoQuote, freshAccount } from "../../lib/stockback";
const signedIn = () => ({ ...freshAccount(), signedIn: true, card: "4242" });
test("swap conserves value less the displayed fee and records exactly one movement", () => {
  const before = signedIn();
  const after = applyMovement(before, 0, 0.1, "Swap", "");
  assert.equal(after.balances[0], 1.1);
  assert.equal(after.usdc, 22.931);
  assert.equal(after.movements.length, 1);
  assert.equal(after.movements[0].received, 22.931);
  assert.equal(before.balances[0], 1.2);
  assert.equal(before.movements.length, 0);
});
test("withdraw full balance without creating USDC; unlinking a card does not lock existing assets", () => {
  const after = applyMovement(
    { ...signedIn(), card: "" },
    0,
    1.2,
    "Withdraw",
    "demo-destination",
  );
  assert.equal(after.balances[0], 0);
  assert.equal(after.usdc, 0);
  assert.equal(after.movements[0].address, "demo-destination");
});
test("rejects unsigned session, invalid precision, zero, nonfinite and overdraw amounts", () => {
  assert.throws(() => applyMovement(freshAccount(), 0, 0.1, "Swap", ""));
  for (const amount of [0, -1, NaN, Infinity, 1.200001, 0.0000001]) {
    assert.throws(() => applyMovement(signedIn(), 0, amount, "Swap", ""));
  }
  assert.throws(() => applyMovement(signedIn(), 9, 0.1, "Swap", ""));
});
test("quote uses token base units and is stable for small amounts", () => {
  assert.equal(demoQuote(0, 0.1), 22.931);
  assert.equal(demoQuote(0, 0.000001), 0.000229);
  assert.equal(demoQuote(0, NaN), 0);
});
