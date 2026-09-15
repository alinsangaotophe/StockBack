import fs from "node:fs";
import { keypair, PROGRAM_ID } from "./common";
fs.mkdirSync(".local", { recursive: true, mode: 0o700 });
fs.mkdirSync("target/deploy", { recursive: true });
for (const [name, file] of [
  ["SOLANA_DEPLOYER", ".local/deployer.json"],
  ["SOLANA_REWARD_PROGRAM", "target/deploy/reward_vault-keypair.json"],
]) {
  const key = keypair(name);
  if (name === "SOLANA_REWARD_PROGRAM" && !key.publicKey.equals(PROGRAM_ID))
    throw new Error("Program key does not match source");
  fs.writeFileSync(file, JSON.stringify(Array.from(key.secretKey)), {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
  console.log(
    `${name}: ${key.publicKey.toBase58()} (CLI key file prepared, Git ignored)`,
  );
}
