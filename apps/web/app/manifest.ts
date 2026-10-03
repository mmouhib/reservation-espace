import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, MESSAGES } from "@reservation/shared";
import { APP } from "@/lib/app";

export const dynamic = "force-static";

// A static manifest has a single language: the default one.
export default function manifest(): MetadataRoute.Manifest {
  const { nav, reserve } = MESSAGES[DEFAULT_LOCALE];
  return {
    id: "/",
    name: APP.name,
    short_name: APP.shortName,
    description: APP.description,
    lang: DEFAULT_LOCALE,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: APP.themeColor,
    background_color: APP.backgroundColor,
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: reserve.title, short_name: nav.reserve, url: "/reserver" },
      { name: nav.myBookings, short_name: nav.myBookings, url: "/mes-reservations" },
    ],
  };
}
