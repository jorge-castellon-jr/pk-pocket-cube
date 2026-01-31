import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "./env-types";
import { getDb } from "./db/index";
import * as schema from "./db/schema";

export function getAuth(env: Env) {
  const db = getDb(env.DB);
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        redirectURI: `${env.VITE_SERVER_URL}/api/auth/callback/discord`,
      },
    },
    trustedOrigins: [
      env.WEB_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://pocket.castellon.dev",
    ].filter(Boolean),
  });
}

type Auth = ReturnType<typeof getAuth>;

type AuthStatus =
  | "IsAuthenticated"
  | "IsNotAuthenticated"
  | "IsMaybeAuthenticated";

/**
 * Represents the authentication status of an application's routes.
 * This type is used to enforce type safety for route authentication requirements.
 *
 * @typedef {string} AuthStatus
 * @property {"IsAuthenticated"} IsAuthenticated - All routes require authentication
 * @property {"IsNotAuthenticated"} IsNotAuthenticated - No routes require authentication
 * @property {"IsMaybeAuthenticated"} IsMaybeAuthenticated - Some routes may require authentication
 *
 * @example
 * // All routes require auth
 * const app = new Hono<HonoAppContext<"IsAuthenticated">>();
 *
 * // Some routes may require auth (default)
 * const app = new Hono<HonoAppContext<"IsMaybeAuthenticated">>();
 *
 * // No routes require auth
 * const app = new Hono<HonoAppContext<"IsNotAuthenticated">>();
 */
export type HonoAppContext<
  Authenticated extends AuthStatus = "IsMaybeAuthenticated",
> = {
  Variables: {
    user: Authenticated extends "IsAuthenticated"
      ? Auth["$Infer"]["Session"]["user"]
      : Authenticated extends "IsNotAuthenticated"
        ? null
        : Auth["$Infer"]["Session"]["user"] | null;
    session: Authenticated extends "IsAuthenticated"
      ? Auth["$Infer"]["Session"]["session"]
      : Authenticated extends "IsNotAuthenticated"
        ? null
        : Auth["$Infer"]["Session"]["session"] | null;
    db: ReturnType<typeof getDb>;
    auth: Auth;
  };
};
