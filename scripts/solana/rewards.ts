import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { client, configAddress, orderHash, rewardAddress } from "./common";
type Client = ReturnType<typeof client>;
export const tokenPrograms = {
  tokenProgram: TOKEN_PROGRAM_ID,
  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
};
export function initialize(
  program: Client,
  admin: Keypair,
  mint: PublicKey,
  operator = admin.publicKey,
) {
  return program.methods
    .initializeConfig(operator)
    .accountsStrict({
      admin: admin.publicKey,
      config: configAddress(),
      mint,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
}
export function allocate(
  program: Client,
  operator: Keypair,
  mint: PublicKey,
  recipient: PublicKey,
  order: string,
  amount: bigint,
  config = configAddress(),
) {
  const hash = orderHash(order),
    reward = rewardAddress(hash, config);
  return program.methods
    .allocateReward([...hash], new BN(amount.toString()))
    .accountsStrict({
      operator: operator.publicKey,
      config,
      mint,
      recipient,
      reward,
      source: getAssociatedTokenAddressSync(mint, operator.publicKey),
      escrow: getAssociatedTokenAddressSync(mint, reward, true),
      ...tokenPrograms,
    })
    .signers([operator])
    .rpc();
}
export function claim(
  program: Client,
  payer: Keypair,
  recipient: Keypair,
  mint: PublicKey,
  order: string,
  destination = getAssociatedTokenAddressSync(mint, recipient.publicKey),
  config = configAddress(),
) {
  const reward = rewardAddress(orderHash(order), config);
  return program.methods
    .claimReward()
    .accountsStrict({
      recipient: recipient.publicKey,
      payer: payer.publicKey,
      config,
      reward,
      mint,
      escrow: getAssociatedTokenAddressSync(mint, reward, true),
      destination,
      ...tokenPrograms,
    })
    .signers([payer, recipient])
    .rpc();
}
export function pause(program: Client, admin: Keypair, value: boolean) {
  return program.methods
    .setPaused(value)
    .accountsStrict({ admin: admin.publicKey, config: configAddress() })
    .signers([admin])
    .rpc();
}

export function initializeAsset(
  program: Client,
  admin: Keypair,
  mint: PublicKey,
) {
  return program.methods
    .initializeAssetConfig(admin.publicKey)
    .accountsStrict({
      admin: admin.publicKey,
      config: configAddress(mint),
      mint,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
}
