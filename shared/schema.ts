import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Departments enum
export const DEPARTMENTS = [
  "Департамент продаж",
  "Департамент продуктовой логистики",
  "Департамент транспортно-складской логистики",
  "Департамент маркетинга",
  "КАД",
  "Кадровый департамент (HR)",
  "Финансовый департамент",
  "Юридический департамент",
  "Департамент информационных технологий",
] as const;

export type Department = typeof DEPARTMENTS[number];

// IT department that grants admin rights
export const IT_DEPARTMENT = "Департамент информационных технологий";

// Telegram users table
export const telegramUsers = pgTable("telegram_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: varchar("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  department: text("department").$type<Department>(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  departments: text("departments").array().notNull(), // Array of departments
  createdBy: varchar("created_by").references(() => telegramUsers.id), // Nullable - will be added when auth is implemented
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const telegramUsersRelations = relations(telegramUsers, ({ many }) => ({
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  creator: one(telegramUsers, {
    fields: [notifications.createdBy],
    references: [telegramUsers.id],
  }),
}));

// Insert schemas
export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  createdBy: true, // Will be optional for now
}).extend({
  createdBy: z.string().optional(), // Optional until auth is implemented
});

// Types
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Legacy user table (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
