# Solana wallet connection

Historical connection-only milestone. The current application adds signed sessions, SQLite orders and real reward transactions; see [Web reward integration](09-web-reward-integration.md).


September 13, 2026

Own now connects to Phantom and OKX through their injected Solana providers. The header, Own Card destination, and checkout all share one connection controller. The current integration supports extension-enabled desktop browsers and wallet app browsers that inject these providers. QR pairing and external mobile deep-link sessions are not implemented.

## Behavior

- Phantom uses `window.phantom.solana` with `isPhantom`; OKX uses `window.okxwallet.solana`. A shared `window.solana` alias is not used, avoiding provider collisions.
- Clicking a wallet calls its `connect()` method and reads the approved Solana public address. No signature or transaction is requested during connection.
- Missing wallets show official installation links and an inline explanation. Denied and already-pending requests have distinct feedback and a retry path.
- Account changes update all connection surfaces and reset checkout consent. A null account or wallet-side disconnect clears the connection.
- Closing a pending selector or cancelling invalidates the request. A late response cannot restore a cancelled selection or overwrite a newer connection.
- The app remembers only the provider name. On refresh it restores an account only when the provider itself reports `isConnected` and a valid public key. Otherwise the user reconnects explicitly. No background permission prompt is triggered.
- Manual disconnect clears app state even if the extension's disconnect call fails. Event subscriptions are removed on switch and unmount.
- New orders capture their destination at checkout; subsequent account changes do not rewrite it. A simulated claim against an address-bound order requires that same connected address. Historical address-free preview orders retain their existing simulated behavior.

Public addresses are stored with browser-local demo orders. This is not server authentication or proof of ownership; a future backend needs its own authentication and authorization design. Card money, purchases, settlement, and claims remain simulated. No signing API or backend signing key is imported into the browser, and wallet connection does not assert that the wallet has switched to Devnet. Explorer links explicitly select Devnet.

## Verification

`npm run test:wallet` runs seven controller checks: missing provider, provider selection and account events, rejection/retry/disconnect, cancelled-response races, old-listener isolation, invalid responses, and unmount races.

Playwright checks used clearly isolated mock injected providers, not real extension approvals:

- No-extension selector and installation guidance.
- Phantom rejection then successful retry; distinct OKX connection and disconnect.
- Desktop selector and 390px connected-address layout without page overflow.
- Wallet selection inside checkout, with independent accessible titles for stacked dialogs.
- Account change clears consent; payment persists the new destination.
- Wrong-account preview claim is blocked; reconnecting the recorded account permits the simulated claim.

TypeScript and production build pass. Actual Phantom/OKX extension approval remains a manual integration check in a browser with the corresponding wallet installed.

## References

- [Phantom provider detection](https://docs.phantom.com/solana/detecting-the-provider)
- [Phantom connection and events](https://docs.phantom.com/solana/establishing-a-connection)
- [OKX Solana provider API](https://web3.okx.com/fr/onchainos/dev-docs/wallet/dapp-connect/chains/solana/provider)
