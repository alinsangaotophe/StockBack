import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  client,
  devnetConnection,
  keypair,
  publicReport,
  PROGRAM_ID,
} from "./common";
import { assets } from "../../lib/assets";
async function main() {
  const c = await devnetConnection(),
    admin = keypair(),
    p = client(c, admin);
  const amounts = { AAPL: 500000, NKE: 75000, TSLA: 75000, SBUX: 3000 };
  const report: Record<string, unknown> = {};
  for (const asset of Object.values(assets)) {
    const mint = new PublicKey(asset.mint),
      amount = amounts[asset.symbol];
    const pool = PublicKey.findProgramAddressSync(
      [Buffer.from("demo-pool"), mint.toBuffer()],
      PROGRAM_ID,
    )[0];
    if (!(await p.account.demoPool.fetchNullable(pool)))
      await p.methods
        .initializeDemoPool(new BN(amount))
        .accountsPartial({ admin: admin.publicKey, mint, pool })
        .rpc();
    const source = getAssociatedTokenAddressSync(mint, admin.publicKey),
      destination = getAssociatedTokenAddressSync(mint, pool, true);
    const state = await p.account.demoPool.fetch(pool);
    if (state.amount.toNumber() !== amount)
      throw new Error("Demo amount mismatch");
    const target = BigInt(1000 - state.claims) * BigInt(amount),
      balance = (await getAccount(c, destination)).amount;
    if (balance < target)
      await sendAndConfirmTransaction(
        c,
        new Transaction().add(
          createTransferCheckedInstruction(
            source,
            mint,
            destination,
            admin.publicKey,
            target - balance,
            6,
          ),
        ),
        [admin],
        { commitment: "confirmed" },
      );
    report[asset.symbol] = {
      pool: pool.toBase58(),
      amount,
      remaining: (await getAccount(c, destination)).amount.toString(),
    };
    console.log(asset.symbol, "demo pool ready", pool.toBase58());
  }
  publicReport("deployments/demo-pools.devnet.json", {
    network: "devnet",
    pools: report,
  });
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
