import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FeedForward — Turn Surplus Into Support",
  description:
    "Connect restaurants with NGOs. Reduce food waste. Feed communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
