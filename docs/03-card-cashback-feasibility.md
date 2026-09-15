# Card Cashback and Investment Checkout — Feasibility Review

Research date: September 12, 2026

Scope: Public primary-source research into third-party card cashback. No provider approval or payment test was performed.

Current product decision: the hackathon now uses a simulated proprietary Own Card program with its own promotional investment rewards. See the current [PRD](01-product-requirements.md). The $850 mixed-charge analysis below remains research background, not the active demo flow.

## Decision

The consumption-to-investment concept has real operating precedents. The exact proposal—charge $850 for an $800 phone and a $50 token investment, then rely on $50 issuer cashback—is not established as a generally available integration.

The key dependency is a payment arrangement that explicitly accepts both the merchandise and investment components, coupled with an issuer reward policy that covers the correctly classified purchase. A successful card authorization would not prove cashback eligibility.

Recommended position: conditional feasibility for a negotiated partner pilot; unsuitable as an unconditional promise for arbitrary existing cards. A hackathon simulation can represent the arrangement, provided partner approval and cashback are clearly hypothetical.

## 1. The accounting is conditional

Ignoring costs, $850 collected minus $800 merchandise settlement minus $50 investment leaves the platform with zero margin. If the issuer independently pays the shopper $50, the shopper's net expenditure is $800.

That cashback is paid to the shopper, not to the platform, so it does not cover the platform's processing costs.

For scale only, Stripe's published U.S. standard domestic-card rate of 2.9% plus $0.30 would cost $24.95 on $850, leaving $825.05. This is an illustration, not a quote or confirmation that Stripe accepts the business. Additional conversion, execution, cross-border, and dispute costs may apply. [Stripe pricing](https://stripe.com/pricing).

### Reward arithmetic

The proposed $50 equals 6.25% of an $800 eligible merchandise purchase, or about 5.88% of an $850 fully eligible charge. Neither rate can be assumed from the existence of a cashback card.

| Hypothetical eligible amount | Rate | Cashback | Net cost on $850 charged |
| --- | ---: | ---: | ---: |
| $800 merchandise | 2% | $16 | $834 |
| $800 merchandise | 3% | $24 | $826 |
| $850 entire charge, only if approved | 3% | $25.50 | $824.50 |
| Qualifying fixed-dollar promotion | $50 fixed | $50 | $800 |

An optional smaller investment can match actual merchandise cashback: an $800 phone plus a $24 separately funded investment minus $24 cashback gives $800 net expenditure before fees. This does not require the investment payment to earn rewards, but does require approved investment funding and a reliable merchandise reward.

## 2. Payment classification is the principal obstacle

Visa's April 2026 Merchant Data Standards Manual assigns specific treatment to non-financial institution crypto purchases and account funding under MCC 6051, and describes securities brokers/dealers under MCC 6211. It also requires appropriate classification for other transactions at the merchant location. [Visa manual, section 2](https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf).

Inference for this project: adding an explicit $50 investment purchase to an $800 phone order is not evidence that all $850 can be processed as ordinary electronics retail. The correct treatment of this mixed flow needs the acquirer's determination. It may require distinct payment legs and merchant arrangements. These public rules do not establish a categorical prohibition of every mixed checkout.

