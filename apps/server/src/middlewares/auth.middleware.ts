import { createMiddleware } from "hono/factory";

import { HTTPException } from "hono/http-exception";
import type { HonoAppContext } from "../auth.ts";

export const withAuth = createMiddleware<HonoAppContext<"IsAuthenticated">>(
  async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new HTTPException(401, { message: "Please login" });
    }

    await next();
  }
);

export const withoutAuth = createMiddleware<
  HonoAppContext<"IsNotAuthenticated">
>(async (c, next) => {
  const user = c.get("user");

  if (user) {
    throw new HTTPException(400, {
      message: "Only non-authenticated users can access this route",
    });
  }

  await next();
});
