import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Covers are fetched by our server and re-served from our domain, so
    // visitors' browsers never contact Open Library or Google directly.
    // Only these paths are allowed. (Open Library redirects to archive.org; Next follows
    // up to 3 redirects by default.)
    remotePatterns: [
      new URL("https://covers.openlibrary.org/b/**"),
      // Google Books cover thumbnails (query string varies by book).
      { protocol: "https", hostname: "books.google.com", pathname: "/books/content" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Keep a kid's reading log out of search engines.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
