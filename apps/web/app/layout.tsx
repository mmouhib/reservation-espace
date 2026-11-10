import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "@reservation/shared";
import { APP } from "@/lib/app";
import { Providers } from "./providers";
import "./globals.css";

// next/font self-hosts the font files, so they are served from our origin and cached by the SW.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Inter has no Arabic letters: the Tunisian Arabic language uses this font (see globals.css).
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });

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

// Runs before the first paint, so a dark page never flashes white. ThemeProvider takes over afterwards.
const THEME_SCRIPT = `try{var m=localStorage.getItem("theme");var d=m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;

export const viewport: Viewport = {
  themeColor: APP.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `lang` is updated at runtime by I18nProvider.
    <html lang={DEFAULT_LOCALE} dir="ltr" className={`${inter.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
