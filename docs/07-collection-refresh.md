# The everyday collection

September 13, 2026

The collection expands Own beyond electronics while retaining one complete purchase-to-reward preview. All artwork is locally rendered, stylized product illustration. It is not official product photography.

| Product | Company | Display price | Own reward | Experience |
| --- | --- | --- | --- | --- |
| iPhone Duo, 256GB, Night sky | Apple / AAPL | $1,999 | $100 | Complete simulated checkout, settlement, and claim |
| Pegasus 42 | Nike / NKE | $150 illustrative | $7.50 illustrative | Brand concept and product details |
| Wall Connector | Tesla / TSLA | $450 illustrative | $22.50 illustrative | Home-charging concept and product details |
| Daily coffee | Starbucks / SBUX | $6 illustrative | $0.30 illustrative | Monthly reward calculator, 1–30 visits |

Apple's announcement lists a $1,999 U.S. starting price and October 23 availability. The detail page distinguishes the announced product from a shipped order; all checkout and delivery remain simulated. Source: [Apple announcement](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/).

The other product categories were checked against [Nike](https://www.nike.com/w/pegasus-running-shoes-37v7jz8nexhzy7ok), [Tesla](https://shop.tesla.com/product/wall-connector), and [Starbucks](https://www.starbucks.com/menu). Their prices and 5% reward calculations are illustrative fixtures, not current merchant offers. No brand partnership or corresponding stock-token integration is implied.

## Interaction decisions

- Start a fresh preview with 3,000 sample USDC. A $1,999 purchase leaves $1,001, with a separate $100 Own reward.
- Keep the existing $200 illustrative AAPL unit price: the new reward becomes 0.500 preview AAPL.
- Existing active balances and receipts are retained. Untouched, inactive previews with the old 1,000 balance migrate to 3,000. Archived products remain available for receipt-name lookup.
- Search by either product or company; filter by Technology, Movement, Home & energy, or Daily rituals.
- Mark non-Apple products as collection previews. Their detail pages explain the concept and lead to the available iPhone Duo experience. They cannot create an Apple reward or an unsupported stock holding.
- Coffee illustrates accumulating small rewards into one monthly investment. The slider changes the illustration only; it does not create purchases, rewards, or claims.
- Use two balanced columns on desktop, four on very wide screens, and one on mobile. Mobile filters scroll within their own row.

Purchases and rewards are still browser-local. See [Wallet connection](08-wallet-connection.md) for the subsequently implemented Phantom and OKX connection flow. The deployed Devnet mint/program and previous 0.25 AAPL chain smoke test remain unchanged.

## Verification

- TypeScript and production build pass.
- Desktop visual inspection at 1440px; mobile at 390px, with no horizontal page overflow.
- iPhone Duo: activate, preview wallet, consent, pay $1,999, verify $1,001 balance and $100 reward; simulate settlement and claim 0.500 AAPL.
- Coffee calculator: 20 coffees produces $6; keyboard End changes to 30 coffees and $9.
- Brand-name search and category filtering pass. Historical AirPods receipts and an existing active balance survive reload.
- Concept detail offers no checkout and routes to the iPhone Duo experience.
- Browser-local screenshots are saved under `output/playwright/` and excluded from Git.
