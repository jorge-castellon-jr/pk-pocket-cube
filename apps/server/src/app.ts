import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import type { Env } from "./env-types";
import { getAuth, type HonoAppContext } from "./auth";
import { getDb } from "./db/index";
import { logger } from "./lib/logger";
import { tcgPocket } from "./routes/tcg-pocket";
import { draftPool } from "./routes/draft-pool";

const app = new Hono<HonoAppContext & { Bindings: Env }>()
  // ------------------------------------------------------------
  // Bindings: set db and auth from env
  // ------------------------------------------------------------
  .use("*", async (c, next) => {
    c.set("db", getDb(c.env.DB));
    c.set("auth", getAuth(c.env));
    return next();
  })
  // ------------------------------------------------------------
  // CORS
  // ------------------------------------------------------------
  .use(
    "*",
    cors({
      origin: (origin, c) => {
        const allowed = new Set(
          [
            c.env.WEB_URL,
            "http://localhost:5173",
            "http://localhost:5174",
            "https://pocket.castellon.dev",
          ].filter(Boolean),
        );
        return origin && allowed.has(origin)
          ? origin
          : allowed.values().next().value;
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "PUT", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  )
  // ------------------------------------------------------------
  // AUTH
  // ------------------------------------------------------------
  .use("*", async (c, next) => {
    const session = await c.var.auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      c.set("user", null);
      c.set("session", null);
      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  })
  // ------------------------------------------------------------
  // REQUEST LOGGING (for prod debugging; no cookies/tokens)
  // ------------------------------------------------------------
  .use("*", async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = new URL(c.req.url).pathname;
    const origin = c.req.header("Origin") ?? null;
    const hasSession = c.var.user != null;

    const logData: Record<string, unknown> = {
      method,
      path,
      origin,
      hasSession,
    };
    if (path === "/api/auth/get-session") {
      const cookie = c.req.header("Cookie");
      logData.hasCookieHeader = (cookie?.length ?? 0) > 0;
    }
    logger.info("request", logData);

    await next();

    const status = c.res.status;
    const durationMs = Date.now() - start;
    logger.info("response", { method, path, status, durationMs });
  })
  .on(["POST", "GET"], "/api/auth/*", async (c) => {
    const path = new URL(c.req.url).pathname;
    logger.info("auth_handler", { path });
    const res = await c.var.auth.handler(c.req.raw);
    if (path.includes("/callback/")) {
      const setCookieHeader = res.headers.get("set-cookie");
      logger.info("auth_callback_response", {
        path,
        status: res.status,
        hasSetCookie: !!setCookieHeader,
      });
    }
    return res;
  })
  .get("/", (c) => c.json({ message: "Hello World" }))
  .route("/tcg-pocket", tcgPocket)
  .route("/draft-pool", draftPool)
  .onError((err, c) => {
    const path = new URL(c.req.url).pathname;
    logger.error("request_error", {
      path,
      method: c.req.method,
      message: err.message,
    });
    const status =
      err instanceof HTTPException ? err.status : 500;
    const message =
      typeof err.message === "string" ? err.message : "Internal Server Error";
    const origin = c.req.header("Origin") ?? "";
    const allowed = [
      c.env.WEB_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "https://pocket.castellon.dev",
    ].filter((v): v is string => typeof v === "string" && v.length > 0);
    const allowOrigin =
      origin && allowed.includes(origin) ? origin : allowed[0] ?? "*";
    const res = c.json({ message }, status);
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res;
  });

export default app;

export type AppType = typeof app;
