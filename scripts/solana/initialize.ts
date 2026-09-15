import {
  client,
  configAddress,
  devnetConnection,
  keypair,
  publicReport,
  PROGRAM_ID,
  explorer,
} from "./common";
import { initialize } from "./rewards";
async function main() {
  const connection = await devnetConnection(),
    admin = keypair(),
    mint = keypair("SOLANA_AAPL_MINT").publicKey;
  const account = await connection.getAccountInfo(PROGRAM_ID);
  if (!account?.executable)
    throw new Error("Deploy the program before initializing");
  const program = client(connection, admin);
  let signature: string | undefined;
  if (!(await connection.getAccountInfo(configAddress())))
    signature = await initialize(program, admin, mint);
  const config = await program.account.config.fetch(configAddress());
  if (
    !config.admin.equals(admin.publicKey) ||
    !config.mint.equals(mint) ||
    !config.operator.equals(admin.publicKey)
  )
    throw new Error("Configuration mismatch");
  publicReport("deployments/reward-vault.devnet.json", {
    network: "devnet",
    program: PROGRAM_ID.toBase58(),
    config: configAddress().toBase58(),
    admin: admin.publicKey.toBase58(),
    operator: config.operator.toBase58(),
    mint: mint.toBase58(),
    initializeSignature: signature,
    explorer: explorer(PROGRAM_ID.toBase58()),
    updatedAt: new Date().toISOString(),
  });
  console.log("Reward vault initialized:", explorer(PROGRAM_ID.toBase58()));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Initialization failed");
  process.exitCode = 1;
});
