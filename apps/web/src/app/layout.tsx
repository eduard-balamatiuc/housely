import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Housely — Location Intelligence for Chișinău",
  description:
    "Find the best neighborhood for your next apartment in Chișinău. Livability scores, heatmaps, and detailed category breakdowns.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
