import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Ornate Solar · Krishna Box",
  description: "Real-time IoT device monitoring for Ornate Solar",
  icons: { icon: "/favicon.png", shortcut: "/favicon.png", apple: "/favicon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="ambient-bg min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
