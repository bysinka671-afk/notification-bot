// Referenced from javascript_database blueprint
import { 
  users, 
  telegramUsers,
  notifications,
  type User, 
  type InsertUser,
  type TelegramUser,
  type InsertTelegramUser,
  type Notification,
  type InsertNotification,
  type Department,
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Telegram user methods
  getTelegramUserByTelegramId(telegramId: string): Promise<TelegramUser | undefined>;
  createTelegramUser(user: InsertTelegramUser): Promise<TelegramUser>;
  updateTelegramUserDepartment(telegramId: string, department: Department, isAdmin: boolean): Promise<TelegramUser | undefined>;
  getTelegramUsersByDepartments(departments: string[]): Promise<TelegramUser[]>;
  getDepartmentStats(): Promise<Array<{ department: string; count: number }>>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(limit?: number): Promise<Notification[]>;
}

export class DatabaseStorage implements IStorage {
  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Telegram user methods
  async getTelegramUserByTelegramId(telegramId: string): Promise<TelegramUser | undefined> {
    const [user] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId));
    return user || undefined;
  }

  async createTelegramUser(insertUser: InsertTelegramUser): Promise<TelegramUser> {
    const [user] = await db
      .insert(telegramUsers)
      .values(insertUser as any)
      .returning();
    return user;
  }

  async updateTelegramUserDepartment(
    telegramId: string, 
    department: Department, 
    isAdmin: boolean
  ): Promise<TelegramUser | undefined> {
    const [user] = await db
      .update(telegramUsers)
      .set({ department, isAdmin })
      .where(eq(telegramUsers.telegramId, telegramId))
      .returning();
    return user || undefined;
  }

  async getTelegramUsersByDepartments(departments: string[]): Promise<TelegramUser[]> {
    if (departments.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(telegramUsers)
      .where(inArray(telegramUsers.department, departments as any));
  }

  async getDepartmentStats(): Promise<Array<{ department: string; count: number }>> {
    const results = await db
      .select({
        department: telegramUsers.department,
        count: sql<number>`count(*)::int`,
      })
      .from(telegramUsers)
      .where(sql`${telegramUsers.department} IS NOT NULL`)
      .groupBy(telegramUsers.department);
    
    return results.map(r => ({
      department: r.department!,
      count: r.count,
    }));
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async getNotifications(limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
