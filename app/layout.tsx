import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transak Article Freshness Tracker",
  description: "Track and manage Transak blog article freshness",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f0f4ff] text-gray-900 min-h-screen antialiased">{children}</body>
    </html>
  );
}
