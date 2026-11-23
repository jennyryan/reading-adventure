import type { Metadata, Viewport } from "next";
import { Cherry_Swash, Fredoka } from "next/font/google";
import "./globals.css";

// next/font downloads these at build time and serves them from our own
// domain, so visitors never make a request to Google.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
// Only the bold weight is used, so only it is downloaded.
const cherrySwash = Cherry_Swash({ subsets: ["latin"], weight: "700", variable: "--font-cherry-swash" });

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
    <html lang="en" className={`${fredoka.variable} ${cherrySwash.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
