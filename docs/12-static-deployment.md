# Static deployment

The application exports to `out/` and runs on GitHub Pages without a backend. SQLite and the reward API have been removed. Browser localStorage namespaces separate account UI state and order records by connected wallet. There is no cross-device order recovery. Chain receipts are authoritative for claim completion, but local shopping data is not trusted evidence of a payment.

## Public Devnet rewards

The existing program retains legacy reward instructions and adds isolated demo pools. Only the pinned administrator initializes a mint pool and its fixed token amount. The administrator pre-funds its associated token account. Each claim transfers that fixed amount, creates an immutable receipt PDA scoped to pool, wallet and order hash, and increments wallet and pool counters atomically. Five claims per wallet per mint and 1,000 claims per pool are enforced on chain. New wallets can bypass a per-wallet limit; this is a bounded test-token faucet, not purchase verification or Sybil protection. Failed transfers roll back counters and receipt creation.

The browser verifies Devnet genesis, uses explicit solana:devnet wallet signing and sends the transaction directly to RPC. The connected wallet pays transaction fees and account rent. No operator or deployer secrets enter the browser or CI build. The pending transaction signature is saved before broadcast; refresh reconciles with the receipt PDA after a timeout.

## GitHub Pages

Enable Settings → Pages → GitHub Actions. `.github/workflows/pages.yml` uses the configured Pages base path, builds with Node 24 and publishes `out/`. Optionally configure repository variable NEXT_PUBLIC_SOLANA_RPC_URL to a browser-accessible Devnet endpoint. Public RPC values are visible to visitors; do not use private credentials. Public endpoints may rate limit visitors.

Only local administrative scripts need `.env`: build and test the program, upgrade Devnet, then run `NODE_USE_ENV_PROXY=1 npx tsx scripts/solana/initialize-demo.ts` to initialize and fill the four reward pools. This command is idempotent and tops up only the remaining authorized claim inventory. The website does not need these keys.

## Verification (2026-09-13)

- Static export and TypeScript passed, including `/cunsume-to-own` base-path export served by a static HTTP server.
- 23 local contract checks passed, including public recipient-only transfer, duplicate receipt rejection, fixed amount and sixth-claim rejection.
- 12 wallet/local-order tests passed. Browser purchase made no API request or login signature; a separate tab restored the wallet-scoped balance and order.
- The Devnet deployed binary matches the tested artifact. All four pools were initialized and funded. `deployments/static-demo-smoke.json` records verified recipient-only claims for each mint; `deployments/static-client-smoke.json` verifies the actual frontend reward client against Devnet.
- The exported files were checked against configured private keys; none were present. Real Phantom/OKX extension approval was not repeated in this migration; explicit Devnet signing remains covered by wallet tests.
- GitHub publication is not performed locally. Enable Pages with GitHub Actions, then push the repository to publish.
