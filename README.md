# StockBack — Consume to Own

Turn everyday spending into everyday ownership.

Shop your favorite brands. Earn their stock on chain. Build your portfolio with every purchase.

## Current scope

Three areas: **Overview**, **Activity**, and **Account**. The old shop, checkout, top-up, and reward-claim UI has been replaced with an investment rewards workspace.

This is a static, interactive product preview. Google sign-in is explicitly unavailable until connected; the separate demo account supports sample card linking, purchase filtering, reward details, holdings, withdrawal review and stock-to-USDC swaps. Balances and simulated transaction history persist locally. No real card data, Google authentication, token transfers or swaps are processed.

## Run

```sh
npm ci
npm run dev
npm run typecheck
npx tsx --test tests/stockback/*.test.ts
npm run build
```

Node.js 24. Production output is in `out/`; `NEXT_PUBLIC_BASE_PATH` supports a subdirectory deployment. No private keys are needed. The existing GitHub Pages workflow is retained; this revision has not been published.

## Design and integration

See [Current product and design](docs/13-stockback-workspace.md) for the three journeys, Awwwards references, data boundaries, and concrete requirements for Google, the card provider and real trading.

The earlier Solana programs, scripts, deployment evidence and wallet helpers remain as historical backend research; the current interface does not import their reward client or sign/broadcast transactions. Documents 01–12 describe earlier stages and are superseded for the current frontend by document 13.
