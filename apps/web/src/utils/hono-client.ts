// Please serve/build the server first to get the types
import { type AppType, type Client } from "@repo/server/hc";
import { hc } from "hono/client";

const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);

export const client = hcWithType(import.meta.env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});
