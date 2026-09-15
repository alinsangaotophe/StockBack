import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  client,
  keypair,
  configAddress,
  orderHash,
  rewardAddress,
  publicReport,
} from "../../scripts/solana/common";
import {
  initialize,
  initializeAsset,
  allocate,
  claim,
  pause,
} from "../../scripts/solana/rewards";
async function main() {
  const connection = new Connection(
    process.env.LOCAL_TEST_RPC || "http://127.0.0.1:8899",
    "confirmed",
  );
  const admin = keypair(),
    recipient = Keypair.generate(),
    stranger = Keypair.generate();
  for (const key of [admin, stranger]) {
    const sig = await connection.requestAirdrop(key.publicKey, 10e9);
    await connection.confirmTransaction(sig, "confirmed");
  }
  const program = client(connection, admin),
    mint = await createMint(connection, admin, admin.publicKey, null, 6);
  const source = await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    mint,
    admin.publicKey,
  );
  await mintTo(connection, admin, mint, source.address, admin, 1_000_000n);
  await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    mint,
    stranger.publicKey,
  );
  const results: string[] = [];
  async function reject(
    name: string,
    fn: () => Promise<unknown>,
    pattern: RegExp,
  ) {
    await assert.rejects(fn, (e: unknown) => pattern.test(String(e)));
    results.push(name);
    console.log("PASS", name);
  }
  await reject(
    "Unauthorized initialization",
    () => initialize(program, stranger, mint),
    /Unauthorized/,
  );
  await initialize(program, admin, mint);
  await reject(
    "Unauthorized allocation",
    () =>
      allocate(
        program,
        stranger,
        mint,
        recipient.publicKey,
        "bad-operator",
        10n,
      ),
    /Unauthorized/,
  );
  await reject(
    "Unauthorized pause",
    () => pause(program, stranger, true),
    /Unauthorized/,
  );
  await reject(
    "Zero allocation",
    () => allocate(program, admin, mint, recipient.publicKey, "zero", 0n),
    /ZeroAmount/,
  );
  await reject(
    "Insufficient inventory",
    () =>
      allocate(
        program,
        admin,
        mint,
        recipient.publicKey,
        "too-large",
        2_000_000n,
      ),
    /insufficient funds/i,
  );
  assert.equal(
    await connection.getAccountInfo(rewardAddress(orderHash("too-large"))),
    null,
  );
  results.push("Failed allocation rolls back reward account");
  const reward = rewardAddress(orderHash("phone"));
  await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    mint,
    reward,
    true,
  );
  await allocate(program, admin, mint, recipient.publicKey, "phone", 250_000n);
  const escrow = getAssociatedTokenAddressSync(mint, reward, true);
  assert.equal((await getAccount(connection, escrow)).amount, 250_000n);
  results.push("Precreated escrow remains usable; exact funding");
  await reject(
    "Duplicate order",
    () =>
      allocate(program, admin, mint, recipient.publicKey, "phone", 250_000n),
    /already in use/i,
  );
  await reject(
    "Wrong recipient",
    () => claim(program, admin, stranger, mint, "phone"),
    /WrongRecipient/,
  );
  await reject(
    "Wrong destination",
    () => claim(program, admin, recipient, mint, "phone", source.address),
    /ConstraintTokenOwner|ConstraintAssociated|200[0-9]|201[0-9]/,
  );
  await pause(program, admin, true);
  await reject(
    "Paused allocation",
    () => allocate(program, admin, mint, recipient.publicKey, "paused", 1n),
    /Paused/,
  );
  await claim(program, admin, recipient, mint, "phone");
  assert.equal(
    (
      await getAccount(
        connection,
        getAssociatedTokenAddressSync(mint, recipient.publicKey),
      )
    ).amount,
    250_000n,
  );
  assert.equal((await getAccount(connection, escrow)).amount, 0n);
  results.push("Recipient can claim while paused with sponsored ATA");
  await reject(
    "Repeated claim",
    () => claim(program, admin, recipient, mint, "phone"),
    /AlreadyClaimed/,
  );
  await pause(program, admin, false);
  await allocate(program, admin, mint, recipient.publicKey, "second", 100n);
  results.push("Allocation resumes after unpause");
  const brandMint = await createMint(
    connection,
    admin,
    admin.publicKey,
    null,
    6,
  );
  const brandSource = await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    brandMint,
    admin.publicKey,
  );
  await mintTo(
    connection,
    admin,
    brandMint,
    brandSource.address,
    admin,
    1000000n,
  );
  await reject(
    "Unauthorized asset initialization",
    () => initializeAsset(program, stranger, brandMint),
    /Unauthorized/,
  );
  await initializeAsset(program, admin, brandMint);
  const brandConfig = configAddress(brandMint);
  await reject(
    "Cross-brand mint rejected",
    () =>
      allocate(
        program,
        admin,
        mint,
        recipient.publicKey,
        "cross-brand",
        1n,
        brandConfig,
      ),
    /ConstraintHasOne/,
  );
  await allocate(
    program,
    admin,
    brandMint,
    recipient.publicKey,
    "phone",
    3000n,
    brandConfig,
  );
  await claim(
    program,
    admin,
    recipient,
    brandMint,
    "phone",
    undefined,
    brandConfig,
  );
  assert.equal(
    (
      await getAccount(
        connection,
        getAssociatedTokenAddressSync(brandMint, recipient.publicKey),
      )
    ).amount,
    3000n,
  );
  results.push("Independent brand config funds and claims correct mint");
  assert.equal(
    (await program.account.reward.fetch(rewardAddress(orderHash("phone"))))
      .claimed,
    true,
  );
  results.push("Legacy reward remains readable after multi-asset support");
  const pool = PublicKey.findProgramAddressSync(
    [Buffer.from("demo-pool"), mint.toBuffer()],
    program.programId,
  )[0];
  await reject(
    "Only admin initializes faucet",
    () =>
      client(connection, stranger)
        .methods.initializeDemoPool(new BN(100))
        .accountsPartial({ admin: stranger.publicKey, mint, pool })
        .rpc(),
    /Unauthorized|configured authority/,
  );
  await program.methods
    .initializeDemoPool(new BN(100))
    .accountsPartial({ admin: admin.publicKey, mint, pool })
    .rpc();
  const poolAta = getAssociatedTokenAddressSync(mint, pool, true);
  await mintTo(connection, admin, mint, poolAta, admin, 10000n);
  const userProgram = client(connection, stranger);
  const claimDemo = (id: string) =>
    userProgram.methods
      .claimDemo([...orderHash(id)])
      .accountsPartial({ recipient: stranger.publicKey, mint, pool })
      .rpc();
  const beforeDemo = (
    await getAccount(
      connection,
      getAssociatedTokenAddressSync(mint, stranger.publicKey),
    )
  ).amount;
  await claimDemo("demo-1");
  assert.equal(
    (
      await getAccount(
        connection,
        getAssociatedTokenAddressSync(mint, stranger.publicKey),
      )
    ).amount - beforeDemo,
    100n,
  );
  results.push(
    "Public faucet transfers fixed amount without operator signature",
  );
  await reject(
    "Duplicate demo receipt rejected",
    () => claimDemo("demo-1"),
    /already in use|custom program error/,
  );
  for (let i = 2; i <= 5; i++) await claimDemo(`demo-${i}`);
  await reject(
    "Sixth demo claim rejected",
    () => claimDemo("demo-6"),
    /DemoLimit|limit reached/,
  );
  assert.equal((await program.account.demoPool.fetch(pool)).claims, 5);
  results.push(
    "Failed duplicate and over-limit claims do not consume pool counters",
  );
  publicReport("deployments/local-verification.json", {
    network: "localnet",
    binarySha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync("target/deploy/reward_vault.so"))
      .digest("hex"),
    testedAt: new Date().toISOString(),
    program: program.programId.toBase58(),
    passed: results.length,
    checks: results,
  });
  console.log(`${results.length} checks passed`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
