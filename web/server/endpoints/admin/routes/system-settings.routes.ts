import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { systemSettings, pushPolicy } from "../dependencies.js";
import { dbExecute, dbQuery } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/system-settings", async (req: Request, res: Response) => {
  try {
    const rows = await dbQuery(`SELECT * FROM system_settings WHERE id = 1`);
    if (rows && rows.length > 0) {
      const s = rows[0];
      return res.json({
        registrationEnabled: !!s.registration_enabled,
        loginEnabled: !!s.login_enabled,
        otpEnabled: !!s.otp_enabled,
        channelsEnabled: !!s.channels_enabled,
        groupsEnabled: !!s.groups_enabled,
        callsEnabled: !!s.calls_enabled,
        editMessageEnabled: !!s.edit_message_enabled,
        deleteMessageEnabled: !!s.delete_message_enabled,
        maxFileSizeMb: s.max_file_size_mb || 25,
        pushPolicy: s.push_policy || "always",
      });
    }
  } catch (e) { }

  res.json({
    registrationEnabled: systemSettings.registrationEnabled,
    loginEnabled: systemSettings.loginEnabled,
    otpEnabled: systemSettings.otpEnabled,
    channelsEnabled: systemSettings.channelsEnabled,
    groupsEnabled: systemSettings.groupsEnabled,
    callsEnabled: systemSettings.callsEnabled,
    editMessageEnabled: systemSettings.editMessageEnabled,
    deleteMessageEnabled: systemSettings.deleteMessageEnabled,
    maxFileSizeMb: systemSettings.maxFileSizeMB,
    pushPolicy,
  });
});

router.post("/system-settings", async (req: Request, res: Response) => {
  const {
    registrationEnabled,
    loginEnabled,
    otpEnabled,
    channelsEnabled,
    groupsEnabled,
    callsEnabled,
    editMessageEnabled,
    deleteMessageEnabled,
    maxFileSizeMb,
  } = req.body;

  try {
    if (registrationEnabled !== undefined) {
      systemSettings.registrationEnabled = registrationEnabled;
      await dbExecute(`UPDATE system_settings SET registration_enabled = ? WHERE id = 1`, [registrationEnabled ? 1 : 0]);
    }
    if (loginEnabled !== undefined) {
      systemSettings.loginEnabled = loginEnabled;
      await dbExecute(`UPDATE system_settings SET login_enabled = ? WHERE id = 1`, [loginEnabled ? 1 : 0]);
    }
    if (otpEnabled !== undefined) {
      systemSettings.otpEnabled = otpEnabled;
      await dbExecute(`UPDATE system_settings SET otp_enabled = ? WHERE id = 1`, [otpEnabled ? 1 : 0]);
    }
    if (channelsEnabled !== undefined) {
      systemSettings.channelsEnabled = channelsEnabled;
      await dbExecute(`UPDATE system_settings SET channels_enabled = ? WHERE id = 1`, [channelsEnabled ? 1 : 0]);
    }
    if (groupsEnabled !== undefined) {
      systemSettings.groupsEnabled = groupsEnabled;
      await dbExecute(`UPDATE system_settings SET groups_enabled = ? WHERE id = 1`, [groupsEnabled ? 1 : 0]);
    }
    if (callsEnabled !== undefined) {
      systemSettings.callsEnabled = callsEnabled;
      await dbExecute(`UPDATE system_settings SET calls_enabled = ? WHERE id = 1`, [callsEnabled ? 1 : 0]);
    }
    if (editMessageEnabled !== undefined) {
      systemSettings.editMessageEnabled = editMessageEnabled;
      await dbExecute(`UPDATE system_settings SET edit_message_enabled = ? WHERE id = 1`, [editMessageEnabled ? 1 : 0]);
    }
    if (deleteMessageEnabled !== undefined) {
      systemSettings.deleteMessageEnabled = deleteMessageEnabled;
      await dbExecute(`UPDATE system_settings SET delete_message_enabled = ? WHERE id = 1`, [deleteMessageEnabled ? 1 : 0]);
    }
    if (maxFileSizeMb !== undefined) {
      systemSettings.maxFileSizeMB = maxFileSizeMb;
      await dbExecute(`UPDATE system_settings SET max_file_size_mb = ? WHERE id = 1`, [maxFileSizeMb]);
    }
  } catch (e) { }

  res.json({ success: true, message: "تنظیمات سیستم با موفقیت به‌روزرسانی شد." });
});

export default router;
