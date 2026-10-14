import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commonplace — Your personal link library",
  description: "Keep good reads, bright ideas, and things worth coming back to. Save links and notes, capture page text, and discover shared topics.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
