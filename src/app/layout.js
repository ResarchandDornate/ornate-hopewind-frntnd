import { Geist, Geist_Mono } from "next/font/google";

import Providers from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
    // The pre-paint script writes class="dark" onto this element, so the
    // server markup and the hydrated markup legitimately differ here.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* A blocking inline script in <head> is the only thing that runs
            before first paint, which is what a themed app needs: anything
            deferred (next/script beforeInteractive included, which queues into
            Next's bootstrap) paints white first and then corrects itself.

            React logs "scripts inside React components are never executed when
            rendering on the client" for this in dev. That is accurate and not
            a problem: the tag ships in the SSR'd HTML and runs there, and it
            must NOT run again on a client render. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="ambient-bg min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
