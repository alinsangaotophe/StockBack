# Own — Experience and Visual Direction

## Intent

A considered consumer-finance experience that connects useful purchases to long-term investment habits. The interface should feel calm, tangible, and precise.

## Visual system

Warm porcelain canvas, near-black typography, muted olive card material, and terracotta primary actions. Small uppercase eyebrows provide structure; large, tightly tracked headings communicate the main idea. Use a consistent system sans-serif, tabular numbers, fine dividers, and restrained 12–24px surface radii. Product and card illustrations are locally rendered, avoiding fragile external imagery.

## Navigation

Overview provides the starting point and next action. Shop contains curated purchasable demo products and filters. Own Card contains activation, funding, freeze controls, and spending. Portfolio separates pending, ready, and received investment rewards. Activity provides order details and refunds.

## Interaction

Product selection opens a focused detail/checkout dialog. Preserve the chosen item while activating or adding funds. Payment requires active card, sufficient balance, a demo destination, and explicit reward consent. The receipt shows one card debit and one separately funded reward. Progress reward settlement and claiming through clearly labeled prototype controls, never invented chain confirmations.

Dialogs use native modal focus management, Escape dismissal, and focus restoration. Buttons have immediate press feedback. Transitions use opacity/transform, approximately 180ms, and respect reduced motion. Mobile uses a bottom navigation and full-width dialogs.

## Phase boundary

This phase implements a browser-local interactive prototype. localStorage keeps demo progress across reloads. It is not the backend: SQLite, real wallet integration, and Solana Devnet deployment follow after the experience review. No real funds, card details, signatures, or transactions are requested. Each claimed reward remains explicitly a preview.

## First-use journey

1. Overview: discover the proposition and activate the card.
2. Shop: choose the $800 phone and see its $50 promotional reward.
3. Checkout: confirm the destination and investment choice; pay from a 1,000 USDC sample balance.
4. Receipt: see 200 USDC remaining and $50 pending.
5. Portfolio: simulate settlement and claim; inspect the allocation without a fabricated explorer link.

## Functional review

Verify inactive/frozen/insufficient-balance checkout, explicit consent, top-up, searching/filtering, refund before reward release, one-time claim, refresh persistence, reset, keyboard modal behavior, narrow layouts, and reduced motion. Future backend must be authoritative; local prototype state is intentionally user-editable.
