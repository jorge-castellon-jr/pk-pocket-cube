import { Hono } from "hono";

import { cors } from "hono/cors";
import type { Env } from "./env-types";
import { getAuth, type HonoAppContext } from "./auth";
import { getDb } from "./db/index";
import { notes } from "./routes/notes";

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
      origin: (_, c) => c.env.WEB_URL,
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
  .route("/notes", notes);

export default app;

export type AppType = typeof app;
