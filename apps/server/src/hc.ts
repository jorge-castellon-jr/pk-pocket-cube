import { hc } from "hono/client";
import app from "./app";

// assign the client to a variable to calculate the type when compiling
const client = hc<typeof app>("");
export type Client = typeof client;
export type AppType = typeof app;
