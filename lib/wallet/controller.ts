import { signDevnetTransaction } from "./devnet-signing";
import type { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
export type WalletId = "phantom" | "okx";
export const wallets = [
  {
    id: "phantom" as const,
    name: "Phantom",
    url: "https://phantom.com/download",
  },
  {
    id: "okx" as const,
    name: "OKX Wallet",
    url: "https://web3.okx.com/download",
  },
];
export interface SolanaProvider {
  publicKey?: unknown;
  isConnected?: boolean;
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: unknown }>;
  disconnect(): Promise<void>;
  signMessage?(
    message: Uint8Array,
    encoding?: string,
  ): Promise<{ signature: Uint8Array }>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
  on(event: string, listener: (key?: unknown) => void): void;
  removeListener?(event: string, listener: (key?: unknown) => void): void;
  off?(event: string, listener: (key?: unknown) => void): void;
}
export function publicAddress(key: unknown): string | null {
  if (!key) return null;
  try {
    const value = String(key);
    return bs58.decode(value).length === 32 ? value : null;
  } catch {
    return null;
  }
}
export const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;
export function injectedProvider(id: WalletId): SolanaProvider | undefined {
  if (typeof window === "undefined") return;
  const host = window as unknown as {
    phantom?: { solana?: SolanaProvider };
    okxwallet?: { solana?: SolanaProvider };
  };
  const provider =
    id === "phantom" ? host.phantom?.solana : host.okxwallet?.solana;
  if (id === "phantom" && !provider?.isPhantom) return;
  return provider &&
    typeof provider.connect === "function" &&
    typeof provider.disconnect === "function" &&
    typeof provider.on === "function"
    ? provider
    : undefined;
}
export type WalletState = {
  id: WalletId | null;
  address: string | null;
  pending: WalletId | null;
  installed: WalletId[];
  error: string | null;
};
export const emptyWallet: WalletState = {
  id: null,
  address: null,
  pending: null,
  installed: [],
  error: null,
};
const preference = {
  get() {
    try {
      return localStorage.getItem("own-wallet-provider");
    } catch {
      return null;
    }
  },
  set(id: WalletId | null) {
    try {
      id
        ? localStorage.setItem("own-wallet-provider", id)
        : localStorage.removeItem("own-wallet-provider");
    } catch {}
  },
};
export class WalletController {
  private state: WalletState = emptyWallet;
  private subscribers = new Set<() => void>();
  private detach = () => {};
  private provider: SolanaProvider | undefined;
  private generation = 0;
  constructor(
    private resolve: (
      id: WalletId,
    ) => SolanaProvider | undefined = injectedProvider,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  };
  private set(patch: Partial<WalletState>) {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((fn) => fn());
  }
  refresh = () => {
    const installed = wallets
      .filter((w) => this.resolve(w.id))
      .map((w) => w.id);
    if (installed.join() !== this.state.installed.join())
      this.set({ installed });
    const remembered = preference.get();
    if (
      !this.state.address &&
      !this.state.pending &&
      (remembered === "phantom" || remembered === "okx")
    ) {
      const provider = this.resolve(remembered),
        address = publicAddress(provider?.publicKey);
      if (provider?.isConnected && address)
        this.attach(remembered, provider, address);
    }
  };
  private attach(id: WalletId, provider: SolanaProvider, address: string) {
    this.detach();
    this.provider = provider;
    const changed = (key?: unknown) => {
      if (this.provider !== provider) return;
      const next = publicAddress(key);
      if (!next) {
        this.cancel();
        return;
      }
      this.generation++;
      this.set({ address: next });
    };
    const disconnected = () => {
      if (this.provider === provider) this.cancel();
    };
    provider.on("accountChanged", changed);
    provider.on("disconnect", disconnected);
    this.detach = () => {
      for (const [event, fn] of [
        ["accountChanged", changed],
        ["disconnect", disconnected],
      ] as const) {
        if (provider.removeListener) provider.removeListener(event, fn);
        else provider.off?.(event, fn);
      }
      this.detach = () => {};
    };
    preference.set(id);
    this.set({ id, address, pending: null, error: null });
  }
  connect = async (id: WalletId) => {
    if (this.state.pending) return false;
    const provider = this.resolve(id);
    if (!provider) {
      this.refresh();
      this.set({
        error: `${wallets.find((w) => w.id === id)!.name} was not detected. Open Own in a browser with the wallet installed, or inside its mobile app.`,
      });
      return false;
    }
    this.cancel();
    const attempt = ++this.generation;
    this.set({ pending: id, error: null });
    try {
      const result = await provider.connect();
      if (attempt !== this.generation) return false;
      const address = publicAddress(provider.publicKey ?? result.publicKey);
      if (!address || provider.isConnected === false)
        throw new Error("invalid-address");
      this.attach(id, provider, address);
      return true;
    } catch (error) {
      if (attempt !== this.generation) return false;
      const code = (error as { code?: number })?.code;
      const message =
        code === 4001
          ? "Connection declined. You can try again when ready."
          : code === -32002
            ? "A request is already open. Check your wallet extension."
            : error instanceof Error && error.message === "invalid-address"
              ? "The wallet did not return a connected Solana account."
              : "Could not connect. Unlock your wallet and try again.";
      this.set({ pending: null, error: message });
      return false;
    }
  };
  cancel = () => {
    this.generation++;
    this.detach();
    this.provider = undefined;
    preference.set(null);
    this.set({ id: null, address: null, pending: null, error: null });
  };
  disconnect = async () => {
    const provider = this.provider;
    this.cancel();
    try {
      await provider?.disconnect();
    } catch {
      this.set({
        error:
          "Disconnected from Own. You can also revoke this site in your wallet settings.",
      });
    }
  };
  signMessage = async (message: Uint8Array) => {
    const provider = this.provider,
      address = this.state.address,
      generation = this.generation;
    if (!address || !provider?.signMessage)
      throw new Error("Connect a wallet that supports message signing.");
    const result = await provider.signMessage(message, "utf8");
    if (
      this.provider !== provider ||
      this.state.address !== address ||
      generation !== this.generation
    )
      throw new Error("Wallet changed. Please try again.");
    return result.signature;
  };
  signTransaction = async (transaction: Transaction) => {
    const provider = this.provider,
      address = this.state.address,
      generation = this.generation;
    if (!address || !provider || !this.state.id)
      throw new Error("Connect a wallet that supports transaction signing.");
    const result = await signDevnetTransaction(
      this.state.id,
      address,
      transaction,
    );
    if (
      this.provider !== provider ||
      this.state.address !== address ||
      generation !== this.generation
    )
      throw new Error("Wallet changed. Please try again.");
    return result;
  };
  dispose = () => {
    this.generation++;
    this.detach();
    this.provider = undefined;
    this.state = { ...emptyWallet };
  };
}
