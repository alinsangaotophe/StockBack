# Multi-brand Devnet rewards

Purchases now earn the token of the company behind the selected product. The server snapshots the symbol, mint and token amount into the SQLite order. Checkout consent, reward messages, purchase details and holdings use the corresponding asset. Holdings aggregate separately by company.

| Product | Token | Mock reward | Fixed demo unit price | Token reward |
| --- | --- | ---: | ---: | ---: |
| iPhone Duo | AAPL | $100 | $200 | 0.5 |
| Pegasus 42 | NKE | $7.50 | $100 | 0.075 |
| Wall Connector | TSLA | $22.50 | $300 | 0.075 |
| Daily coffee | SBUX | $0.30 | $100 | 0.003 |

These rates are illustrative conversion fixtures, not market prices. All four assets are SPL test tokens with six decimals and no stock backing, redemption rights or monetary value. New mints have a 10,000-token initial supply, operator mint authority, no freeze authority, and verified on-chain company-name/symbol metadata.

| Asset | Devnet mint |
| --- | --- |
| AAPL | `Ep5T5o9LEpx9A4Nz6YYNAQeaeVBW718XycbVfEPYBKdb` |
| NKE | `9FZ2m8daWKbWXA7mH5f2RLmz2aPxq7nPEQ4nZqjYAZ1b` |
| TSLA | `8AacDWxAy1ckoX8fMJi5w2gB3A4KC6bxSf8EmrLHTq5G` |
| SBUX | `3PKCekCs4o11p89oWinrzP2LeV4xuemKPyKfGyJ41rjX` |

## Contract compatibility

The existing program `8Jtn1EsbdEoPizw7rnSr6wAfefy8rJ2hkiJjftYXRfp5` was upgraded. The legacy AAPL configuration remains at seeds `["config"]`; new company configurations use `["config", mint]`. Configuration account layout is unchanged. Version 1 resolves to the legacy PDA, version 2 to the per-mint PDA. Initialization remains restricted to the pinned administrator.

Allocation, claiming and administration validate the canonical configuration address. Mint, operator and recipient constraints still apply. Rewards remain keyed by configuration and order hash, so each escrow and entitlement belongs to one asset. Existing AAPL rewards remain valid and are not migrated or overwritten.

## Verification and operations

- `npm run solana:test`: 18 local transaction checks, including unauthorized brand initialization, wrong-mint rejection, independent brand funding/claiming and legacy reward compatibility.
- `npm run solana:verify`: deployed program bytes match the tested binary; retained upgrade authority and AAPL metadata verified.
- `NODE_USE_ENV_PROXY=1 npx tsx scripts/solana/initialize-brands.ts`: verifies every mint's decimals, freeze authority, company metadata and configured operator/mint.
- `npx tsx scripts/solana/web-brands-smoke.ts`: real website API purchase, escrow funding, recipient-signed sponsored claim and exact recipient ATA balance delta for SBUX, NKE and TSLA. It also checks an existing claimed AAPL order. Public receipts are saved in `deployments/{sbux,nke,tsla}.web-smoke.json`.
- TypeScript, production build and eight wallet controller checks pass.
- Browser checks verify Starbucks consent names SBUX and display distinct company holdings. Extension signing remains subject to a hands-on wallet check; the chain smoke uses the local test recipient signer.

`setup-brands.ts` creates missing mint keypairs in the ignored `.env` with mode 0600, then creates each mint and metadata. It is resumable and does not replenish a nonzero supply. `upgrade-brands.ts` checks the local test hash and upgrade authority, uploads through a persistent ignored buffer, and verifies deployed bytes. A post-upgrade RPC read failed during the run; a separate `verify.ts` run confirmed that the upgrade had succeeded. The deployment verification manifest records the matching binary hash.

Card top-ups and purchase payments remain mock operations. This change does not introduce real USDC deposits.
