import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean
} from "drizzle-orm/pg-core";

export const updates = pgTable("updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  why_it_matters: text("why_it_matters").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  impact_score: integer("impact_score").notNull().default(0),
  source_url: text("source_url").notNull(),
  published: boolean("published").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  streak: integer("streak").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const likes = pgTable("likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id)
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;