Stripe lists investment/brokerage services and cryptocurrency businesses as restricted or limited-availability activities requiring engagement with its sales team. Ordinary ecommerce onboarding is not approval for this business. [Stripe restricted businesses](https://stripe.com/legal/restricted-businesses).

Do not disguise the investment component, select a convenient MCC to obtain rewards, or represent an ordinary payment split API as approval of the underlying business.

## 3. What actual card terms establish

| Product | Verified public evidence | Implication |
| --- | --- | --- |
| Apple Card | 3% Daily Cash on purchases from Apple; ordinary Apple Pay purchases generally receive 2% | Selling an Apple product does not establish that the platform is Apple or inherits its reward rate. [Apple](https://www.apple.com/apple-card/) |
| ether.fi Cash | Published rules exclude investment/financial categories including 6012 and 6211; rewards are paid in ETHFI with clearing and a lock period | No support for assuming cash-equivalent $50 cashback on the combined order. [Cashback rules](https://help.ether.fi/en/articles/262374-how-does-cashback-work) |
| Crypto.com prepaid card | Rewards exclusions explicitly include securities brokers/dealers, MCC 6211 | A securities-classified payment is not a reliable source of CRO rewards. [Exclusions](https://help.crypto.com/en/articles/4597450-restriction-of-cro-rewards-program-and-restricted-markets-for-crypto-com-prepaid-card) |
| Bybit Card | Reward FAQ describes excluded funding categories, tier caps, point redemption, and credit to the Funding account | Neither a universal $50 rate nor an unrestricted mixed-order entitlement. The reviewed FAQ alone does not establish that every securities purchase is excluded. [Rewards FAQ](https://www.bybit.com/en/help-center/article/FAQ-Bybit-Card-Rewards) |

Terms vary by issuer entity, geography, tier, currency, promotion, and transaction type. Paying with a stablecoin-funded card does not remove card-network classification. Reward tokens, cash statement credits, and stablecoin payouts must be modeled separately.

## 4. Strong evidence that the broader concept works

**Stash Stock-Back** is a close product precedent: qualifying purchases can earn stock in the merchant's company, with a default investment for other merchants. It uses its own debit-card program and an eligible Stash investment account. It does not demonstrate that unrelated third-party cards approve this project's $850 transaction. [Stash FAQ](https://www.stash.com/learn/faq-stock-back-card), [Program disclosures](https://www.stash.com/debit-terms-and-conditions).

**Fidelity Rewards Visa** supports 2% rewards deposited into eligible Fidelity accounts, including brokerage accounts, with optional monthly automatic redemption. This proves reward-to-investment-account routing, not automatic purchase of the company behind each item. [Fidelity](https://www.fidelity.com/spend-save/visa-signature-card).

The differentiation to investigate is therefore product-level company matching and eligible tokenized-asset delivery to a wallet. Do not claim the general spend-to-invest concept is novel.

## 5. Partnership candidate

**Rain** is worth a business-development inquiry because it provides stablecoin card-program infrastructure, publishes a Solana-support announcement, and describes both managed and partner-managed funds flows. Its onboarding includes program scoping, business review, sandbox access, and production testing. [Launch guide](https://www.rain.xyz/resources/launch-a-card-program-with-rain), [Solana support](https://www.rain.xyz/resources/rain-expands-support-to-solana-and-stellar-enabling-more-partners-to-launch-stablecoin-powered-card-programs).

This is evidence of relevant infrastructure, not evidence that Rain will fund cashback, accept tokenized-equity rewards, support the selected launch market, or approve a bundled investment charge. Public documentation does not settle those questions.

The issuer/asset overlap must also work: xStocks lists U.S. persons and several other markets among its restrictions and places geographic compliance obligations on partners. U.S. card examples above are product precedents, not an immediately usable AAPLx launch audience. [xStocks partner requirements](https://xstocks.com/partner).

## 6. Three implementation choices

| Choice | Public-evidence assessment | Next prerequisite |
| --- | --- | --- |
| One $850 card charge for merchandise and investment | Not verified; classification, acceptance, and reward eligibility unresolved | Written approval from the acquirer and applicable card reward program |
| Merchant charges $800; an approved separate rail funds investment | More credible way to preserve merchant identity; no guarantee of reward amount | Confirm merchandise cashback and investment funding; disclose multiple financial transactions |
| Partner card rewards are allocated to investments after settlement | Closest to demonstrated operating models | Card/rewards partnership, asset-distribution arrangement, and funded reward budget |

Recommendation: use the third as the long-term partnership model. For an earlier independent pilot, investigate the second, with the investment amount aligned to verified rewards and funded by explicit user consent. Keep the first as an unverified partnership hypothesis.

## 7. Concrete diligence request

Before paid implementation, obtain answers for one named legal entity, launch country, card program, and asset distributor:

1. Can we accept a payment containing both physical merchandise and tokenized equity acquisition? Who is merchant of record for each component?
2. Which MCCs and payment legs are required? Must the charges be separated?
3. Does the merchandise leg qualify for cashback? Specify rate, cap, exclusions, payout asset, timing, and reversal rules.
4. May a customer elect to direct rewards to AAPLx, and who provides execution and eligibility checks?
5. Who pays card acceptance, conversion, network, asset acquisition, and refund costs?
6. Can transaction and reward events be supplied through sandbox APIs and production webhooks?

Approval should describe this exact flow, not just say that the provider supports ecommerce, crypto, or rewards. A later pilot should verify payment clearing, cashback entitlement and payout, asset delivery, and a refund scenario. No counterparties were contacted during this research.

## 8. Hackathon treatment

The $850 / $50 cashback scenario is acceptable as a labeled simulated partner offer. Show gross charge, investment allocation, expected cashback, and net cost separately. Do not display cashback as received at authorization or claim compatibility with a real card brand without evidence.

The main product story remains valid even if a realistic base reward is $16 or $24 rather than $50. Demonstrating a correct connection from consumption to investment matters more than maximizing an unsupported reward percentage.
