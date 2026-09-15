import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "StockBack — Turn everyday spending into everyday ownership.",
  description:
    "Shop your favorite brands. Earn their stock on chain. Build your portfolio with every purchase.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
