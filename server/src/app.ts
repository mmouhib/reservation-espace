import { existsSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { hasRole, isRole } from "@reservation/shared";
import { auth } from "./lib/admin";
import { buildFeed } from "./calendar/feed";
import { handleStripeWebhook, stripeWebhookEnabled } from "./credits/payments";
import type { Caller, Endpoint } from "./lib/callable";
import { CORS_ORIGINS, WEB_DIR } from "./lib/config";
import { AppError, appError } from "./lib/errors";
import { logger } from "./lib/logger";
import { MAX_PHOTO_BYTES, openPhoto, PHOTO_TYPES, savePhoto } from "./lib/photos";
import { enforceRateLimit } from "./lib/rateLimit";

/** The person behind the `Authorization: Bearer <Firebase ID token>` header, or null when there is none or it is invalid. */
async function callerOf(req: Request): Promise<Caller | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const token = await auth.verifyIdToken(header.slice("Bearer ".length));
    return { uid: token.uid, token };
  } catch (err) {
    // Expired, malformed, or from another Firebase project: the person is told to sign in again, the log says why.
    logger.warn("ID token refused", { code: (err as { code?: string }).code, reason: err instanceof Error ? err.message.slice(0, 160) : undefined });
    return null;
  }
}

function errorBody(err: unknown): { status: number; body: { error: Record<string, unknown> } } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: { code: err.code, reason: err.reason, message: err.message, ...err.extra } } };
  }
  logger.error("Unhandled error", { err });
  // The database could not be reached: say so (the app shows "service unavailable"), and the client may retry.
  if (err instanceof Error && /^Mongo(Network|ServerSelection)/.test(err.name)) {
    return { status: 503, body: { error: { code: "unavailable", message: "The database is unreachable." } } };
  }
  return { status: 500, body: { error: { code: "internal", message: "Internal error." } } };
}

function webDir(): string {
  // dist/index.js sits in server/dist: the built web app is in apps/web/out next to it.
  return WEB_DIR() ? resolve(WEB_DIR()) : resolve(__dirname, "../../apps/web/out");
}

/** Cache rules for the static files: the service worker is never cached, hashed files for a year. */
function staticHeaders(res: Response, path: string): void {
  if (path.endsWith("/sw.js")) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Service-Worker-Allowed", "/");
  } else if (path.includes("/_next/static/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (path.includes("/icons/")) {
    res.setHeader("Cache-Control", "public, max-age=604800");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }
}

export function createApp(endpoints: Map<string, Endpoint>) {
  const app = express();
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), geolocation=()");
    next();
  });

  // The web app is normally served by this server (same address, no CORS). `next dev` runs elsewhere.
  const allowedOrigins = CORS_ORIGINS()
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ---------- Photos of incidents (stored in MongoDB) ----------

  app.post("/api/uploads/photos", express.raw({ type: () => true, limit: MAX_PHOTO_BYTES }), async (req, res) => {
    const caller = await callerOf(req);
    if (!caller) throw appError("unauthenticated", "authRequired", "Authentication required.");
    const role = isRole(caller.token.role) ? caller.token.role : null;
    if (!role || !hasRole(role, "user")) throw appError("permission-denied", "forbidden", "Missing required role.");
    await enforceRateLimit(caller.uid, "uploadPhoto", { limit: 20, windowSec: 60 });

    const contentType = (String(req.headers["content-type"] ?? "").split(";")[0] ?? "").trim().toLowerCase();
    if (!PHOTO_TYPES.includes(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw appError("invalid-argument", "invalidInput", "Send one image (JPEG, PNG, WebP, GIF or HEIC) of at most 5 MB.");
    }
    res.json({ data: { photoId: await savePhoto(caller.uid, contentType, req.body) } });
  });

  app.get("/api/uploads/photos/:id", async (req, res) => {
    const caller = await callerOf(req);
    if (!caller) throw appError("unauthenticated", "authRequired", "Authentication required.");
    const photo = await openPhoto(String(req.params.id));
    // Only the person who took the photo and the administrators may see it.
    if (!photo || (photo.metadata.ownerId !== caller.uid && caller.token.role !== "admin")) {
      throw appError("not-found", "invalidInput", "Photo not found.");
    }
    res.setHeader("Content-Type", photo.metadata.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    photo.stream.on("error", () => res.destroy()).pipe(res);
  });

  // ---------- Calendar feed (read by calendar apps, which cannot sign in: the token in the link is the secret) ----------

  app.get("/api/calendar/:file", async (req, res) => {
    const file = String(req.params.file);
    const feed = await buildFeed(file.endsWith(".ics") ? file.slice(0, -4) : file);
    if (feed === null) {
      res.sendStatus(404);
      return;
    }
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="reservations.ics"');
    res.setHeader("Cache-Control", "private, max-age=600");
    res.send(feed);
  });

  // ---------- Stripe webhook (signed by Stripe, so no sign-in token) ----------

  app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    if (!stripeWebhookEnabled()) {
      res.sendStatus(404);
      return;
    }
    res.sendStatus(await handleStripeWebhook(req.body as Buffer, req.headers["stripe-signature"]?.toString()));
  });

  // ---------- Endpoints: POST /api/<name> with the input as JSON ----------

  app.post("/api/:name", express.json({ limit: "100kb" }), async (req, res) => {
    const endpoint = endpoints.get(String(req.params.name));
    if (!endpoint) {
      res.status(404).json({ error: { code: "not-found", message: "Unknown endpoint." } });
      return;
    }
    const caller = await callerOf(req);

    let streaming = false;
    const send = (chunk: string) => {
      if (!streaming) {
        streaming = true;
        res.status(200).setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.flushHeaders();
      }
      res.write(`${JSON.stringify({ chunk })}\n`);
    };

    try {
      const data = await endpoint.invoke(caller, req.body, send);
      if (streaming) res.end(`${JSON.stringify({ data })}\n`);
      else res.json({ data });
    } catch (err) {
      const { status, body } = errorBody(err);
      if (streaming) res.end(`${JSON.stringify(body)}\n`);
      else res.status(status).json(body);
    }
  });

  // ---------- The web app (static export) ----------

  const dir = webDir();
  if (existsSync(dir)) {
    // "Clean URLs": /reserver is served from reserver.html, with or without a trailing slash.
    // (A page that also has a folder of the same name would otherwise be redirected to the folder.)
    app.use((req, _res, next) => {
      const page = req.path.replace(/\/+$/, "");
      if (page && !extname(page) && existsSync(resolve(dir, `.${page}.html`)) && resolve(dir, `.${page}.html`).startsWith(dir + sep)) {
        req.url = `${page}.html${req.url.slice(req.path.length)}`;
      }
      next();
    });
    app.use(express.static(dir, { redirect: false, setHeaders: (res, path) => staticHeaders(res, path.replaceAll("\\", "/")) }));
    app.use((req, res) => {
      const notFound = resolve(dir, "404.html");
      res.status(404);
      if (req.method === "GET" && existsSync(notFound)) res.sendFile(notFound);
      else res.end();
    });
  } else {
    logger.warn("The web app is not built: only the API is served", { dir });
  }

  // Invalid JSON, a body that is too large, and anything thrown by the routes above.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 413) {
      res.status(status).json({ error: { code: "invalid-argument", reason: "invalidInput", message: "Invalid request." } });
      return;
    }
    const { status: code, body } = errorBody(err);
    res.status(code).json(body);
  });

  return app;
}
