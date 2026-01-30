import { relations } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import * as authSchema from "./auth-schema";

export * from "./auth-schema";

export const note = sqliteTable("note", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  userId: text("user_id")
    .notNull()
    .references(() => authSchema.user.id),
});

export const usersRelations = relations(authSchema.user, ({ many }) => ({
  notes: many(note),
}));

export const notesRelations = relations(note, ({ one }) => ({
  user: one(authSchema.user, {
    fields: [note.userId],
    references: [authSchema.user.id],
  }),
}));
