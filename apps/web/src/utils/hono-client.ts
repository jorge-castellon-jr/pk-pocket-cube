// Please serve/build the server first to get the types
import { type AppType, type Client } from "@repo/server/hc";
import { hc } from "hono/client";

const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);

const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8787";

export const client = hcWithType(baseUrl, {
  init: { credentials: "include" },
});
