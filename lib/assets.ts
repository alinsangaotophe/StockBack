// Fixed demo conversion rates, never live stock prices. All mints are Devnet SPL tokens.
export const assets = {
  AAPL: {
    symbol: "AAPL",
    company: "Apple",
    price: 200,
    mint: "Ep5T5o9LEpx9A4Nz6YYNAQeaeVBW718XycbVfEPYBKdb",
  },
  NKE: {
    symbol: "NKE",
    company: "Nike",
    price: 100,
    mint: "9FZ2m8daWKbWXA7mH5f2RLmz2aPxq7nPEQ4nZqjYAZ1b",
  },
  TSLA: {
    symbol: "TSLA",
    company: "Tesla",
    price: 300,
    mint: "8AacDWxAy1ckoX8fMJi5w2gB3A4KC6bxSf8EmrLHTq5G",
  },
  SBUX: {
    symbol: "SBUX",
    company: "Starbucks",
    price: 100,
    mint: "3PKCekCs4o11p89oWinrzP2LeV4xuemKPyKfGyJ41rjX",
  },
} as const;
export type AssetSymbol = keyof typeof assets;
export function productAsset(productId: string) {
  const symbol: AssetSymbol =
    productId === "nike"
      ? "NKE"
      : productId === "tesla"
        ? "TSLA"
        : productId === "coffee"
          ? "SBUX"
          : "AAPL";
  return assets[symbol];
}
export function orderAsset(order: { productId: string; assetSymbol?: AssetSymbol }) {
  return assets[order.assetSymbol || productAsset(order.productId).symbol];
}
