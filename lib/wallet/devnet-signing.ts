import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import type { SolanaSignTransactionFeature } from "@solana/wallet-standard-features";
import { Transaction } from "@solana/web3.js";
import type { WalletId } from "./controller";
export async function signDevnetTransaction(
  id: WalletId,
  address: string,
  transaction: Transaction,
  registered: readonly Wallet[] = getWallets().get(),
) {
  const names = id === "phantom" ? ["Phantom"] : ["OKX Wallet", "OKX"];
  const matches = registered.filter(
    (w) =>
      names.includes(w.name) && w.accounts.some((a) => a.address === address),
  );
  if (matches.length !== 1)
    throw new Error(
      "Devnet signing is unavailable. Update your wallet, enable Solana Devnet and reconnect. No transaction was sent.",
    );
  const wallet = matches[0],
    account = wallet.accounts.find((a) => a.address === address)!;
  const feature = wallet.features["solana:signTransaction"] as
    SolanaSignTransactionFeature["solana:signTransaction"] | undefined;
  if (
    !wallet.chains.includes("solana:devnet") ||
    !account.chains.includes("solana:devnet") ||
    !account.features.includes("solana:signTransaction") ||
    !feature?.supportedTransactionVersions.includes("legacy")
  )
    throw new Error(
      "This wallet account does not support Solana Devnet signing. Enable Devnet in your wallet before claiming. No transaction was sent.",
    );
  const [result] = await feature.signTransaction({
    account,
    chain: "solana:devnet",
    transaction: transaction.serialize({ requireAllSignatures: false }),
    options: { preflightCommitment: "confirmed" },
  });
  if (!result)
    throw new Error("The wallet did not return a signed Devnet transaction.");
  const signed = Transaction.from(result.signedTransaction);
  if (!signed.serializeMessage().equals(transaction.serializeMessage()))
    throw new Error(
      "The wallet changed the Devnet transaction. No transaction was sent.",
    );
  return signed;
}
