import express, { Request, Response } from "express";
import { smsConfig, updateSmsConfig, testSmsConnection, sendSmsNotification } from "../services/smsService.js";

const router = express.Router();

router.get("/admin/sms-settings", (req: Request, res: Response) => {
  res.json(smsConfig);
});

router.post("/admin/sms-settings", (req: Request, res: Response) => {
  const { provider, apiKey, secretKey, senderNumber, templateId, timeout, isActive, username, password } = req.body;
  const updated = updateSmsConfig({
    provider: provider ? provider.trim() : "smsir",
    apiKey: apiKey ? apiKey.trim() : "",
    secretKey: secretKey ? secretKey.trim() : "",
    senderNumber: senderNumber ? senderNumber.trim() : "",
    templateId: templateId ? templateId.trim() : "",
    timeout: timeout ? Number(timeout) : 10,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    username: username ? username.trim() : "",
    password: password ? password.trim() : "",
  });
  res.json({ message: "تنظیمات پنل پیامک با موفقیت ذخیره شد.", config: updated });
});

router.post("/admin/sms-test", async (req: Request, res: Response) => {
  const result = await testSmsConnection(req.body);
  res.json(result);
});

router.post("/admin/sms-send-test", async (req: Request, res: Response) => {
  const { mobile, message, ...override } = req.body;
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ success: false, message: "شماره گیرنده وارد نشده است." });
  }

  const result = await sendSmsNotification(mobile, message || "پیامک تست از پلتفرم چت", override);
  res.json(result);
});

export default router;
