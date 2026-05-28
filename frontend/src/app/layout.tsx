import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AsetLink — Sistem Pelaporan Fasilitas",
  description:
    "Platform digital pelaporan kerusakan fasilitas kampus ITATS. Laporkan kerusakan dengan mudah melalui scan QR Code.",
  keywords: ["pelaporan", "fasilitas", "kampus", "ITATS", "maintenance", "asset management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
