"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import {
  stocks,
  purchases,
  freshAccount,
  money,
  demoQuote,
  applyMovement,
  type Account,
} from "@/lib/stockback";

type Page = "Overview" | "Activity" | "Account";
type Modal = "login" | "card" | "Withdraw" | "Swap" | "purchase" | null;
const storageKey = "stockback-workspace-v2";
function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        s<span>↗</span>
      </span>
      stockback<span className="brand-dot">®</span>
    </span>
  );
}
function StockIcon({ index }: { index: number }) {
  return (
    <span className="stock-icon" style={{ background: stocks[index].color }}>
      {stocks[index].mark}
    </span>
  );
}
export default function OwnApp() {
  const [page, setPage] = useState<Page>("Overview");
  const [account, setAccount] = useState<Account>(freshAccount);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [stock, setStock] = useState(0);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [card, setCard] = useState("");
  const [consent, setConsent] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All transactions");
  const [selectedPurchase, setSelectedPurchase] = useState(purchases[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const executionLock = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const a = JSON.parse(raw);
        if (
          typeof a.signedIn === "boolean" &&
          typeof a.card === "string" &&
          Array.isArray(a.balances) &&
          a.balances.length === 4 &&
          a.balances.every(
            (v: unknown) =>
              typeof v === "number" && Number.isFinite(v) && v >= 0,
          ) &&
          Number.isFinite(a.usdc) &&
          a.usdc >= 0 &&
          Array.isArray(a.movements) &&
          a.movements.every(
            (m: Record<string, unknown>) =>
              m &&
              typeof m.id === "string" &&
              (m.kind === "Swap" || m.kind === "Withdraw") &&
              typeof m.symbol === "string" &&
              typeof m.address === "string" &&
              typeof m.date === "string" &&
              Number.isFinite(Date.parse(m.date)) &&
              typeof m.amount === "number" &&
              Number.isFinite(m.amount) &&
              typeof m.received === "number" &&
              Number.isFinite(m.received),
          )
        )
          setAccount(a);
      }
    } catch {
      /* Use the sample account if local storage is unavailable. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey, JSON.stringify(account));
      } catch {
        setNotice(
          "Changes will last only for this session. Browser storage is unavailable.",
        );
      }
  }, [account, ready]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function open(next: Modal, index = 0) {
    setError("");
    setReview(false);
    setAmount("");
    setAddress("");
    setConsent(false);
    setStock(index);
    executionLock.current = false;
    setModal(next);
  }
  function transact(kind: "Withdraw" | "Swap", index = 0) {
    if (!account.signedIn) open("login");
    else open(kind, index);
  }
  function validate() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > account.balances[stock])
      return "Enter an amount within your available balance.";
    if (!/^\d+(\.\d{1,6})?$/.test(amount)) return "Use up to 6 decimal places.";
    if (modal === "Withdraw") {
      try {
        const key = new PublicKey(address.trim());
        if (!PublicKey.isOnCurve(key.toBytes()))
          return "Enter a Solana wallet address, not a program address.";
      } catch {
        return "Enter a valid Solana wallet address.";
      }
    }
    return "";
  }
  function submit() {
    if (executionLock.current) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (!review) {
      setReview(true);
      setError("");
      return;
    }
    try {
      executionLock.current = true;
      setAccount(
        applyMovement(
          account,
          stock,
          Number(amount),
          modal as "Withdraw" | "Swap",
          address.trim(),
        ),
      );
      setModal(null);
      setNotice(
        modal === "Swap"
          ? "Demo swap complete. USDC added to your balance."
          : "Demo withdrawal recorded. No on-chain transaction was sent.",
      );
    } catch (e) {
      executionLock.current = false;
      setError((e as Error).message);
    }
  }
  const total = account.balances.reduce(
    (sum, units, i) => sum + units * stocks[i].price,
    account.usdc,
  );
  const filtered = purchases.filter(
    (p) =>
      `${p.merchant} ${stocks[p.stock].symbol}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All transactions" || p.status === filter),
  );
  const monthlyRewards = purchases
    .filter((p) => p.status === "Settled" && p.date.startsWith("2026-09"))
    .reduce((sum, p) => sum + p.reward, 0);
  const settled = purchases
    .filter((p) => p.status === "Settled")
    .reduce((s, p) => s + p.reward, 0);
  function transactionTable(compact = false) {
    const rows = compact ? purchases.slice(0, 4) : filtered;
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Date</th>
              <th>Spent</th>
              <th>Stock reward</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <button
                    className="merchant-button"
                    onClick={() => {
                      setSelectedPurchase(p);
                      open("purchase");
                    }}
                  >
                    <span className={`merchant-icon m-${p.stock}`}>
                      {p.merchant[0]}
                    </span>
                    <span>
                      <strong>{p.merchant}</strong>
                      <small>{p.category}</small>
                    </span>
                  </button>
                </td>
                <td>
                  {new Date(p.date + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>{money(p.amount)}</td>
                <td>
                  <strong className="reward">+{money(p.reward)}</strong>
                  <small>{stocks[p.stock].symbol}</small>
                </td>
                <td>
                  <span className={`status ${p.status.toLowerCase()}`}>
                    <i />
                    {p.status}
                  </span>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`View ${p.merchant} transaction`}
                    onClick={() => {
                      setSelectedPurchase(p);
                      open("purchase");
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty">
            No matching transactions.
            <button
              className="text-button"
              onClick={() => {
                setQuery("");
                setFilter("All transactions");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <div className="main-shell">
        <header className="topbar">
          <div className="header-brand">
            <Brand />
            <span>Everyday, invested.</span>
          </div>
          <div className="header-pattern" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i}>
                {i % 3 === 0 ? (
                  <CreditCard />
                ) : i % 3 === 1 ? (
                  <Sparkles />
                ) : (
                  <Wallet />
                )}
              </span>
            ))}
          </div>
          <label className="header-search">
            <Search size={17} />
            <input
              aria-label="Search purchases"
              placeholder="Search a brand or stock…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage("Activity");
              }}
            />
            <span>⌕</span>
          </label>
          <div className="top-actions">
            <span className="preview-tag">DEMO</span>
            <button
              className="profile"
              onClick={() =>
                account.signedIn ? setPage("Account") : open("login")
              }
            >
              <span className="avatar">{account.signedIn ? "J" : "G"}</span>
              {account.signedIn ? "Jamie’s account" : "Sign in with Google"}
              <ChevronRight size={14} />
            </button>
          </div>
        </header>
        <div className="navigation-bar">
          <nav aria-label="Main navigation">
            {(
              [
                { title: "Overview", icon: LayoutGrid },
                { title: "Activity", icon: ArrowDownUp },
                { title: "Account", icon: CreditCard },
              ] as const
            ).map(({ title, icon: Icon }) => (
              <button
                key={title}
                className={page === title ? "nav-link selected" : "nav-link"}
                aria-current={page === title ? "page" : undefined}
                onClick={() => setPage(title)}
              >
                <Icon size={19} />
                {title}
                {page === title && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <span className="nav-note">
            <span />
            Solana · Demo workspace
          </span>
          <button
            className="button primary nav-card"
            onClick={() => {
              setPage("Account");
              if (!account.signedIn) open("login");
              else open("card");
            }}
          >
            <CreditCard size={15} />
            {account.card ? "My U Card" : "Link U Card"}
          </button>
        </div>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Overview"
                  ? "SPEND. EARN. OWN."
                  : page === "Activity"
                    ? "EVERY PURCHASE HAS A STORY"
                    : "YOUR ACCOUNT, CONNECTED"}
              </div>
              <h1>
                {page === "Overview"
                  ? "Turn everyday spending into everyday ownership."
                  : page === "Activity"
                    ? "Small moments. Real potential."
                    : "Your next chapter starts here."}
              </h1>
              <p>
                {page === "Overview"
                  ? "Shop your favorite brands. Earn their stock on chain. Build your portfolio with every purchase."
                  : page === "Activity"
                    ? "Follow every purchase from card payment to stock reward."
                    : "One account. One card. A growing collection of stocks."}
              </p>
            </div>
            <span className="heading-date">
              Sample snapshot
              <br />
              <strong>September 15, 2026</strong>
            </span>
          </div>
          {page === "Overview" && (
            <>
              <section className="hero-grid">
                <div className="portfolio-card">
                  <div className="section-kicker">
                    YOUR PORTFOLIO <span>USD</span>
                  </div>
                  <div className="portfolio-value">
                    {money(total)}
                    <span>USD</span>
                  </div>
                  <div className="portfolio-caption">
                    <span className="positive">
                      <ArrowUpRight size={14} />
                      Built from everyday rewards
                    </span>
                    <span>Illustrative values</span>
                  </div>
                  <img
                    className="portfolio-illustration"
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/portfolio-friend.png`}
                    alt=""
                    aria-hidden="true"
                  />
                  <div className="portfolio-bottom">
                    <span>
                      {account.balances.filter((x) => x > 0).length} stocks in
                      your collection
                    </span>
                    <div>
                      <button
                        className="button light"
                        onClick={() => transact("Withdraw")}
                      >
                        <ArrowUpRight size={16} />
                        Withdraw
                      </button>
                      <button
                        className="button glass"
                        onClick={() => transact("Swap")}
                      >
                        <ArrowDownUp size={16} />
                        Swap
                      </button>
                    </div>
                  </div>
                </div>
                <div className="reward-summary">
                  <div className="section-kicker">
                    SEPTEMBER REWARDS <Sparkles size={17} />
                  </div>
                  <div className="summary-value">{money(monthlyRewards)}</div>
                  <p>From the things you already buy.</p>
                  <div className="mini-bars" aria-hidden="true">
                    {[
                      20, 30, 24, 44, 38, 52, 42, 67, 53, 74, 63, 87, 75, 95,
                      88, 112,
                    ].map((h, i) => (
                      <i key={i} style={{ height: h }} />
                    ))}
                  </div>
                  <div className="summary-foot">
                    <span>
                      <i />
                      Settled stock rewards
                    </span>
                    <strong>2% reward rate</strong>
                  </div>
                </div>
                <div className="card-summary">
                  <div className="section-kicker">
                    YOUR EVERYDAY CARD <CreditCard size={17} />
                  </div>
                  <div className="mini-card" aria-hidden="true">
                    <span>stockback ↗</span>
                    <CreditCard size={22} />
                    <strong>•••• {account.card || "0000"}</strong>
                    <b>U</b>
                  </div>
                  <div className="card-summary-bottom">
                    <span>
                      <i />
                      {account.card
                        ? "Connected · Ready to earn"
                        : "Good things start with a card."}
                    </span>
                    <button
                      aria-label="Open card settings"
                      className="icon-button"
                      onClick={() => setPage("Account")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              </section>
              {(!account.signedIn || !account.card) && (
                <section className="onboarding-strip">
                  <span className="step-circle">
                    {account.signedIn ? (
                      <CreditCard size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {account.signedIn
                        ? "One more step. Link your U Card."
                        : "Make everyday spending yours."}
                    </strong>
                    <p>
                      {account.signedIn
                        ? "Connect your card to bring purchases and rewards together."
                        : "Sign in, link your U Card, and start your own stock collection."}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => open(account.signedIn ? "card" : "login")}
                  >
                    {account.signedIn ? "Link U Card" : "Get started"}
                    <ArrowRight size={17} />
                  </button>
                </section>
              )}
              <section className="holdings-section">
                <div className="section-heading">
                  <h2>
                    Your stock collection{" "}
                    <span>{account.balances.filter((x) => x > 0).length}</span>
                  </h2>
                  <span className="muted">Tokenized stocks on Solana</span>
                </div>
                <div className="holdings-grid">
                  {stocks.map((s, i) => (
                    <button
                      className="holding-card"
                      key={s.symbol}
                      onClick={() => transact("Withdraw", i)}
                    >
                      <div className="holding-top">
                        <StockIcon index={i} />
                        <ArrowUpRight size={16} />
                      </div>
                      <h3>
                        {s.name}
                        <span>{s.symbol}</span>
                      </h3>
                      <div className="holding-bottom">
                        <strong>{money(account.balances[i] * s.price)}</strong>
                        <span>{account.balances[i].toFixed(4)} tokens</span>
                      </div>
                      <div className="allocation">
                        <i
                          style={{
                            width: `${Math.min(100, ((account.balances[i] * s.price) / Math.max(total, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {account.usdc > 0 && (
                  <div className="cash-balance">
                    <Wallet size={18} /> USDC balance{" "}
                    <strong>{account.usdc.toFixed(6)} USDC</strong>
                    <span>From demo swaps</span>
                  </div>
                )}
              </section>
              <section className="activity-section">
                <div className="section-heading">
                  <h2>Recent activity</h2>
                  <button
                    className="text-button"
                    onClick={() => setPage("Activity")}
                  >
                    View all activity
                    <ArrowRight size={15} />
                  </button>
                </div>
                {transactionTable(true)}
              </section>
            </>
          )}
          {page === "Activity" && (
            <>
              <div className="activity-stats">
                <div>
                  <span>Total spending · sample history</span>
                  <strong>
                    {money(purchases.reduce((s, p) => s + p.amount, 0))}
                  </strong>
                </div>
                <div>
                  <span>Settled rewards</span>
                  <strong>{money(settled)}</strong>
                </div>
                <div>
                  <span>Pending rewards</span>
                  <strong>$0.25</strong>
                </div>
              </div>
              <section className="activity-section">
                <div className="section-heading">
                  <h2>Purchase history</h2>
                  <span className="muted">{filtered.length} transactions</span>
                </div>
                <div className="filters">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search transactions"
                      placeholder="Search merchant or stock…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Transaction status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option>All transactions</option>
                    <option>Settled</option>
                    <option>Pending</option>
                  </select>
                </div>
                {transactionTable()}
              </section>
              <section className="activity-section movement-section">
                <div className="section-heading">
                  <h2>Transfers & swaps</h2>
                  <span className="preview-tag">DEMO LEDGER</span>
                </div>
                {account.movements.length ? (
                  account.movements.map((m) => (
                    <div className="movement" key={m.id}>
                      <span className="step-circle">
                        {m.kind === "Swap" ? (
                          <ArrowDownUp size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {m.kind} · {m.symbol}
                        </strong>
                        <small>
                          {new Date(m.date).toLocaleString()} · Simulated
                        </small>
                        {m.address && (
                          <small className="address">To: {m.address}</small>
                        )}
                      </div>
                      <div>
                        <strong>
                          −{m.amount} {m.symbol}
                        </strong>
                        <small>
                          {m.kind === "Swap"
                            ? `+${m.received.toFixed(6)} USDC`
                            : "No on-chain transfer sent"}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    <ArrowDownUp size={24} />
                    <p>Your withdrawals and swaps will appear here.</p>
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Account" && (
            <div className="account-grid">
              <section className="account-panel">
                <span className="eyebrow">01 / YOUR IDENTITY</span>
                <h2>A simpler way in.</h2>
                <p>
                  Use your Google account to keep your card and stock rewards in
                  one place.
                </p>
                <div className="identity-row">
                  <span className="avatar large">
                    {account.signedIn ? "J" : "G"}
                  </span>
                  <div>
                    <strong>
                      {account.signedIn
                        ? "Jamie · Demo account"
                        : "Connect your Google account"}
                    </strong>
                    <small>
                      {account.signedIn
                        ? "Local demo session"
                        : "No new password to remember"}
                    </small>
                  </div>
                  {account.signedIn && <CheckCircle2 size={20} />}
                </div>
                <button
                  className="button primary"
                  onClick={() =>
                    account.signedIn
                      ? (setAccount((a) => ({ ...a, signedIn: false })),
                        setNotice("Signed out of the demo account."))
                      : open("login")
                  }
                >
                  {account.signedIn ? (
                    <>
                      <LogOut size={17} />
                      Sign out
                    </>
                  ) : (
                    <>
                      <span className="google-g">G</span>Continue with Google
                    </>
                  )}
                </button>
              </section>
              <section className="account-panel">
                <span className="eyebrow">02 / YOUR U CARD</span>
                <h2>Your card. More possibilities.</h2>
                <p>
                  Link your U Card to see your purchases and the stock rewards
                  they generate.
                </p>
                <div className="u-card">
                  <Brand />
                  <CreditCard className="card-chip" size={29} />
                  <span className="card-number">
                    •••• &nbsp; •••• &nbsp; •••• &nbsp; {account.card || "0000"}
                  </span>
                  <div>
                    <span>
                      {account.card
                        ? "DEMO CARD · CONNECTED"
                        : "YOUR EVERYDAY U CARD"}
                    </span>
                    <strong>U</strong>
                  </div>
                </div>
                <button
                  className="button primary"
                  onClick={() => open(account.signedIn ? "card" : "login")}
                >
                  <CreditCard size={17} />
                  {account.card ? "Manage linked card" : "Link U Card"}
                </button>
              </section>
              <div className="account-explainer">
                <ShieldCheck size={23} />
                <div>
                  <strong>A clear path from spending to ownership.</strong>
                  <p>
                    Google account → U Card purchases → Stock rewards → Withdraw
                    or swap.
                  </p>
                  <small>
                    This preview uses sample purchases and token balances. No
                    real card details are collected.
                  </small>
                </div>
              </div>
            </div>
          )}
          <footer>
            <span>
              <span className="footer-mark">✳</span> Little by little. Yours.
            </span>
            <small>
              Demo experience · Sample prices and tokenized assets · No real
              money moved
            </small>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <button
            className="icon-button close"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={20} />
          </button>
          {modal === "login" && (
            <>
              <span className="dialog-symbol">
                <Sparkles size={25} />
              </span>
              <div className="eyebrow">WELCOME TO STOCKBACK</div>
              <h2 id="dialog-title">
                Your everyday.
                <br />
                Your future.
              </h2>
              <p>
                Sign in once. Link your U Card. Let your next purchase start
                something.
              </p>
              <button className="button google full" disabled>
                <span className="google-g">G</span>Continue with Google
              </button>
              <p className="integration-note">
                Google sign-in is not connected in this preview.
              </p>
              <button
                className="button primary full"
                onClick={() => {
                  setAccount((a) => ({ ...a, signedIn: true }));
                  open(account.card ? null : "card");
                  setNotice(
                    "Demo account opened. Google authentication was not used.",
                  );
                }}
              >
                Explore with a demo account
                <ArrowRight size={17} />
              </button>
              <div className="dialog-foot">
                <ShieldCheck size={15} />
                No password or real card details needed.
              </div>
            </>
          )}
          {modal === "card" && (
            <>
              <span className="dialog-symbol">
                <CreditCard size={25} />
              </span>
              <div className="eyebrow">
                {account.card ? "YOUR CONNECTED CARD" : "ONE LAST STEP"}
              </div>
              <h2 id="dialog-title">
                {account.card
                  ? "Manage your U Card."
                  : "Meet your everyday card."}
              </h2>
              <p>
                {account.card
                  ? `Demo U Card ending in ${account.card}. Your sample purchase history stays in your account.`
                  : "Try the card-linking experience with a sample card. Your purchases and rewards will live together."}
              </p>
              {account.card ? (
                <>
                  <button
                    className="button primary full"
                    onClick={() => setModal(null)}
                  >
                    Done
                    <Check size={17} />
                  </button>
                  <button
                    className="text-button full"
                    onClick={() => {
                      setAccount((a) => ({ ...a, card: "" }));
                      setModal(null);
                      setNotice("Demo card unlinked.");
                    }}
                  >
                    Unlink demo card
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!/^\d{4}$/.test(card)) {
                      setError("Enter exactly four digits.");
                      return;
                    }
                    if (!consent) {
                      setError("Please confirm the demo card connection.");
                      return;
                    }
                    setAccount((a) => ({ ...a, card }));
                    setModal(null);
                    setNotice(
                      "Demo U Card linked. Explore your sample spending and rewards.",
                    );
                  }}
                >
                  <label className="field">
                    Demo card’s last 4 digits
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      required
                      placeholder="e.g. 4242"
                      value={card}
                      onChange={(e) =>
                        setCard(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    Connect this sample card to my demo account.
                  </label>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="button primary full">
                    Link demo U Card
                    <ArrowRight size={17} />
                  </button>
                </form>
              )}
              <div className="dialog-foot">
                <ShieldCheck size={15} />
                Never enter your full card number or CVV here.
              </div>
            </>
          )}
          {(modal === "Withdraw" || modal === "Swap") && (
            <>
              <div className="dialog-tabs">
                {(["Withdraw", "Swap"] as const).map((k) => (
                  <button
                    key={k}
                    className={modal === k ? "active" : ""}
                    onClick={() => open(k, stock)}
                  >
                    {k === "Withdraw" ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownUp size={17} />
                    )}{" "}
                    {k}
                  </button>
                ))}
              </div>
              <h2 id="dialog-title">
                {review
                  ? "Everything look right?"
                  : modal === "Withdraw"
                    ? "Make your next move."
                    : "A new shape for your stocks."}
              </h2>
              <p>
                {modal === "Withdraw"
                  ? "Send stock tokens to your Solana wallet."
                  : "Exchange your stock tokens for USDC."}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label className="field">
                  Asset
                  <select
                    value={stock}
                    disabled={review}
                    onChange={(e) => {
                      setStock(Number(e.target.value));
                      setAmount("");
                      setError("");
                    }}
                  >
                    {stocks.map((s, i) => (
                      <option key={s.symbol} value={i}>
                        {s.name} · {s.symbol}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="amount-field">
                  <label htmlFor="token-amount">
                    You {modal === "Swap" ? "pay" : "send"}
                  </label>
                  <div>
                    <input
                      id="token-amount"
                      aria-label="Token amount"
                      placeholder="0.00"
                      inputMode="decimal"
                      value={amount}
                      readOnly={review}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span>{stocks[stock].symbol}</span>
                  </div>
                  <div className="available">
                    <span>Available: {account.balances[stock].toFixed(6)}</span>
                    {!review && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          setAmount(String(account.balances[stock]))
                        }
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
                {modal === "Withdraw" ? (
                  <label className="field">
                    Recipient address · Solana
                    {review ? (
                      <span className="review-address">{address.trim()}</span>
                    ) : (
                      <input
                        required
                        placeholder="Enter a Solana wallet address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    )}
                  </label>
                ) : (
                  <div className="receive-box">
                    <span>You receive · estimated</span>
                    <strong>
                      {demoQuote(stock, Number(amount)).toFixed(6)}{" "}
                      <small>USDC</small>
                    </strong>
                  </div>
                )}
                <div className="review-lines">
                  <div>
                    <span>Network</span>
                    <strong>Solana · Demo</strong>
                  </div>
                  <div>
                    <span>
                      {modal === "Swap" ? "Exchange fee" : "Network fee"}
                    </span>
                    <strong>
                      {modal === "Swap"
                        ? "0.30% (included)"
                        : "0 SOL (simulation)"}
                    </strong>
                  </div>
                  {modal === "Swap" && (
                    <div>
                      <span>Sample rate</span>
                      <strong>
                        1 {stocks[stock].symbol} = {stocks[stock].price} USDC
                      </strong>
                    </div>
                  )}
                </div>
                <p className="integration-note">
                  Simulation only.{" "}
                  {modal === "Swap"
                    ? "Uses fixed sample prices, not a live quote."
                    : "No assets will be sent to this address."}
                </p>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button primary full">
                  {review
                    ? `Confirm demo ${modal === "Withdraw" ? "withdrawal" : "swap"}`
                    : `Review ${modal === "Withdraw" ? "withdrawal" : "swap"}`}
                  <ArrowRight size={17} />
                </button>
                {review && (
                  <button
                    type="button"
                    className="text-button full"
                    onClick={() => setReview(false)}
                  >
                    Back to edit
                  </button>
                )}
              </form>
            </>
          )}
          {modal === "purchase" && (
            <>
              <span className={`merchant-icon m-${selectedPurchase.stock}`}>
                {selectedPurchase.merchant[0]}
              </span>
              <h2 id="dialog-title">{selectedPurchase.merchant}</h2>
              <p>
                {selectedPurchase.date} · {selectedPurchase.id}
              </p>
              <div className="purchase-total">
                {money(selectedPurchase.amount)}
              </div>
              <div className="reward-detail">
                <Sparkles size={20} />
                <div>
                  <span>Stock reward · 2%</span>
                  <strong>
                    +{money(selectedPurchase.reward)} in{" "}
                    {stocks[selectedPurchase.stock].symbol}
                  </strong>
                </div>
              </div>
              <div className="review-lines">
                <div>
                  <span>Stock tokens</span>
                  <strong>
                    {(
                      selectedPurchase.reward /
                      stocks[selectedPurchase.stock].price
                    ).toFixed(6)}{" "}
                    {stocks[selectedPurchase.stock].symbol}
                  </strong>
                </div>
                <div>
                  <span>Reward status</span>
                  <strong>{selectedPurchase.status}</strong>
                </div>
                <div>
                  <span>Card</span>
                  <strong>U Card · Sample purchase</strong>
                </div>
              </div>
              <p className="integration-note">
                {selectedPurchase.status === "Pending"
                  ? "This sample reward is pending settlement and is not available to withdraw."
                  : "This sample reward is settled. Token quantities use illustrative prices."}
              </p>
              <button
                className="button primary full"
                onClick={() => setModal(null)}
              >
                Done
                <Check size={17} />
              </button>
            </>
          )}
        </div>
      </dialog>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
