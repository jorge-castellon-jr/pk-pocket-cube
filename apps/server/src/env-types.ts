import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  WEB_URL: string;
  VITE_SERVER_URL: string;
}
