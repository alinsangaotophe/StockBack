import fs from "node:fs";
import { spawn } from "node:child_process";
import { Connection } from "@solana/web3.js";
import { PROGRAM_ID } from "./common";
async function main() {
  fs.mkdirSync(".local", { recursive: true });
  const ledger = fs.mkdtempSync(".local/test-");
  const rpc = "http://127.0.0.1:18999";
  const validator = spawn(
    "solana-test-validator",
    [
      "--ledger",
      ledger,
      "--rpc-port",
      "18999",
      "--faucet-port",
      "19900",
      "--gossip-port",
      "18901",
      "--bpf-program",
      PROGRAM_ID.toBase58(),
      "target/deploy/reward_vault.so",
      "--quiet",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  validator.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  let spawnError: Error | undefined;
  validator.on("error", (error) => {
    spawnError = error;
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (spawnError) throw spawnError;
      if (validator.exitCode !== null)
        throw new Error(`Validator failed: ${stderr}`);
      try {
        await new Connection(rpc).getLatestBlockhash();
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!ready) throw new Error("Local validator did not become ready");
    const test = spawn(
      process.execPath,
      ["--import", "tsx", "tests/solana/reward-vault.ts"],
      { stdio: "inherit", env: { ...process.env, LOCAL_TEST_RPC: rpc } },
    );
    const code = await new Promise<number | null>((resolve, reject) => {
      test.on("exit", resolve);
      test.on("error", reject);
    });
    if (code !== 0) throw new Error(`Contract tests failed (${code})`);
  } finally {
    validator.kill("SIGTERM");
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
