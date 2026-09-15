import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { Keypair } from "@solana/web3.js";
import { devnetConnection, PROGRAM_ID, publicReport } from "./common";
import "./prepare-keys";
async function main() {
  const connection = await devnetConnection();
  if (await connection.getAccountInfo(PROGRAM_ID))
    throw new Error(
      "Program already exists. Review upgrades explicitly instead of rerunning initial deployment.",
    );
  const verification = JSON.parse(
    fs.readFileSync("deployments/local-verification.json", "utf8"),
  );
  const binary = fs.readFileSync("target/deploy/reward_vault.so");
  const sha256 = crypto.createHash("sha256").update(binary).digest("hex");
  if (verification.binarySha256 !== sha256 || verification.passed < 14)
    throw new Error(
      "Run the local contract tests against this binary before deploying.",
    );
  // A persistent explicit buffer avoids the CLI generating and printing a recovery mnemonic.
  const buffer = ".local/deploy-buffer.json";
  if (!fs.existsSync(buffer))
    fs.writeFileSync(
      buffer,
      JSON.stringify([...Keypair.generate().secretKey]),
      { mode: 0o600 },
    );
  fs.chmodSync(buffer, 0o600);
  const bufferPublicKey = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(buffer, "utf8"))),
  ).publicKey;
  const bufferAccount = await connection.getAccountInfo(bufferPublicKey);
  const fullyUploaded =
    bufferAccount?.data.subarray(37).equals(binary) ?? false;
  console.log("Deploying verified reward vault to Devnet…");
  const result = spawnSync(
    "solana",
    [
      "program",
      "deploy",
      ...(fullyUploaded ? [] : ["target/deploy/reward_vault.so"]),
      "--url",
      connection.rpcEndpoint,
      "--keypair",
      ".local/deployer.json",
      "--program-id",
      "target/deploy/reward_vault-keypair.json",
      "--buffer",
      buffer,
      "--max-len",
      String(binary.length),
      "--commitment",
      "confirmed",
      "--use-rpc",
      "--max-sign-attempts",
      "10",
      "--output",
      "json",
    ],
    { encoding: "utf8", timeout: 600_000 },
  );
  // Raw CLI errors are withheld because signer recovery output can contain secret material.
  if (result.status !== 0)
    throw new Error(
      "Deployment did not complete. Check program/buffer state before resuming; the persistent buffer key is retained locally.",
    );
  const output = JSON.parse(result.stdout);
  publicReport("deployments/program.devnet.json", {
    network: "devnet",
    program: PROGRAM_ID.toBase58(),
    binarySha256: sha256,
    signature: output.signature ?? output.Signature,
    deployedAt: new Date().toISOString(),
    verificationPending: true,
  });
  if (!(await connection.getAccountInfo(PROGRAM_ID))?.executable)
    throw new Error(
      "Executable account verification failed; deployment receipt retained",
    );
  publicReport("deployments/program.devnet.json", {
    verificationPending: false,
  });
  console.log("Program deployed:", PROGRAM_ID.toBase58());
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Deployment failed");
  process.exitCode = 1;
});
