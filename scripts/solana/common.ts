import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "dotenv";
import bs58 from "bs58";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import type { RewardVault } from "../../idl/reward_vault";
config({ quiet: true });
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
export const PROGRAM_ID = new PublicKey(
  "8Jtn1EsbdEoPizw7rnSr6wAfefy8rJ2hkiJjftYXRfp5",
);
export function keypair(name = "SOLANA_DEPLOYER"): Keypair {
  const secret = process.env[`${name}_PRIVATE_KEY`];
  if (!secret) throw new Error(`Missing ${name}_PRIVATE_KEY in .env`);
  const key = Keypair.fromSecretKey(bs58.decode(secret));
  if (key.publicKey.toBase58() !== process.env[`${name}_PUBLIC_KEY`])
    throw new Error(`${name} public-key mismatch`);
  return key;
}
export async function devnetConnection() {
  if (process.env.SOLANA_CLUSTER !== "devnet")
    throw new Error("This command requires SOLANA_CLUSTER=devnet");
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed",
  );
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS)
    throw new Error("Refusing to send: RPC is not Solana Devnet");
  // Poll HTTP confirmations so CLI scripts also work behind an HTTPS proxy.
  connection.confirmTransaction = (async (
    strategy: string | { signature: string },
    commitment?: string,
  ) => {
    const signature =
      typeof strategy === "string" ? strategy : strategy.signature;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const response = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
      const status = response.value[0];
      if (
        status &&
        (status.err ||
          status.confirmationStatus === "finalized" ||
          (commitment !== "finalized" &&
            status.confirmationStatus === "confirmed"))
      )
        return { context: response.context, value: { err: status.err } };
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    throw new Error(
      `Confirmation timed out; inspect transaction ${signature} before retrying`,
    );
  }) as Connection["confirmTransaction"];
  return connection;
}
export function client(connection: Connection, payer: Keypair) {
  const idl = JSON.parse(
    fs.readFileSync("idl/reward_vault.json", "utf8"),
  ) as RewardVault;
  if (idl.address !== PROGRAM_ID.toBase58())
    throw new Error("IDL program address mismatch");
  return new Program<RewardVault>(
    idl,
    new AnchorProvider(connection, new Wallet(payer), {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    }),
  );
}
export function configAddress(mint?: PublicKey) {
  return PublicKey.findProgramAddressSync(
    mint ? [Buffer.from("config"), mint.toBuffer()] : [Buffer.from("config")],
    PROGRAM_ID,
  )[0];
}
export function orderHash(order: string) {
  return crypto.createHash("sha256").update(`own:v1:${order}`).digest();
}
export function rewardAddress(hash: Buffer, config = configAddress()) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reward"), config.toBuffer(), hash],
    PROGRAM_ID,
  )[0];
}
export function publicReport(file: string, value: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const previous = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const defined = Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  );
  fs.writeFileSync(
    file,
    JSON.stringify({ ...previous, ...defined }, null, 2) + "\n",
  );
}
export function explorer(address: string, type = "address") {
  return `https://explorer.solana.com/${type}/${address}?cluster=devnet`;
}
