import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendNotificationToUsers } from "./telegram-bot";
import { insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get department statistics
  app.get("/api/departments/stats", async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching department stats:", error);
      res.status(500).json({ error: "Failed to fetch department statistics" });
    }
  });

  // Create and send notification
  app.post("/api/notifications", async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertNotificationSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors,
        });
      }

      const { message, departments, createdBy } = validationResult.data;

      // Save notification to database (createdBy is optional)
      const notification = await storage.createNotification({
        message,
        departments,
        createdBy: createdBy || undefined,
      });

      // Send notification via Telegram
      const result = await sendNotificationToUsers(message, departments);

      res.json({
        notification,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({
        error: "Failed to create notification",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get notification history
  app.get("/api/notifications", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
