import assert from "node:assert/strict";
import { rewardsRequest, claimReward } from "../../lib/wallet/rewards-client";
import { keypair, publicReport } from "./common";
import type { useWallet } from "../../lib/wallet/use-wallet";
import { Transaction } from "@solana/web3.js";
const data = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => data.set(key, value),
  },
});
async function main() {
  const user = keypair("SOLANA_TEST_RECIPIENT");
  const wallet = {
    address: user.publicKey.toBase58(),
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(user);
      return tx;
    },
  } as unknown as ReturnType<typeof useWallet>;
  const order = await rewardsRequest(wallet, {
    action: "purchase",
    id: "static-client-smoke-v1",
    productId: "coffee",
  });
  const claimed = await claimReward(wallet, order.id);
  assert.equal(claimed.status, "claimed");
  assert.equal(claimed.tokenAmount, "3000");
  publicReport("deployments/static-client-smoke.json", {
    network: "devnet",
    status: claimed.status,
    receipt: claimed.rewardAddress,
    signature: claimed.claimSignature,
    verified: true,
  });
  console.log("Static frontend purchase and direct claim verified on Devnet");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
