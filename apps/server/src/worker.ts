import app from "./app";
import type { Env } from "./env-types";

export type { Env } from "./env-types";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env);
  },
};
