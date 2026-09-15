# Frontend Verification

Date: September 12, 2026

## Verified

- Production build and TypeScript compilation pass.
- Desktop overview, checkout, and shop visually inspected.
- Mobile shop and portfolio visually inspected at 390 × 844.
- Own Card activation enables purchase flow.
- An $800 purchase deducts exactly $800 from 1,000 sample USDC and creates a separate $50 pending reward.
- Checkout requires reward consent and a selected preview destination.
- Settlement changes a pending reward to ready; claiming changes it to a 0.250 AAPL preview holding at the disclosed fixture price.
- Reload preserves balance, orders, and claimed investment state.
- Search/filter mismatch shows a clear no-results state and reset action.
- Frozen card and insufficient balance disable payment; unfreeze and adding sample funds recover the checkout.
- Pre-settlement refund restores $800 and cancels the corresponding reward.
- Negative top-up disables submission; a valid $100 top-up updates balance correctly.
- Escape closes the native dialog.

## Review adjustments

| Before | After | Why |
| --- | --- | --- |
| Large empty portfolio illustration after first purchase | Compact pending-reward message | Keeps the next reward action prominent |
| Mobile portfolio badge compressed the heading | Badge removed at narrow widths | Restores readable title wrapping |
| Insufficient balance displayed a zero post-purchase balance | Explicit insufficient-balance label | Avoids implying a purchase can proceed |
| Product art repeated at mobile checkout | Art retained in detail, removed from narrow checkout | Keeps payment choices and consent in focus |
| Asset details opened general help | Dedicated asset detail dialog | Shows quantity, acquisition basis, fixture price, and backing status |

## Boundaries

This was browser-driven manual verification, not an automated E2E suite. Reduced-motion CSS is implemented; assistive-technology and physical-device testing remain unperformed. The state machine is a browser-local prototype, not a secure ledger. No SQLite backend, genuine wallet connection, live asset quote, or on-chain claim is present in this phase.
