"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ArrowRight,
  ExternalLink,
  Copy,
  LoaderCircle,
} from "lucide-react";
import { wallets, shortAddress } from "@/lib/wallet/controller";
import { useWallet } from "@/lib/wallet/use-wallet";
export function WalletPanel({
  wallet,
  done,
}: {
  wallet: ReturnType<typeof useWallet>;
  done: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [wallet.address]);
  return (
    <>
      <p className="dialog-description">
        Connect your Solana wallet. Your rewards, your destination.
      </p>
      {wallet.address && (
        <div className="connected-wallet">
          <span className="pill">Connected · Solana</span>
          <h3>{wallets.find((w) => w.id === wallet.id)?.name}</h3>
          <code>{wallet.address}</code>
          <div className="wallet-actions">
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(wallet.address!);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              <Copy size={14} />
              {copied ? "Copied" : "Copy address"}
            </button>
            <a
              href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              View on Devnet <ExternalLink size={13} />
            </a>
          </div>
          {copyError && (
            <p role="alert">
              Copy unavailable. Select the address above to copy it.
            </p>
          )}
        </div>
      )}
      <div className="wallet-options">
        {wallets.map((w) => (
          <div key={w.id} className="wallet-option">
            <button
              className="wallet-choice"
              disabled={!!wallet.pending || wallet.id === w.id}
              onClick={async () => {
                if (await wallet.connect(w.id)) done();
              }}
            >
              <span className={`wallet-symbol ${w.id}`}>
                {w.id === "phantom" ? (
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path
                      d="M6 25V15a10 10 0 0120 0v10l-4-3-4 3-4-3-4 3-4-3"
                      fill="currentColor"
                    />
                    <circle cx="13" cy="14" r="1.5" fill="#8c70ce" />
                    <circle cx="20" cy="14" r="1.5" fill="#8c70ce" />
                  </svg>
                ) : (
                  <span className="okx-checker" />
                )}
              </span>
              <span>
                <strong>{w.name}</strong>
                <small>
                  {wallet.pending === w.id
                    ? "Approve the connection in your wallet"
                    : wallet.id === w.id
                      ? shortAddress(wallet.address!)
                      : wallet.installed.includes(w.id)
                        ? "Detected · Solana"
                        : "Not detected in this browser"}
                </small>
              </span>
              {wallet.pending === w.id ? (
                <LoaderCircle className="wallet-spinner" size={20} />
              ) : wallet.id === w.id ? (
                <Check size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
            {!wallet.installed.includes(w.id) && (
              <a
                className="wallet-install"
                href={w.url}
                target="_blank"
                rel="noreferrer"
              >
                Get {w.name} <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
      {wallet.error && (
        <p className="wallet-error" role="alert">
          {wallet.error}
        </p>
      )}
      {wallet.pending && (
        <button className="text-button centered" onClick={wallet.cancel}>
          Cancel connection request
        </button>
      )}
      {wallet.address && (
        <button
          className="text-button centered"
          onClick={() => {
            void wallet.disconnect();
          }}
        >
          Disconnect wallet
        </button>
      )}
      <p className="tiny-note">
        Use a wallet-enabled browser or the browser inside your wallet app.
        Connection shares your public address. Sign in to save orders, then sign
        a transaction to claim Devnet AAPL. Set your wallet network to Solana
        Devnet before claiming. Purchases use demo card funds.
      </p>
    </>
  );
}
