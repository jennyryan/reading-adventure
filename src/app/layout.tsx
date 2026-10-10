import type { Metadata, Viewport } from "next";
import { Fredoka, Pacifico } from "next/font/google";
import "./globals.css";

// next/font downloads these at build time and serves them from our own
// domain, so visitors never make a request to Google.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", variable: "--font-pacifico" });

export const metadata: Metadata = {
  title: "Norah's Reading Adventure",
  description: "Every book Norah has read, with her star ratings.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6a9c8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${pacifico.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
