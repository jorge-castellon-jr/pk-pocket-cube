import { Hono } from "hono";

import { cors } from "hono/cors";
import type { Env } from "./env-types";
import { getAuth, type HonoAppContext } from "./auth";
import { getDb } from "./db/index";
import { tcgPocket } from "./routes/tcg-pocket";

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
          ].filter(Boolean)
        );
        return origin && allowed.has(origin) ? origin : allowed.values().next().value;
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    })
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
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    return c.var.auth.handler(c.req.raw);
  })
  .get("/", (c) => c.json({ message: "Hello World" }))
  .route("/tcg-pocket", tcgPocket);

export default app;

export type AppType = typeof app;
