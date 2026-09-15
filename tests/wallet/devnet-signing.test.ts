import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import type { Wallet } from "@wallet-standard/base";
import { signDevnetTransaction } from "../../lib/wallet/devnet-signing";
const key = Keypair.generate(),
  address = key.publicKey.toBase58();
function transaction() {
  return new Transaction({
    feePayer: key.publicKey,
    recentBlockhash: "11111111111111111111111111111111",
  }).add(
    SystemProgram.transfer({
      fromPubkey: key.publicKey,
      toPubkey: key.publicKey,
      lamports: 0,
    }),
  );
}
function fixture(
  chains: string[],
  signTransaction: (input: any) => Promise<any>,
) {
  return {
    name: "OKX Wallet",
    chains,
    accounts: [
      {
        address,
        publicKey: key.publicKey.toBytes(),
        chains,
        features: ["solana:signTransaction"],
      },
    ],
    features: {
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy"],
        signTransaction,
      },
    },
  } as unknown as Wallet;
}
test("explicitly binds signature request to devnet", async () => {
  let chain = "";
  const wallet = fixture(["solana:mainnet", "solana:devnet"], async (input) => {
    chain = input.chain;
    return [{ signedTransaction: input.transaction }];
  });
  await signDevnetTransaction("okx", address, transaction(), [wallet]);
  assert.equal(chain, "solana:devnet");
});
test("mainnet-only account never opens a signing request", async () => {
  let called = false;
  const wallet = fixture(["solana:mainnet"], async () => {
    called = true;
    return [];
  });
  await assert.rejects(
    signDevnetTransaction("okx", address, transaction(), [wallet]),
    /does not support Solana Devnet/,
  );
  assert.equal(called, false);
});
test("does not fall back to a different wallet or unknown legacy network", async () => {
  await assert.rejects(
    signDevnetTransaction("phantom", address, transaction(), [
      fixture(["solana:devnet"], async () => []),
    ]),
    /Devnet signing is unavailable/,
  );
});
