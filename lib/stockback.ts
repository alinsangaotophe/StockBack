export const stocks = [
  {
    symbol: "AAPLx",
    name: "Apple",
    mark: "A",
    color: "#eceeea",
    price: 230,
    units: 1.2,
  },
  {
    symbol: "NVDAX",
    name: "NVIDIA",
    mark: "N",
    color: "#e7efcd",
    price: 125,
    units: 1.6,
  },
  {
    symbol: "TSLAx",
    name: "Tesla",
    mark: "T",
    color: "#f7e4df",
    price: 250,
    units: 0.48,
  },
  {
    symbol: "SBUXx",
    name: "Starbucks",
    mark: "S",
    color: "#e0eae2",
    price: 95,
    units: 0.6,
  },
] as const;
export const purchases = [
  {
    id: "SB-1086",
    merchant: "Apple Store",
    category: "Electronics",
    date: "2026-09-14",
    amount: 1299,
    reward: 25.98,
    stock: 0,
    status: "Settled",
  },
  {
    id: "SB-1085",
    merchant: "Starbucks",
    category: "Food & drinks",
    date: "2026-09-14",
    amount: 12.5,
    reward: 0.25,
    stock: 3,
    status: "Pending",
  },
  {
    id: "SB-1084",
    merchant: "Whole Foods",
    category: "Groceries",
    date: "2026-09-13",
    amount: 86.4,
    reward: 1.73,
    stock: 1,
    status: "Settled",
  },
  {
    id: "SB-1083",
    merchant: "Nike",
    category: "Shopping",
    date: "2026-09-12",
    amount: 145,
    reward: 2.9,
    stock: 2,
    status: "Settled",
  },
  {
    id: "SB-1082",
    merchant: "Blue Bottle",
    category: "Food & drinks",
    date: "2026-09-11",
    amount: 18,
    reward: 0.36,
    stock: 3,
    status: "Settled",
  },
  {
    id: "SB-1081",
    merchant: "Amazon",
    category: "Shopping",
    date: "2026-08-29",
    amount: 64.9,
    reward: 1.3,
    stock: 0,
    status: "Settled",
  },
];
export type Movement = {
  id: string;
  kind: "Withdraw" | "Swap";
  symbol: string;
  amount: number;
  received: number;
  address: string;
  date: string;
};
export type Account = {
  signedIn: boolean;
  card: string;
  balances: number[];
  usdc: number;
  movements: Movement[];
};
export const freshAccount = (): Account => ({
  signedIn: false,
  card: "",
  balances: stocks.map((s) => s.units),
  usdc: 0,
  movements: [],
});
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export function applyMovement(
  account: Account,
  index: number,
  amount: number,
  kind: Movement["kind"],
  address: string,
): Account {
  if (!account.signedIn) throw new Error("Sign in first.");
  if (!Number.isInteger(index) || !stocks[index])
    throw new Error("Select a supported stock.");
  if (kind !== "Withdraw" && kind !== "Swap")
    throw new Error("Select a supported action.");
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > account.balances[index]
  )
    throw new Error("Enter an amount within your available balance.");
  if (Math.abs(amount * 1e6 - Math.round(amount * 1e6)) > 1e-6)
    throw new Error("Use up to 6 decimal places.");
  const received = kind === "Swap" ? demoQuote(index, amount) : amount;
  if (received <= 0) throw new Error("Amount is too small.");
  return {
    ...account,
    balances: account.balances.map((v, i) =>
      i === index ? Math.round((v - amount) * 1e6) / 1e6 : v,
    ),
    usdc:
      Math.round((account.usdc + (kind === "Swap" ? received : 0)) * 1e6) / 1e6,
    movements: [
      {
        id: crypto.randomUUID(),
        kind,
        symbol: stocks[index].symbol,
        amount,
        received,
        address,
        date: new Date().toISOString(),
      },
      ...account.movements,
    ],
  };
}

export function demoQuote(index: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !stocks[index]) return 0;
  return (
    Math.floor((Math.round(amount * 1e6) * stocks[index].price * 997) / 1000) /
    1e6
  );
}
