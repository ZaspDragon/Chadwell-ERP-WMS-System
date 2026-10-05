import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chadwell WMS",
  description: "Receiving, inventory, putaway and order picking",
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
