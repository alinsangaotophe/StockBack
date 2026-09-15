import assert from "node:assert/strict";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  client,
  devnetConnection,
  keypair,
  orderHash,
  rewardAddress,
  publicReport,
  explorer,
} from "./common";
import { allocate, claim } from "./rewards";
async function main() {
  const connection = await devnetConnection(),
    admin = keypair(),
    recipient = keypair("SOLANA_TEST_RECIPIENT"),
    mint = keypair("SOLANA_AAPL_MINT").publicKey,
    program = client(connection, admin);
  const order = "devnet-smoke-v1",
    reward = rewardAddress(orderHash(order)),
    destination = getAssociatedTokenAddressSync(mint, recipient.publicKey);
  let allocateSignature: string | undefined, claimSignature: string | undefined;
  if (!(await connection.getAccountInfo(reward)))
    allocateSignature = await allocate(
      program,
      admin,
      mint,
      recipient.publicKey,
      order,
      250_000n,
    );
  let state = await program.account.reward.fetch(reward);
  assert(state.recipient.equals(recipient.publicKey));
  assert.equal(state.amount.toString(), "250000");
  if (!state.claimed)
    claimSignature = await claim(program, admin, recipient, mint, order);
  state = await program.account.reward.fetch(reward);
  assert.equal(state.claimed, true);
  assert((await getAccount(connection, destination)).amount >= 250_000n);
  await assert.rejects(
    () => claim(program, admin, recipient, mint, order),
    /AlreadyClaimed/,
  );
  publicReport("deployments/smoke.devnet.json", {
    network: "devnet",
    order,
    recipient: recipient.publicKey.toBase58(),
    reward: reward.toBase58(),
    amount: "0.25",
    symbol: "AAPL",
    claimed: true,
    repeatedClaimRejected: true,
    allocateSignature,
    claimSignature,
    explorer: explorer(reward.toBase58()),
    verifiedAt: new Date().toISOString(),
  });
  console.log(
    "Confirmed: 0.25 AAPL allocated and claimed; duplicate claim rejected.",
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Smoke test failed");
  process.exitCode = 1;
});
