import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const draftPoolPick = sqliteTable("draft_pool_pick", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const draftPoolExclusion = sqliteTable("draft_pool_exclusion", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull(),
  scope: text("scope", { enum: ["evolution", "shop", "both"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const draftPoolEditor = sqliteTable("draft_pool_editor", {
  id: text("id").primaryKey(),
  discordAccountId: text("discord_account_id").notNull().unique(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
