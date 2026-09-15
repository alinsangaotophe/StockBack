# Solana Devnet deployment

Own uses a standard SPL test token and a recipient-bound Anchor reward escrow. The frontend remains a browser-local preview; its purchase and claim buttons are not connected to these scripts yet. SQLite persistence and wallet signing are the next integration stage.

## Verified deployment

Deployed and verified on September 12, 2026. The deployed program bytes match the binary used by all 14 local transaction checks. The real Devnet smoke test funded and claimed 0.25 AAPL, and rejected a repeated claim.

- [AAPL mint](https://explorer.solana.com/address/Ep5T5o9LEpx9A4Nz6YYNAQeaeVBW718XycbVfEPYBKdb?cluster=devnet)
- [Reward program](https://explorer.solana.com/address/8Jtn1EsbdEoPizw7rnSr6wAfefy8rJ2hkiJjftYXRfp5?cluster=devnet)
- [Confirmed claim](https://explorer.solana.com/tx/JwPnpVNsXC61wyLdoMWAwoudFpLKc8xsKWnxnKNGU3aKKfDpDLZW9gyaxXTLgEXmLutGvtqbiGW7GPH8rJbRGWN?cluster=devnet)
- [Machine-readable verification](../deployments/verification.devnet.json)

## Network and addresses

| Role | Address |
| --- | --- |
| Deployment authority and initial operator | `7Pb5enShxV2gMePs9onjK59UsTRU3eLcZfQmhr7o1zoc` |
| Apple / AAPL mint | `Ep5T5o9LEpx9A4Nz6YYNAQeaeVBW718XycbVfEPYBKdb` |
| Reward program | `8Jtn1EsbdEoPizw7rnSr6wAfefy8rJ2hkiJjftYXRfp5` |
| Smoke-test recipient | `C6j6c7T2UmM216sXfxZN7ijPQYXcpnrJ3j89fSfCAnRp` |
| Circle Devnet USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

Every deployment command verifies the Devnet genesis hash before submitting transactions. Public evidence is recorded in `deployments/`; an address alone does not prove deployment. `npm run solana:status` checks the live state.

AAPL has six decimals and an initial supply of 10,000 tokens. The Metaplex metadata stores the name Apple and symbol AAPL. Its metadata URI is empty until a public metadata host is configured. Mint and metadata authority remain with the deployment wallet; freeze authority is disabled. This is an unbacked test token, with no shares, redemption rights, or monetary value.

The reward program transfers inventory into per-order escrow. It does not execute a USDC swap or purchase Apple shares. The received test USDC is retained for later integration.

## Commands

Prerequisites: Node 24 with environment-proxy support, Solana CLI / SBF tools, Anchor 0.32.1, and Rust 1.89.0. Tested with Solana CLI 4.1.0-beta.2 and platform-tools v1.54. The build needs Cargo registry access on its first run.

```sh
npm ci
npm run solana:keys
npm run solana:build
npm run solana:test
npm run solana:status
npm run solana:token
npm run solana:deploy
npm run solana:init
npm run solana:smoke
npm run solana:verify
```

`solana:test` starts an isolated local validator on port 18999 with a new ledger, loads the compiled program, runs 14 transaction checks, and stops its validator. It never resets an existing ledger. Ports 18999, 19000, 18901, and 19900 must be available. Test evidence includes the binary SHA-256; deployment refuses an untested binary.

`solana:deploy` is for initial deployment only. It refuses an existing program, uses a persistent explicit upload buffer, and retains it for inspection if uploading fails. If a public RPC interrupts a partial upload, `npm run solana:upload` reconciles the existing buffer and writes only missing chunks in small confirmed batches; then rerun `npm run solana:deploy`. A complete buffer is byte-checked and finalized without another bulk upload. An upgrade must be reviewed and executed separately. The upgrade authority is retained: the demo is upgradeable, not immutable.

Token setup, config initialization, and the fixed smoke-test order reconcile existing state before submitting. After a timeout, inspect the account and transaction before retrying. The scripts use HTTP confirmation polling to support an HTTPS proxy without a separate WebSocket proxy.

`solana:verify` compares the deployed program bytes with the tested local binary and checks on-chain token metadata and upgrade authority.

The smoke test transfers 0.25 AAPL to the generated test recipient. It verifies the recipient balance, the claimed state, and rejection of a repeated claim. It is independent of the browser preview.

## Contract boundary

- Initialization is restricted to the pinned deployment wallet.
- Admin controls the operator and pauses new allocations.
- Only the operator can allocate a positive, fully funded reward.
- The order hash uniquely identifies an immutable recipient, mint, and token amount.
- The recipient must sign a claim. A separate sponsor can pay transaction fees and recipient ATA rent.
- Claims remain available while new allocations are paused.
- Claimed reward records persist to prevent replay; escrow rent is not reclaimed in this demo.
- There is no current instruction to withdraw funded rewards, rewrite beneficiaries, or reset claims. The retained upgrade authority can still change program code.

Public IDL and generated TypeScript types are in `idl/`. `scripts/solana/rewards.ts` provides typed initialization, funding, claim, and pause helpers. The backend must authenticate users and enforce commerce eligibility before invoking these helpers; the contract does not verify purchases or refunds.

## Secrets and limitations

Private keys are in the Git-ignored `.env`, with mode 0600. CLI key files in `.local/` and `target/` are derived locally and Git ignored. Never expose these values through `NEXT_PUBLIC_*`, browser imports, logs, or committed fixtures. The test recipient key is for scripted verification only, not a user's wallet.

The pinned Anchor/Solana JavaScript dependency graph currently has known npm audit findings, including `bigint-buffer` and Anchor's `toml` dependency. The scripts are local Devnet tooling, not a hardened production signer service. Do not expose untrusted configuration parsing or reuse this dependency assessment as a production security review.

`.env.example` lists the required variable names without secrets. This deployment uses a pinned initializer and persistent program/mint keys. A separate deployment requires new keys, updated initializer/program constants and Anchor configuration, a rebuilt IDL, and fresh local tests. Do not overwrite the current `.env` when rerunning these scripts.
