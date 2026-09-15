# Consume to Own — Product Requirements

> 历史版本：当前前端需求已由 [2026-09-15 三项功能工作台](13-stockback-workspace.md) 取代。下文保留为原设计背景。

Status: Full-demo requirements. Frontend prototype implemented; backend and Devnet integration follow after UI review.

Date: September 12, 2026

September 13 update: [The everyday collection](07-collection-refresh.md) supersedes the original $800 phone / $50 reward fixture below. The current frontend uses iPhone Duo at $1,999, a $100 reward, and 3,000 starting sample USDC. Other brands are browsable concepts. Historical Devnet smoke-test amounts remain unchanged.

## 1. Product thesis

Consume to Own is a Solana investment rewards product built around its own branded stablecoin-funded card experience: **Own Card** (working name).

**“Everyday spending. Long-term investing.”**

Users spend with Own Card and choose to invest their card rewards in tokenized exposure to the companies behind their purchases. Existing asset issuers supply the investment instruments; Consume to Own provides the card experience, reward policy, company matching, and wallet delivery.

For the hackathon, the business assumption is that Consume to Own operates a branded card program through issuing and payment partners. Card issuance, funding, merchant payments, and the commercial reward budget are simulated. The project does not need to secure those partnerships to demonstrate the product.

## 2. Canonical transaction

The core journey uses an $800 Apple phone purchase and a promotional $50 investment reward funded by the Own Card program.

| Item | Demo amount |
| --- | ---: |
| Starting simulated card balance | 1,000 USDC |
| Merchant purchase | $800 |
| Simulated card balance after purchase | 200 USDC |
| Separate program-funded reward | $50 |
| Customer receives | One phone plus tokens acquired with the $50 reward budget |

The card adapter assumes a 1:1 USDC-to-USD conversion with zero fees for this scenario. Card balances and merchant USD settlement remain separate ledger concepts.

The user is charged $800, not $850. There is no $750 procurement assumption and no later third-party bank credit needed to make the example work. The additional $50 comes from the program's promotional reward budget, not from the user's purchase principal.

Use **“$50 investment reward”** and **“Promotional offer”**. This is a fixed demo offer, not a universal 6.25% cashback rate or a real Apple partnership.

The default hero journey is an explicit choice to invest the reward. A cash-reward option can be illustrated later, but is not required for the first demo; no duplicate cash and stock reward is issued for one purchase.

### Commercial assumptions

A production program would fund rewards from a defined combination of partner revenue, merchant campaigns, subscriptions, and promotional spending. None is assumed to cover costs automatically. The demo represents a funded promotional campaign and makes no profitability claim.

`program contribution = contracted revenue - reward expense - card program costs - conversion/execution costs - fraud/refund losses`

The platform separately sponsors testnet fees and account creation. An investment budget is not a guarantee of future market value.

## 3. Scope

### Required

- Card overview with simulated balance, masked card identity, and reward settings.
- Demo card activation and simulated top-up; no real application or deposit.
- Curated shopping offers and an Apple phone checkout using Own Card.
- Wallet connection and explicit investment-reward consent.
- Simulated purchase, settlement, and reward eligibility.
- Real Solana Devnet reward escrow funding and one-time claim.
- Receipt and portfolio with separate spending, pending rewards, and delivered assets.
- Independent mainnet AAPLx reference with honest data provenance.

### Optional

- Additional brands, transaction fixtures, and a hypothetical investment scenario calculator.
- Cash-reward selection and automatic delivery after the manual claim journey works.
- A separately configured, eligible mainnet demonstration using real AAPLx.

### Excluded

Production issuing, card-network certification, real KYC, real cardholder data, real merchant fulfillment, production payment orchestration, a proprietary stock-backed token, lending, leverage, and DAO governance.

## 4. Screens and journey

### Card overview

Show Own Card, a masked fictional identifier, available simulated USDC balance, recent spending, and investment rewards. Actions: “Activate demo card”, “Add demo funds”, and “Explore offers”. Activation and top-up change only the simulated card ledger; they never ask for real card details or a wallet asset transfer.

