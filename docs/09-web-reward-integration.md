# Website reward integration

The web demo now uses the existing `reward_vault` deployment on Solana Devnet. This document records the initial AAPL integration. The subsequent [multi-brand upgrade](10-multi-brand-rewards.md) extends the same workflow to NKE, TSLA and SBUX while retaining existing AAPL orders.

## Purchase and claim

1. Connect Phantom or OKX Wallet. During initial connection, sign a five-minute, single-use challenge bound to the website origin and wallet address. The server verifies the Ed25519 signature and issues a one-hour bearer session, cached in sessionStorage for the current tab until expiry; disconnecting or switching accounts clears it.
2. A mock iPhone Duo purchase creates a SQLite order. The server fixes the purchase at $1,999 and the promotional reward at $100, corresponding to 500,000 base units of the six-decimal AAPL token. Browser-supplied prices cannot change the allocation. The purchase UUID is an idempotency key.
3. Settle & fund reward calls the real `allocate_reward` instruction. The operator transfers 0.5 AAPL into the order PDA's escrow. Funding must be confirmed before the order becomes ready.
4. Claim AAPL requests an unsigned transaction from the backend. The recipient signs it in their wallet. The backend checks that its message exactly matches the prepared message and verifies the recipient signature before adding the sponsor signature and broadcasting.
5. Only a confirmed, claimed reward account updates the order to claimed. Transaction signatures and the reward account link are shown in Purchase details.

Select Solana Devnet in the wallet before approving a claim. The wallet does not need SOL for this sponsored claim. The current demo does not debit wallet USDC, buy real securities, deliver merchandise or issue a card.

## Persistence and recovery

`data/own.sqlite` uses Node 24's built-in SQLite with WAL. It stores orders, sign-in challenges, sessions and the exact prepared claim message. The database is ignored by Git. Private keys stay in `.env` and are accessed only by a `server-only` module.

Card activation, freeze, top-up and display balance remain browser-local simulations. Order eligibility comes from the server, with five non-refunded purchases per wallet and a 100-order total demonstration cap. Reset preview does not reset these caps, erase SQLite orders or reverse chain transactions. Historical frontend-only orders are read-only and cannot fund new rewards.

Refresh saved orders requires wallet sign-in and reads authoritative reward accounts. An uncertain funding response can be retried with the same order: the existing reward PDA is reconciled first. Claims use the on-chain claimed flag to prevent a second transfer. A saved claim signature may represent a pending or failed attempt; order status remains ready until the chain confirms the claim. An order cannot be refunded after funding has started, even if the initial RPC response is uncertain.

Run one application instance with a persistent writable `data` directory. The order processing lock is in-process; this demo is not a multi-worker production payment service. Configure `OWN_APP_ORIGIN` to the external origin when placing it behind a reverse proxy. `undici` respects environment proxy settings for server RPC access; the connection checks the Devnet genesis hash before sending.

## Verification

- `npm run test:wallet`: eight controller checks, including rejecting signing results after an account switch.
- `npm run typecheck` and `npm run build` pass.
- `npx tsx scripts/solana/web-smoke.ts`: real HTTP API sign-in, SQLite order creation, duplicate order handling, Devnet escrow funding, recipient-signed sponsored claim and chain reconciliation. It also rejects replayed login challenges, funded refunds, unsigned claims and modified transaction messages. Running this script creates a real test order and consumes Devnet SOL/AAPL.
- Public transaction evidence is saved in `deployments/web-smoke.json`. No secrets are included.
- Browser automation exercised checkout, message-signing invocation, settlement, transaction-signing invocation and claimed portfolio display with an injected OKX-shaped test provider and intercepted API responses. This is separate from the real Devnet API smoke test: approval in an installed Phantom/OKX extension still needs a hands-on check.

Provider references: [Phantom message signing](https://docs.phantom.com/solana/signing-a-message), [Phantom transaction signing](https://docs.phantom.com/solana/sending-a-transaction), [OKX Solana provider](https://web3.okx.com/fr/onchainos/dev-docs/wallet/dapp-connect/chains/solana/provider).

Checkout reuses the connected wallet and renders its destination as read-only. Existing connections without a session, or expired sessions, still require a verification signature on the next authenticated action. This is sign-in, not another wallet connection.

### Explicit Devnet wallet signing

Claims now use the connected Phantom/OKX Wallet Standard account and `solana:signTransaction` with `chain: "solana:devnet"`. The app rejects accounts that do not advertise Devnet support, ambiguous wallet selection and modified transaction messages. It never falls back to a legacy signing call without a network identifier. The prepare response must also declare Devnet, and the server continues to verify the RPC genesis before constructing or broadcasting transactions. Installed-extension behavior must be verified by the user; unit tests cover the chain argument and fail-closed cases.

Reference: [Solana Wallet Standard signing interface](https://github.com/solana-labs/wallet-standard/blob/master/packages/core/features/src/signTransaction.ts).
