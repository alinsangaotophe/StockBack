import fs from "node:fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { spawnSync } from "node:child_process";
import "./common";
for (const [symbol, name] of [
  ["NKE", "Nike"],
  ["TSLA", "Tesla"],
  ["SBUX", "Starbucks"],
]) {
  const prefix = `SOLANA_${symbol}_MINT`;
  if (!process.env[`${prefix}_PRIVATE_KEY`]) {
    if (process.env[`${prefix}_PUBLIC_KEY`])
      throw new Error("Existing mint public key has no private key");
    const key = Keypair.generate();
    fs.appendFileSync(
      ".env",
      `\n${prefix}_PUBLIC_KEY=${key.publicKey.toBase58()}\n${prefix}_PRIVATE_KEY=${bs58.encode(key.secretKey)}\n`,
      { mode: 0o600 },
    );
    fs.chmodSync(".env", 0o600);
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/solana/setup-token.ts"],
    {
      env: {
        ...process.env,
        NODE_USE_ENV_PROXY: "1",
        TOKEN_SYMBOL: symbol,
        TOKEN_NAME: name,
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) throw new Error(`${symbol} setup failed`);
}
