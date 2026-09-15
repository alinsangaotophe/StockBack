import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  createMetadataAccountV3,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { devnetConnection, keypair, publicReport, explorer } from "./common";
async function main() {
  const symbol = process.env.TOKEN_SYMBOL || "AAPL",
    name = process.env.TOKEN_NAME || "Apple";
  if (!["AAPL", "NKE", "TSLA", "SBUX"].includes(symbol))
    throw new Error("Unsupported demo symbol");
  const connection = await devnetConnection(),
    payer = keypair(),
    mintKey = keypair(`SOLANA_${symbol}_MINT`);
  if ((await connection.getBalance(payer.publicKey)) < 20_000_000)
    throw new Error("Fund the deployment wallet with Devnet SOL first");
  const mint = mintKey.publicKey;
  if (!(await connection.getAccountInfo(mint)))
    await createMint(connection, payer, payer.publicKey, null, 6, mintKey);
  const info = await getMint(connection, mint);
  if (
    info.decimals !== 6 ||
    !info.mintAuthority?.equals(payer.publicKey) ||
    info.freezeAuthority
  )
    throw new Error("Unexpected mint configuration");
  const inventory = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
  );
  // Create the initial inventory once. Reruns never replenish a previously minted supply.
  if (info.supply === 0n)
    await mintTo(
      connection,
      payer,
      mint,
      inventory.address,
      payer,
      10_000_000_000n,
    );
  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
  const signer = createSignerFromKeypair(
    umi,
    umi.eddsa.createKeypairFromSecretKey(payer.secretKey),
  );
  umi.use(signerIdentity(signer));
  const metadataProgram = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  );
  const metadata = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), metadataProgram.toBuffer(), mint.toBuffer()],
    metadataProgram,
  )[0];
  if (!(await connection.getAccountInfo(metadata))) {
    const instructions = createMetadataAccountV3(umi, {
      mint: publicKey(mint.toBase58()),
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer,
      data: {
        name,
        symbol,
        uri: "",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).getInstructions();
    const tx = new Transaction().add(
      ...instructions.map(
        (ix) =>
          new TransactionInstruction({
            programId: new PublicKey(ix.programId),
            keys: ix.keys.map((k) => ({
              ...k,
              pubkey: new PublicKey(k.pubkey),
            })),
            data: Buffer.from(ix.data),
          }),
      ),
    );
    await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: "confirmed",
    });
  }
  publicReport(`deployments/${symbol.toLowerCase()}.devnet.json`, {
    network: "devnet",
    name,
    symbol,
    decimals: 6,
    mint: mint.toBase58(),
    metadata: metadata.toBase58(),
    inventory: inventory.address.toBase58(),
    supplyBaseUnits: (await getMint(connection, mint)).supply.toString(),
    mintAuthority: payer.publicKey.toBase58(),
    explorer: explorer(mint.toBase58()),
    disclosure: `Test token only. No ${name} shares, backing, redemption rights, or market value.`,
    updatedAt: new Date().toISOString(),
  });
  console.log(`${symbol} ready:`, explorer(mint.toBase58()));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Token setup failed");
  process.exitCode = 1;
});
