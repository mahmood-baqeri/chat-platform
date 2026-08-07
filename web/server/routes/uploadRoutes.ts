import express, { Request, Response } from "express";
import { systemSettings, uploadedFiles } from "../store/dataStore.js";
import { Attachment, MessageType } from "../models/types.js";
import { saveBase64ToFile } from "../config.js";

const router = express.Router();

router.post("/upload", (req: Request, res: Response) => {
  if (!systemSettings.allowFileUpload) {
    return res.status(403).json({ error: "ارسال فایل توسط مدیر سیستم غیرفعال شده است" });
  }

  const { fileName, fileType, dataUrl, size, chatId, senderId, duration } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: "فایل نامعتبر است" });
  }

  const fileSizeMB = (size || 0) / (1024 * 1024);
  if (systemSettings.maxFileSizeMB && fileSizeMB > systemSettings.maxFileSizeMB) {
    return res.status(400).json({ error: `حجم فایل بیشتر از حد مجاز (${systemSettings.maxFileSizeMB} مگابایت) است` });
  }

  let type: MessageType = "document";
  if (fileType?.startsWith("image/")) type = "image";
  else if (fileType?.startsWith("video/")) type = "video";
  else if (fileType?.startsWith("audio/")) type = "audio";

  const fileUrl = saveBase64ToFile(dataUrl, fileName);

  const attachment: Attachment = {
    id: "att-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    name: fileName || "فایل ضمیمه",
    type,
    url: fileUrl,
    size: size || 1024,
    mimeType: fileType || "application/octet-stream",
    duration: duration ? Number(duration) : undefined,
    chatId: chatId || "",
    senderId: senderId || "user-1",
    createdAt: new Date().toISOString()
  };

  uploadedFiles.unshift(attachment);
  res.json(attachment);
});

export default router;
