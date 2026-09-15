import {
  devnetConnection,
  keypair,
  USDC_MINT,
  PROGRAM_ID,
  configAddress,
} from "./common";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  getMint,
} from "@solana/spl-token";
async function main() {
  const c = await devnetConnection();
  const owner = keypair().publicKey;
  const mint = keypair("SOLANA_AAPL_MINT").publicKey;
  const tokens = await c.getParsedTokenAccountsByOwner(owner, {
    mint: USDC_MINT,
  });
  console.log(
    JSON.stringify(
      {
        network: "devnet",
        address: owner.toBase58(),
        sol: (await c.getBalance(owner)) / 1e9,
        usdc: tokens.value.map(
          (a) => a.account.data.parsed.info.tokenAmount.uiAmountString,
        ),
        program: PROGRAM_ID.toBase58(),
        programDeployed: !!(await c.getAccountInfo(PROGRAM_ID))?.executable,
        configInitialized: !!(await c.getAccountInfo(configAddress())),
        aaplMint: mint.toBase58(),
        aaplMintCreated: !!(await c.getAccountInfo(mint)),
      },
      null,
      2,
    ),
  );
  if (await c.getAccountInfo(mint)) {
    const m = await getMint(c, mint);
    const ata = getAssociatedTokenAddressSync(mint, owner);
    console.log("AAPL supply (atomic):", m.supply.toString());
    if (await c.getAccountInfo(ata))
      console.log(
        "Treasury AAPL (atomic):",
        (await getAccount(c, ata)).amount.toString(),
      );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
