import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { messages, uploadedFiles } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/files", (req: Request, res: Response) => {
  const msgAttachments: any[] = [];
  messages.forEach(m => {
    if (m.attachments) {
      m.attachments.forEach(att => {
        msgAttachments.push({ ...att, chatId: m.chatId, senderId: m.senderId, createdAt: m.createdAt });
      });
    }
  });

  const combined = [...uploadedFiles, ...msgAttachments];
  const totalSizeBytes = combined.reduce((sum, f) => sum + (f.size || 0), 0);

  res.json({
    files: combined,
    totalCount: combined.length,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2)
  });
});

router.delete("/files/:fileId", (req: Request, res: Response) => {
  const { fileId } = req.params;
  const filteredUploads = uploadedFiles.filter(f => f.id !== fileId);
  uploadedFiles.length = 0;
  uploadedFiles.push(...filteredUploads);

  messages.forEach(m => {
    if (m.attachments) {
      m.attachments = m.attachments.filter(att => att.id !== fileId);
    }
  });

  res.json({ message: "فایل با موفقیت حذف شد" });
});

export default router;
