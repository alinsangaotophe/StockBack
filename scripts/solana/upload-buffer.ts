import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { devnetConnection, keypair } from "./common";
async function main() {
  const c = await devnetConnection(),
    payer = keypair();
  const buffer = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync(".local/deploy-buffer.json", "utf8")),
    ),
  ).publicKey;
  const binary = fs.readFileSync("target/deploy/reward_vault.so");
  const verification = JSON.parse(
    fs.readFileSync("deployments/local-verification.json", "utf8"),
  );
  assert.equal(
    verification.binarySha256,
    crypto.createHash("sha256").update(binary).digest("hex"),
  );
  const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  const account = await c.getAccountInfo(buffer);
  assert(account);
  assert(account.owner.equals(loader));
  assert.equal(account.data.readUInt32LE(0), 1);
  assert.equal(account.data[4], 1);
  assert(new PublicKey(account.data.subarray(5, 37)).equals(payer.publicKey));
  assert.equal(account.data.length, 37 + binary.length);
  const offsets: number[] = [];
  for (let offset = 0; offset < binary.length; offset += 900) {
    if (
      !account.data
        .subarray(37 + offset, 37 + Math.min(offset + 900, binary.length))
        .equals(binary.subarray(offset, offset + 900))
    )
      offsets.push(offset);
  }
  console.log(`Resuming ${offsets.length} missing buffer chunks sequentially`);
  for (let start = 0; start < offsets.length; start += 8) {
    const latest = await c.getLatestBlockhashAndContext("confirmed");
    const signatures: string[] = [];
    for (const offset of offsets.slice(start, start + 8)) {
      const chunk = binary.subarray(offset, offset + 900),
        header = Buffer.alloc(16);
      // Solana loader-v3 bincode Write { offset: u32, bytes: Vec<u8> }.
      header.writeUInt32LE(1, 0);
      header.writeUInt32LE(offset, 4);
      header.writeBigUInt64LE(BigInt(chunk.length), 8);
      const tx = new Transaction({
        feePayer: payer.publicKey,
        ...latest.value,
      }).add(
        new TransactionInstruction({
          programId: loader,
          keys: [
            { pubkey: buffer, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
          ],
          data: Buffer.concat([header, chunk]),
        }),
      );
      tx.sign(payer);
      signatures.push(
        await c.sendRawTransaction(tx.serialize(), {
          preflightCommitment: "confirmed",
          minContextSlot: latest.context.slot,
        }),
      );
    }
    const deadline = Date.now() + 90_000;
    while (true) {
      const statuses = (await c.getSignatureStatuses(signatures)).value;
      for (const status of statuses)
        if (status?.err) throw new Error(JSON.stringify(status.err));
      if (
        statuses.every(
          (s) =>
            s?.confirmationStatus === "confirmed" ||
            s?.confirmationStatus === "finalized",
        )
      )
        break;
      if (Date.now() > deadline)
        throw new Error(
          "Batch confirmation timed out; rerun to reconcile buffer bytes",
        );
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    console.log(
      `Confirmed ${Math.min(start + 8, offsets.length)}/${offsets.length} chunks`,
    );
  }
  const uploaded = await c.getAccountInfo(buffer);
  assert(uploaded?.data.subarray(37).equals(binary));
  console.log("Buffer exactly matches the locally tested program.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
