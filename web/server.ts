import "dotenv/config";
import { startServer } from "./server/index.js";

// Re-export modular server entry point from /server directory
startServer();
