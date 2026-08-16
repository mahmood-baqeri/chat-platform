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

