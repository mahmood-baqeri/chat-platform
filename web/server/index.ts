import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

import { loadDataFromDB } from "./store/dataStore.js";
import { ensureDbInitialized } from "./db/index.js";
import { initPushService } from "./services/pushService.js";
import { createWebSocketServer } from "./websocket/wsServer.js";
import { PORT, UPLOADS_DIR } from "./config.js";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import smsRoutes from "./routes/smsRoutes.js";
import dbRoutes from "./routes/dbRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";

const currentDir = process.cwd();

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Static uploads directory
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Initialize DB and background services
  await ensureDbInitialized();
  await loadDataFromDB();
  initPushService();

  // Create WebSocket Server
  createWebSocketServer(server);

  // Register API Route Modules
  app.use("/api", authRoutes);
  app.use("/api", chatRoutes);
  app.use("/api", contactRoutes);
  app.use("/api", uploadRoutes);
  app.use("/api", adminRoutes);
  app.use("/api", smsRoutes);
  app.use("/api", dbRoutes);
  app.use("/api", pushRoutes);

  // Vite Middleware in Development Mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Modular Messenger Server listening on http://0.0.0.0:${PORT}`);
  });

  return { app, server };
}

// Export startServer for server.ts entry point

