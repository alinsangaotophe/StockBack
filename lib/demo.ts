export type Product = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  reward: number;
  category: string;
  art: "fold" | "shoe" | "charger" | "coffee";
  color: string;
  company: string;
  ticker: string;
  preview: boolean;
  description: string;
  source: string;
  availability: string;
};
export const products: Product[] = [
  {
    id: "duo",
    name: "iPhone Duo",
    subtitle: "Open up to something more.",
    price: 1999,
    reward: 100,
    category: "Technology",
    art: "fold",
    color: "Night sky · 256GB",
    company: "Apple",
    ticker: "AAPL",
    preview: false,
    description:
      "A new perspective on your everyday. Pair your next upgrade with a $100 investment reward from StockBack.",
    source: "https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/",
    availability: "Announced · Available October 23",
  },
  {
    id: "nike",
    name: "Pegasus 42",
    subtitle: "Every mile, a little further.",
    price: 150,
    reward: 7.5,
    category: "Movement",
    art: "shoe",
    color: "Ivory / Volt · Illustration",
    company: "Nike",
    ticker: "NKE",
    preview: false,
    description:
      "The shoes you reach for, again and again. This demo pairs your next run with a Nike token reward.",
    source: "https://www.nike.com/w/pegasus-running-shoes-37v7jz8nexhzy7ok",
    availability: "Available in the demo",
  },
  {
    id: "tesla",
    name: "Wall Connector",
    subtitle: "Charge at home. Think ahead.",
    price: 450,
    reward: 22.5,
    category: "Home & energy",
    art: "charger",
    color: "White · NACS home charger",
    company: "Tesla",
    ticker: "TSLA",
    preview: false,
    description:
      "A daily ritual, powered at home. Pair your charging upgrade with a Tesla token reward.",
    source: "https://shop.tesla.com/product/wall-connector",
    availability: "Available in the demo",
  },
  {
    id: "coffee",
    name: "Your daily coffee",
    subtitle: "Small rituals. Growing possibilities.",
    price: 6,
    reward: 0.3,
    category: "Daily rituals",
    art: "coffee",
    color: "Your usual, made warm",
    company: "Starbucks",
    ticker: "SBUX",
    preview: false,
    description:
      "A familiar stop on your way. Each demo coffee earns a small Starbucks token reward, ready to claim on Solana Devnet.",
    source: "https://www.starbucks.com/menu",
    availability: "Available in the demo",
  },
];
// Keep historical preview receipts readable when the curated collection changes.
const archivedProducts = [
  { id: "phone", name: "iPhone" },
  { id: "audio", name: "AirPods Pro" },
  { id: "laptop", name: "MacBook Air" },
];
export const findProduct = (id: string) =>
  products.find((p) => p.id === id) ??
  archivedProducts.find((p) => p.id === id) ?? {
    id,
    name: "Previous collection item",
  };
export type Order = {
  assetSymbol?: import("./assets").AssetSymbol;
  mint?: string;
  tokenAmount?: string;
  onchain?: boolean;
  fundingStarted?: boolean;
  rewardAddress?: string;
  allocationSignature?: string;
  claimSignature?: string;
  id: string;
  productId: string;
  amount: number;
  reward: number;
  date: string;
  status: "pending" | "ready" | "claimed" | "refunded";
  destination: string;
};
export type DemoState = {
  active: boolean;
  frozen: boolean;
  balance: number;
  orders: Order[];
};
export const initial: DemoState = {
  active: false,
  frozen: false,
  balance: 3000,
  orders: [],
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
