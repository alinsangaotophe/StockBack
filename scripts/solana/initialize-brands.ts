import { PublicKey } from "@solana/web3.js";
import assert from "node:assert/strict";
import { getMint } from "@solana/spl-token";
import { getMetadataAccountDataSerializer } from "@metaplex-foundation/mpl-token-metadata";
import { assets } from "../../lib/assets";
import {
  client,
  configAddress,
  devnetConnection,
  keypair,
  publicReport,
} from "./common";
import { initializeAsset } from "./rewards";
async function main() {
  const c = await devnetConnection(),
    admin = keypair(),
    program = client(c, admin);
  for (const asset of Object.values(assets)) {
    const mint = new PublicKey(asset.mint),
      config = asset.symbol === "AAPL" ? configAddress() : configAddress(mint);
    const info = await getMint(c, mint);
    assert.equal(info.decimals, 6);
    assert.equal(info.freezeAuthority, null);
    const metadataProgram = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    );
    const metadataAddress = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), metadataProgram.toBuffer(), mint.toBuffer()],
      metadataProgram,
    )[0];
    const metadata = await c.getAccountInfo(metadataAddress);
    assert(metadata && metadata.owner.equals(metadataProgram));
    const [decoded] = getMetadataAccountDataSerializer().deserialize(
      metadata.data,
    );
    assert.equal(decoded.name.replace(/\0/g, ""), asset.company);
    assert.equal(decoded.symbol.replace(/\0/g, ""), asset.symbol);
    let signature;
    if (!(await c.getAccountInfo(config)))
      signature = await initializeAsset(program, admin, mint);
    const state = await program.account.config.fetch(config);
    if (!state.mint.equals(mint) || !state.operator.equals(admin.publicKey))
      throw new Error("Brand configuration mismatch");
    publicReport(`deployments/${asset.symbol.toLowerCase()}.devnet.json`, {
      config: config.toBase58(),
      initializeSignature: signature,
      metadataVerified: true,
    });
    console.log(asset.symbol, "config verified:", config.toBase58());
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
