"use client";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "../../idl/reward_vault.json";
import type { RewardVault } from "../../idl/reward_vault";
import { products, type Order } from "../demo";
import { productAsset } from "../assets";
import type { useWallet } from "./use-wallet";
const programId = new PublicKey(idl.address);
const genesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const key = (address: string) => `own-orders-v2:${address}`;
function read(address: string): Order[] {
  return JSON.parse(localStorage.getItem(key(address)) || "[]");
}
function save(order: Order) {
  const orders = read(order.destination);
  localStorage.setItem(
    key(order.destination),
    JSON.stringify([order, ...orders.filter((o) => o.id !== order.id)]),
  );
  return order;
}
async function chain() {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    "confirmed",
  );
  if ((await connection.getGenesisHash()) !== genesis)
    throw new Error("Only Solana Devnet is supported.");
  return {
    connection,
    program: new Program<RewardVault>(idl as RewardVault, { connection }),
  };
}
async function addresses(order: Order) {
  const mint = new PublicKey(productAsset(order.productId).mint);
  const recipient = new PublicKey(order.destination);
  const hash = Buffer.from(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`own:demo:${order.id}`),
    ),
  );
  const pda = (...seeds: Buffer[]) =>
    PublicKey.findProgramAddressSync(seeds, programId)[0];
  const pool = pda(Buffer.from("demo-pool"), mint.toBuffer());
  return {
    mint,
    recipient,
    pool,
    hash,
    usage: pda(
      Buffer.from("demo-usage"),
      pool.toBuffer(),
      recipient.toBuffer(),
    ),
    receipt: pda(
      Buffer.from("demo-receipt"),
      pool.toBuffer(),
      recipient.toBuffer(),
      hash,
    ),
    source: getAssociatedTokenAddressSync(mint, pool, true),
    destination: getAssociatedTokenAddressSync(mint, recipient),
  };
}
async function refresh(order: Order) {
  if (order.status === "refunded") return order;
  const { program } = await chain();
  const a = await addresses(order);
  const receipt = await program.account.demoReceipt.fetchNullable(a.receipt);
  if (
    receipt &&
    receipt.recipient.equals(a.recipient) &&
    receipt.mint.equals(a.mint)
  )
    return save({
      ...order,
      status: "claimed",
      rewardAddress: a.receipt.toBase58(),
      tokenAmount: receipt.amount.toString(),
    });
  return order;
}
export function rewardsRequest(
  wallet: ReturnType<typeof useWallet>,
  body: { action: "list" },
): Promise<{ orders: Order[] }>;
export function rewardsRequest(
  wallet: ReturnType<typeof useWallet>,
  body: {
    action: "purchase" | "refresh" | "refund";
    id?: string;
    productId?: string;
  },
): Promise<Order>;
export async function rewardsRequest(
  wallet: ReturnType<typeof useWallet>,
  body: { action: string; id?: string; productId?: string },
) {
  const address = wallet.address;
  if (!address) throw new Error("Connect your wallet to continue.");
  const orders = read(address);
  if (body.action === "list") return { orders };
  let order = orders.find((o) => o.id === body.id);
  if (body.action === "purchase") {
    if (order) return order;
    const product = products.find((p) => p.id === body.productId);
    if (!product || !body.id) throw new Error("Invalid product.");
    const asset = productAsset(product.id);
    return save({
      id: body.id,
      productId: product.id,
      amount: product.price,
      reward: product.reward,
      date: new Date().toISOString(),
      destination: address,
      status: "ready",
      onchain: true,
      assetSymbol: asset.symbol,
      mint: asset.mint,
      tokenAmount: String(Math.round((product.reward / asset.price) * 1e6)),
    });
  }
  if (!order) throw new Error("Order not found in this browser.");
  if (body.action === "refresh") return refresh(order);
  if (body.action === "refund") {
    if (order.fundingStarted || order.status === "claimed")
      throw new Error("A submitted reward cannot be refunded.");
    return save({ ...order, status: "refunded" });
  }
  throw new Error("Unsupported local action.");
}
export async function claimReward(
  wallet: ReturnType<typeof useWallet>,
  id: string,
) {
  const address = wallet.address;
  if (!address) throw new Error("Connect your wallet to continue.");
  let order = read(address).find((o) => o.id === id);
  if (!order || order.status === "refunded")
    throw new Error("Order is not available.");
  order = await refresh(order);
  if (order.status === "claimed") return order;
  const { connection, program } = await chain();
  const a = await addresses(order);
  const pool = await program.account.demoPool.fetchNullable(a.pool);
  if (!pool)
    throw new Error("The Devnet demo reward pool is not available yet.");
  const usage = await program.account.demoUsage.fetchNullable(a.usage);
  if ((usage?.claims || 0) >= 5 || pool.claims >= 1000)
    throw new Error("Demo claim limit reached for this company.");
  const tx = new Transaction().add(
    await program.methods
      .claimDemo([...a.hash])
      .accountsPartial(a)
      .instruction(),
  );
  const latest = await connection.getLatestBlockhash();
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = a.recipient;
  const message = tx.serializeMessage();
  const signed = await wallet.signTransaction(tx);
  if (!message.equals(signed.serializeMessage()))
    throw new Error("The wallet changed this transaction.");
  if (wallet.address !== address)
    throw new Error("Wallet changed. Please retry.");
  const signature = bs58.encode(signed.signature!);
  order = save({
    ...order,
    fundingStarted: true,
    claimSignature: signature,
    rewardAddress: a.receipt.toBase58(),
  });
  await connection.sendRawTransaction(signed.serialize(), {
    preflightCommitment: "confirmed",
  });
  for (let i = 0; i < 45; i++) {
    const status = (await connection.getSignatureStatuses([signature]))
      .value[0];
    if (status?.err) throw new Error("Devnet claim failed. Refresh and retry.");
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    )
      return refresh(order);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(
    "Confirmation is pending. Refresh your assets before retrying.",
  );
}
