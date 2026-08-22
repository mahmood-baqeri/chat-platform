import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { users, chats, messages, deletedMessages, uploadedFiles } from "../dependencies.js";
import { wsClients } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/stats", (req: Request, res: Response) => {
  const totalUsers = users.length;
  const activeChats = chats.length;
  const totalMessages = messages.length;
  const totalFiles = uploadedFiles.length + messages.reduce((acc, m) => acc + (m.attachments?.length || 0), 0);
  const totalStorageBytes = uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  res.json({
    totalUsers,
    activeChats,
    totalMessages,
    deletedMessagesCount: deletedMessages.length,
    totalFiles,
    totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
    onlineCount: users.filter(u => u.status === "online").length,
    groupsCount: chats.filter(c => c.type === "group").length,
    channelsCount: chats.filter(c => c.type === "channel").length,
    wsConnectedCount: wsClients.size
  });
});

export default router;
