import { zValidator } from "@hono/zod-validator";
import { createNotesSchema } from "@repo/validators";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { z } from "zod";
import { type HonoAppContext } from "../auth";
import * as schema from "../db/schema";
import { withAuth } from "../middlewares/auth.middleware";

export const notes = new Hono<HonoAppContext>()
  .get("/", async (c) => {
    // By default if there is no withAuth middleware passed, the user can either be null or defined
    const user = c.var.user;

    const db = c.var.db;
    let notes = (
      await db.query.note.findMany({
        columns: {
          content: true,
          createdAt: true,
          title: true,
          id: true,
        },
        limit: 10,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [desc(schema.note.createdAt)],
      })
    ).map(({ user: creator, ...note }) => ({
      ...note,
      isOwner: creator.id === user?.id,
      creatorName: creator.name,
    }));

    // We always set the status to ensure that type inferences are correct on the client side
    return c.json(notes, 200);
  })
  .post("/", zValidator("json", createNotesSchema), withAuth, async (c) => {
    // However here since we have withAuth middleware, the user is always garaunteed to be defined
    const user = c.var.user;

    const { title, content } = await c.req.valid("json");

    if (title === "error" && content === "error") {
      // This is how you would ideally want to throw an error in a route
      // The shape of the error is up to you and will get inferred by the client's useMutation hook
      return c.json(
        { message: "Sample Error", forField: "content" } as {
          message: string;
          forField: keyof z.infer<typeof createNotesSchema>;
        },
        400
      );
    }

    const db = c.var.db;
    const note = await db
      .insert(schema.note)
      .values({
        title,
        content,
        userId: user.id,
      })
      .returning();

    return c.json(note, 200);
  })
  .get("/:id", async (c) => {
    const { id } = c.req.param();
    const db = c.var.db;

    const note = await db.query.note.findFirst({
      where: eq(schema.note.id, Number(id)),
    });

    return c.json(note, 200);
  });
