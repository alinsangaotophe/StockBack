import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { getMetadataAccountDataSerializer } from "@metaplex-foundation/mpl-token-metadata";
import {
  devnetConnection,
  PROGRAM_ID,
  keypair,
  publicReport,
  DEVNET_GENESIS,
} from "./common";
async function main() {
  const connection = await devnetConnection();
  const program = await connection.getAccountInfo(PROGRAM_ID);
  assert(program?.executable, "Program is not executable");
  assert.equal(
    program.owner.toBase58(),
    "BPFLoaderUpgradeab1e11111111111111111111111",
  );
  assert.equal(program.data.readUInt32LE(0), 2);
  const dataAddress = new PublicKey(program.data.subarray(4, 36));
  const deployed = await connection.getAccountInfo(dataAddress);
  assert(deployed && deployed.owner.equals(program.owner));
  assert.equal(deployed.data.readUInt32LE(0), 3);
  const expected = fs.readFileSync("target/deploy/reward_vault.so");
  assert(
    deployed.data.subarray(45, 45 + expected.length).equals(expected),
    "Deployed bytes differ from the tested binary",
  );
  assert.equal(deployed.data[12], 1);
  assert(
    new PublicKey(deployed.data.subarray(13, 45)).equals(keypair().publicKey),
  );
  const mint = keypair("SOLANA_AAPL_MINT").publicKey,
    token = await getMint(connection, mint);
  assert.equal(token.decimals, 6);
  assert.equal(token.freezeAuthority, null);
  const metadataProgram = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  );
  const metadataAddress = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), metadataProgram.toBuffer(), mint.toBuffer()],
    metadataProgram,
  )[0];
  const metadata = await connection.getAccountInfo(metadataAddress);
  assert(metadata);
  assert(metadata.owner.equals(metadataProgram));
  const [decoded] = getMetadataAccountDataSerializer().deserialize(
    metadata.data,
  );
  assert.equal(decoded.mint, mint.toBase58());
  assert.equal(decoded.name.replace(/\0/g, ""), "Apple");
  assert.equal(decoded.symbol.replace(/\0/g, ""), "AAPL");
  const programHistory = await connection.getSignaturesForAddress(PROGRAM_ID, {
    limit: 10,
  });
  const mintHistory = await connection.getSignaturesForAddress(mint, {
    limit: 10,
  });
  publicReport("deployments/verification.devnet.json", {
    network: "devnet",
    genesisHash: DEVNET_GENESIS,
    program: PROGRAM_ID.toBase58(),
    programData: dataAddress.toBase58(),
    binarySha256: crypto.createHash("sha256").update(expected).digest("hex"),
    deployedBinaryMatches: true,
    upgradeAuthority: keypair().publicKey.toBase58(),
    mint: mint.toBase58(),
    name: "Apple",
    symbol: "AAPL",
    metadataVerified: true,
    programTransactions: programHistory
      .filter((s) => !s.err)
      .map((s) => s.signature),
    mintTransactions: mintHistory.filter((s) => !s.err).map((s) => s.signature),
    verifiedAt: new Date().toISOString(),
  });
  publicReport("deployments/program.devnet.json", {
    network: "devnet",
    program: PROGRAM_ID.toBase58(),
    programData: dataAddress.toBase58(),
    deploymentSlot: deployed.data.readBigUInt64LE(4).toString(),
    binarySha256: crypto.createHash("sha256").update(expected).digest("hex"),
    verificationPending: false,
    verifiedAt: new Date().toISOString(),
  });
  console.log(
    "Verified: deployed binary matches; Apple/AAPL metadata matches; upgrade authority matches.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
