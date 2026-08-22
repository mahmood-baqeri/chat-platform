import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { messages, deletedMessages } from "../dependencies.js";
import { broadcastWSEvent } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/messages", (req: Request, res: Response) => {
  res.json({
    activeMessages: messages,
    deletedMessages: deletedMessages
  });
});

router.post("/messages/:messageId/restore", (req: Request, res: Response) => {
  const { messageId } = req.params;
  const index = deletedMessages.findIndex(m => m.id === messageId);
  if (index === -1) return res.status(404).json({ error: "پیام حذف شده یافت نشد" });

  const restored = deletedMessages[index];
  delete restored.isDeleted;
  delete restored.deletedAt;
  deletedMessages.splice(index, 1);
  messages.push(restored);

  broadcastWSEvent("message:new", restored);
  res.json({ message: "پیام بازیابی شد", restored });
});

export default router;
