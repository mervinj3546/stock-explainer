import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, real, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // Make optional for OAuth users
  firstName: text("first_name"),
  lastName: text("last_name"),
  profilePicture: text("profile_picture"), // For OAuth profile images
  provider: text("provider"), // 'local', 'google', 'facebook', 'microsoft'
  providerId: text("provider_id"), // OAuth provider's user ID
  emailVerified: timestamp("email_verified"), // For OAuth users, auto-verified
  tier: text("tier").default("free"), // 'free', 'premium', 'admin'
  tickersUsed: integer("tickers_used").default(0), // Count of unique tickers searched
  usageResetDate: date("usage_reset_date"), // For premium users daily reset
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickers = pgTable("tickers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  change: real("change").notNull(),
  changePercent: real("change_percent").notNull(),
  volume: real("volume"),
  marketCap: real("market_cap"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userWatchlists = pgTable("user_watchlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tickerSymbol: text("ticker_symbol").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const userSearchHistory = pgTable("user_search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tickerSymbol: text("ticker_symbol").notNull(),
  searchedAt: timestamp("searched_at").defaultNow(),
});

export const userTickerUsage = pgTable("user_ticker_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tickerSymbol: text("ticker_symbol").notNull(),
  firstSearched: timestamp("first_searched").defaultNow(),
  searchCount: integer("search_count").default(1),
});

export const tickerData = pgTable("ticker_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tickerSymbol: text("ticker_symbol").notNull(),
  dataType: text("data_type").notNull(), // 'news', 'fundamentals', 'technical', 'sentiment'
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
}).extend({
  password: z.string().min(8).optional(), // Make password optional for OAuth
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// OAuth user creation schema
export const oauthUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profilePicture: z.string().url().optional(),
  provider: z.enum(['google', 'facebook']),
  providerId: z.string(),
});

export const insertTickerSchema = createInsertSchema(tickers).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type OAuthUser = z.infer<typeof oauthUserSchema>;
export type User = typeof users.$inferSelect;
export type Ticker = typeof tickers.$inferSelect;
export type UserWatchlist = typeof userWatchlists.$inferSelect;
export type UserSearchHistory = typeof userSearchHistory.$inferSelect;
export type UserTickerUsage = typeof userTickerUsage.$inferSelect;
export type TickerData = typeof tickerData.$inferSelect;
export type InsertTicker = z.infer<typeof insertTickerSchema>;
