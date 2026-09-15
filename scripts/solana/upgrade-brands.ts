import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { devnetConnection, keypair, PROGRAM_ID, publicReport } from "./common";
async function main() {
  const c = await devnetConnection(),
    payer = keypair(),
    binary = fs.readFileSync("target/deploy/reward_vault.so");
  const sha = crypto.createHash("sha256").update(binary).digest("hex");
  const tested = JSON.parse(
    fs.readFileSync("deployments/local-verification.json", "utf8"),
  );
  assert.equal(tested.binarySha256, sha);
  assert(tested.passed >= 18);
  const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  const program = await c.getAccountInfo(PROGRAM_ID);
  assert(program?.executable);
  const dataAddress = new PublicKey(program.data.subarray(4, 36)),
    data = await c.getAccountInfo(dataAddress);
  assert(
    data &&
      data.data[12] === 1 &&
      new PublicKey(data.data.subarray(13, 45)).equals(payer.publicKey),
  );
  if (data.data.subarray(45, 45 + binary.length).equals(binary)) {
    console.log("Upgrade already applied");
    return;
  }
  const file = ".local/deploy-buffer.json";
  if (!fs.existsSync(file))
    fs.writeFileSync(file, JSON.stringify([...Keypair.generate().secretKey]), {
      mode: 0o600,
    });
  const buffer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))),
  );
  if (!(await c.getAccountInfo(buffer.publicKey))) {
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: buffer.publicKey,
        lamports: await c.getMinimumBalanceForRentExemption(binary.length + 37),
        space: binary.length + 37,
        programId: loader,
      }),
      new TransactionInstruction({
        programId: loader,
        keys: [
          { pubkey: buffer.publicKey, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: false, isWritable: false },
        ],
        data: Buffer.alloc(4),
      }),
    );
    await sendAndConfirmTransaction(c, tx, [payer, buffer], {
      commitment: "confirmed",
    });
  }
  const upload = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/solana/upload-buffer.ts"],
    { stdio: "inherit", env: process.env },
  );
  assert.equal(upload.status, 0, "Buffer upload incomplete; safe to rerun");
  const result = spawnSync(
    "solana",
    [
      "program",
      "deploy",
      "--buffer",
      file,
      "--program-id",
      PROGRAM_ID.toBase58(),
      "--keypair",
      ".local/deployer.json",
      "--url",
      c.rpcEndpoint,
      "--commitment",
      "confirmed",
      "--use-rpc",
      "--output",
      "json",
    ],
    { encoding: "utf8", timeout: 180000 },
  );
  if (result.status !== 0)
    throw new Error(
      "Upgrade incomplete; inspect program and buffer before retrying. CLI output withheld to protect key material.",
    );
  const receipt = JSON.parse(result.stdout);
  const updated = await c.getAccountInfo(dataAddress);
  assert(updated?.data.subarray(45, 45 + binary.length).equals(binary));
  publicReport("deployments/program.devnet.json", {
    binarySha256: sha,
    upgradeSignature: receipt.signature ?? receipt.Signature,
    upgradedAt: new Date().toISOString(),
    verificationPending: false,
  });
  console.log("Multi-brand program upgrade verified:", PROGRAM_ID.toBase58());
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
