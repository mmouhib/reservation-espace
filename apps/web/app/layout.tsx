import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "@reservation/shared";
import { APP } from "@/lib/app";
import { Providers } from "./providers";
import "./globals.css";

// next/font self-hosts the font files, so they are served from our origin and cached by the SW.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  applicationName: APP.name,
  // No `title`: pages render a translated <title> (components/i18n/DocumentTitle).
  description: APP.description,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP.shortName },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: APP.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `lang` is updated at runtime by I18nProvider.
    <html lang={DEFAULT_LOCALE} dir="ltr" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
