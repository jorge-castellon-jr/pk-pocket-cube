import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Single row: JSON value for cache status (phase, setIds, setIndex, cardIds, cardIndex, lastError, updatedAt). */
export const tcgpCacheMeta = sqliteTable("tcgp_cache_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** Cached set from TCGdex; data is full set JSON including cards[].id for building card list. */
export const tcgpSet = sqliteTable("tcgp_set", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** Cached card from TCGdex; data is full card JSON (includes rarity, etc.). */
export const tcgpCard = sqliteTable("tcgp_card", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
