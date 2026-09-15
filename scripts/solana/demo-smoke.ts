import assert from "node:assert/strict";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import {
  client,
  devnetConnection,
  keypair,
  PROGRAM_ID,
  orderHash,
  publicReport,
} from "./common";
import { assets } from "../../lib/assets";
async function main() {
  const c = await devnetConnection(),
    admin = keypair(),
    user = keypair("SOLANA_TEST_RECIPIENT"),
    p = client(c, user);
  if ((await c.getBalance(user.publicKey)) < 20000000)
    await sendAndConfirmTransaction(
      c,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: admin.publicKey,
          toPubkey: user.publicKey,
          lamports: 30000000,
        }),
      ),
      [admin],
      { commitment: "confirmed" },
    );
  const report: Record<string, unknown> = {};
  for (const asset of Object.values(assets)) {
    const mint = new PublicKey(asset.mint),
      hash = orderHash(`static-demo-v1-${asset.symbol}`);
    const pool = PublicKey.findProgramAddressSync(
      [Buffer.from("demo-pool"), mint.toBuffer()],
      PROGRAM_ID,
    )[0];
    const receipt = PublicKey.findProgramAddressSync(
      [
        Buffer.from("demo-receipt"),
        pool.toBuffer(),
        user.publicKey.toBuffer(),
        hash,
      ],
      PROGRAM_ID,
    )[0];
    const destination = getAssociatedTokenAddressSync(mint, user.publicKey);
    const before = await getAccount(c, destination)
      .then((a) => a.amount)
      .catch(() => 0n);
    let signature: string | undefined;
    if (!(await p.account.demoReceipt.fetchNullable(receipt))) {
      signature = await p.methods
        .claimDemo([...hash])
        .accountsPartial({ recipient: user.publicKey, mint, pool })
        .rpc();
      const amount = (await p.account.demoPool.fetch(pool)).amount;
      assert.equal(
        (await getAccount(c, destination)).amount - before,
        BigInt(amount.toString()),
      );
    }
    const record = await p.account.demoReceipt.fetch(receipt);
    assert(record.recipient.equals(user.publicKey));
    assert(record.mint.equals(mint));
    report[asset.symbol] = {
      receipt: receipt.toBase58(),
      signature,
      amount: record.amount.toString(),
      verified: true,
    };
    console.log(asset.symbol, "recipient-only claim verified");
  }
  publicReport("deployments/static-demo-smoke.json", {
    network: "devnet",
    recipient: user.publicKey.toBase58(),
    claims: report,
  });
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
