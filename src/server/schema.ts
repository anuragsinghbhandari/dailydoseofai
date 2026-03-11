import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  index
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
  is_must_read: boolean("is_must_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role").default("user"),
  streak: integer("streak").notNull().default(0),
  last_active_date: timestamp("last_active_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const session = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id)
});

export const account = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const likes = pgTable("likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id)
}, (table) => {
  return {
    userIdIdx: index("like_user_idx").on(table.user_id)
  };
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
}, (table) => {
  return {
    userIdIdx: index("bookmark_user_idx").on(table.user_id)
  };
});

export const user_views = pgTable("user_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id),
  update_id: uuid("update_id")
    .notNull()
    .references(() => updates.id),
  viewed_at: timestamp("viewed_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export type Update = typeof updates.$inferSelect;
export type NewUpdate = typeof updates.$inferInsert;
