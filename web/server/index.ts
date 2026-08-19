// web/server/index.ts

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

import authEndpoint from "./endpoints/auth-endpoint.js";
import chatEndpoint from "./endpoints/chat-endpoint.js";
import uploadEndpoint from "./endpoints/upload-endpoint.js";
import adminEndpoint from "./endpoints/admin-endpoint.js";
import dbEndpoint from "./endpoints/db-endpoint.js";
import pushEndpoint from "./endpoints/push-endpoint.js";
import contactEndpoint from "./endpoints/contact-endpoint.js";
import updateUsersEndpoint from "./endpoints/updateusers-endpoint.ts";

const currentDir = process.cwd();

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // App is behind OpenLiteSpeed reverse proxy.
  app.set("trust proxy", true);

  // ============================================================
  // ✅ فقط در Production و زمانی که پشت پروکسی هستیم، ریدایرکت به HTTPS
  // ============================================================
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

  if (isProduction) {
    console.log('🔒 Production mode: Redirecting HTTP to HTTPS');
    app.use((req, res, next) => {
      const forwardedProto = String(
        req.headers["x-forwarded-proto"] ?? ""
      )
        .split(",")[0]
        .trim()
        .toLowerCase();

      // req.secure is true when Express recognizes HTTPS through a trusted proxy.
      const isHttps = req.secure || req.protocol === "https" || forwardedProto === "https";

      if (!isHttps) {
        return res.redirect(
          301,
          `https://${req.get("host")}${req.originalUrl}`
        );
      }

      return next();
    });
  } else {
    console.log('🛠️ Development mode: SSL redirect disabled');
    // در حالت توسعه، هیچ ریدایرکتی انجام نمیشه
  }

  app.use(cors());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Static uploads directory
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Initialize DB and background services
  await ensureDbInitialized();
  await loadDataFromDB();
  await initPushService();

  // Create WebSocket Server
  createWebSocketServer(server);

  // Register API Route Modules
  app.use("/api", authEndpoint);
  app.use("/api", chatEndpoint);
  app.use("/api", uploadEndpoint);
  app.use("/api", adminEndpoint);
  app.use("/api", dbEndpoint);
  app.use("/api", pushEndpoint);
  app.use("/api", contactEndpoint);
    app.use("/", updateUsersEndpoint); 

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
    const env = process.env.NODE_ENV || 'development';
    console.log(`🚀 Server running in ${env} mode on http://0.0.0.0:${PORT}`);
    if (isProduction) {
      console.log('🔒 HTTPS redirect is enabled');
    } else {
      console.log('🛠️ HTTPS redirect is disabled (development mode)');
    }
  });

  return { app, server };
}

// Export startServer for server.ts entry point