Use a persistent compact “Demo” badge with a clear explanation of simulated card activity. Keep implementation details out of primary product copy. Do not display a real card-network logo or imply an existing issuing partner.

### Offers and product detail

Feature an $800 Apple phone with “Earn $50 toward Apple” and a promotional-offer label. Explain the product-to-company mapping and the reward timing. The merchant and the product company are separate fields: an Apple phone bought from another retailer still maps to Apple when item-level data is available.

The demo has item-level fixtures. A future card transaction feed may identify only the merchant; ambiguous marketplace purchases require order data or user confirmation, rather than silently assigning a company token.

### Checkout

Show the $800 purchase total, Own Card balance, $50 investment reward, and destination wallet. Consent: “Invest my card reward in Apple-linked tokens.” Supporting text: “Investment value can rise or fall.” Primary action: “Pay with Own Card”. The demo badge and payment explanation make its simulated nature clear.

Reject insufficient simulated balance and inactive cards. A failed payment leaves the balance and reward unchanged. Wallet rejection preserves the order. The destination recorded at checkout does not silently change when the connected wallet changes.

### Receipt

After simulated payment, show “Purchase confirmed” and “Investment reward pending”. Display the $800 card debit separately from the $50 program reward.

A demo control advances simulated settlement and reward release. Once escrow funding is confirmed, show “Claim demo reward”. After the wallet signs and the chain confirms, show the delivered quantity and a Devnet explorer link.

### Portfolio

Show reward acquisition budgets, pending allocations, and quantities received. Current holdings come from chain data; transaction attribution comes from purchase records. Transfers out reduce current holdings without deleting earned-reward history.

Keep simulated card funds, Devnet demo valuation, and any mainnet reference separate. Never sum them into a real net-worth figure. The Devnet asset is **Apple (AAPL)** with “Devnet demo token — no monetary value” in its asset details and deployment manifest.

## 5. Reward behavior

1. The server owns the card balance, offer rules, and reward amount.
2. One eligible card purchase creates at most one investment entitlement.
3. Funding a card is not a purchase and does not earn a reward.
4. Card purchase confirmation and reward delivery are separate states.
5. Before release, a full refund restores the $800 simulated card balance and cancels the pending $50 reward. Partial refunds are outside the core demo.
6. Settlement and release timing can be accelerated with demo controls. Production chargeback windows and reserves are not implemented.
7. Once tokens have been delivered, a later chargeback cannot silently remove them from the user's wallet. This remains a future operating-policy decision.
8. Missing pricing or inventory leaves the reward pending. Do not silently substitute another asset.
9. Test-token allocation uses a disclosed fixture price; live prices never turn the test token into a backed asset.

## 6. Solana integration

Use real Devnet transactions for recipient-bound reward allocation and claiming. Use the existing AAPLx product as the mainnet integration reference, not as a name for our test token. [Issuer product page](https://assets.backed.fi/products/apple-xstock).

AAPLx provides exposure through a financial instrument, not direct Apple voting rights. Production distribution and card availability need a compatible target market. These requirements are outside the commercial demo's implementation scope. [Product legal overview](https://docs.xstocks.fi/docs/product-legal-overview).

## 7. Acceptance criteria

A judge can complete the following journey in approximately three minutes:

1. Activate Own Card and see 1,000 simulated USDC.
2. Select the $800 Apple phone and opt into the $50 investment reward.
3. Pay and see the balance become 200 simulated USDC, with a separate pending reward.
4. Advance settlement and claim the funded AAPL reward on Devnet.
5. Verify the actual chain transfer and view its purchase attribution.
6. Understand which card activity is simulated and which chain activity actually executed.

Also verify failed payments, insufficient balance, pre-release refunds, and duplicate claims. Use clear responsive layouts with keyboard access and loading/error states. Track demo completion and claim success as proposed metrics, not measured traction.

## 8. Implementation direction

Prioritize the Own Card experience, a single compelling Apple journey, and verifiable Solana delivery. Use simple sequential mock operations for Web2 behavior; production financial transaction orchestration is not a prerequisite. Retain on-chain authorization and replay protection because they are the actual contract demonstration.
