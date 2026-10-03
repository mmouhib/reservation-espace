import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  // Static export served by Firebase Hosting: no app server.
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@reservation/shared"],
  reactStrictMode: true,
  poweredByHeader: false,
};

// A new revision per build so that the offline fallback is refreshed with each deploy.
const revision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Registered manually in PwaProvider so we can drive the "new version" toast.
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  additionalPrecacheEntries: [
    { url: "/offline", revision },
    { url: "/manifest.webmanifest", revision },
  ],
});

// Serwist hooks into webpack, so it is applied to production builds (`next build --webpack`)
// only. The dev server keeps Turbopack and runs without a service worker.
export default function config(phase: string): NextConfig {
  return phase === PHASE_DEVELOPMENT_SERVER ? nextConfig : withSerwist(nextConfig);
}
