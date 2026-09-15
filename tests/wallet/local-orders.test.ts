import test from "node:test";
import assert from "node:assert/strict";
import { rewardsRequest } from "../../lib/wallet/rewards-client";
import type { useWallet } from "../../lib/wallet/use-wallet";
test("local purchases are idempotent, wallet scoped and require no API or signature", async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
  });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("Unexpected API request");
  };
  const wallet = (address: string) =>
    ({
      address,
      signMessage: async () => {
        throw Error("Unexpected sign-in");
      },
    }) as unknown as ReturnType<typeof useWallet>;
  try {
    const a = wallet("wallet-a"),
      b = wallet("wallet-b");
    const order = await rewardsRequest(a, {
      action: "purchase",
      id: "same-id",
      productId: "coffee",
    });
    assert.equal(order.assetSymbol, "SBUX");
    assert.equal(order.status, "ready");
    assert.deepEqual(
      await rewardsRequest(a, {
        action: "purchase",
        id: "same-id",
        productId: "duo",
      }),
      order,
    );
    assert.equal(
      (await rewardsRequest(a, { action: "list" })).orders.length,
      1,
    );
    assert.equal(
      (await rewardsRequest(b, { action: "list" })).orders.length,
      0,
    );
    await assert.rejects(
      rewardsRequest(b, { action: "refund", id: "same-id" }),
      /not found/,
    );
    assert.equal(
      (await rewardsRequest(a, { action: "refund", id: "same-id" })).status,
      "refunded",
    );
  } finally {
    globalThis.fetch = previousFetch;
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
