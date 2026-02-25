import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transak Article Freshness Tracker",
  description: "Track and manage Transak blog article freshness",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0e1a] text-gray-100 min-h-screen antialiased">{children}</body>
    </html>
  );
}
