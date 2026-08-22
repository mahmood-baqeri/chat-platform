import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { users, chats, messages, auditLogs, sessions } from "../dependencies.js";
import { User, UserRole, AvatarPhoto } from "../../../models/types.js";
import { dbExecute } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/users", (req: Request, res: Response) => {
  const enrichedUsers = users.map(u => {
    const userGroupsCount = chats.filter(c => c.members.some(m => String(m.userId) === String(u.id))).length;
    const userMsgCount = messages.filter(m => String(m.senderId) === String(u.id)).length;
    return {
      ...u,
      groupsCount: userGroupsCount,
      messagesCount: userMsgCount
    };
  });
  res.json(enrichedUsers);
});

router.post("/users", async (req: Request, res: Response) => {
  const { phone, nationalCode, firstName, lastName, displayName, role, personCode } = req.body;
  if (!phone || !nationalCode) {
    return res.status(400).json({ error: "شماره موبایل و کد ملی الزامی است" });
  }

  const existing = users.find(u => u.nationalCode === nationalCode || u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "کاربری با این شماره یا نام کاربری وجود دارد" });
  }

  const newId = users.length > 0 ? Math.max(...users.map(u => Number(u.id) || 0)) + 1 : 1;
  const newUser: User = {
    id: newId,
    phone,
    nationalCode,
    firstName: firstName || "کاربر",
    lastName: lastName || "جدید",
    displayName: displayName || `${firstName || 'کاربر'} ${lastName || ''}`.trim(),
    avatarUrl: AvatarPhoto,
    personCode: personCode || "",
    status: "offline",
    lastSeen: "لحظاتی پیش",
    role: (role as UserRole) || "user",
    isBanned: false,
    isMuted: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  await dbExecute(
    `INSERT INTO users (id, phone, nationalCode, firstName, lastName, displayName, avatarUrl, personCode, status, role, isBanned, isMuted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newUser.id, newUser.phone, newUser.nationalCode, newUser.firstName, newUser.lastName, newUser.displayName, newUser.avatarUrl, newUser.personCode, newUser.status, newUser.role, 0, 0, newUser.createdAt]
  );

  res.json(newUser);
});

router.put("/users/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  const { displayName, nationalCode, role, isBanned, isMuted, phone, personCode } = req.body;
  if (displayName) user.displayName = displayName;
  if (nationalCode) user.nationalCode = nationalCode;
  if (role) user.role = role as UserRole;
  if (phone) user.phone = phone;
  if (personCode !== undefined) user.personCode = personCode;
  if (isBanned !== undefined) user.isBanned = isBanned;
  if (isMuted !== undefined) user.isMuted = isMuted;

  await dbExecute(
    `UPDATE users SET display_name = ?, nationalCode = ?, role = ?, phone = ?, personCode = ?, is_banned = ?, is_muted = ? WHERE id = ?`,
    [user.displayName, user.nationalCode, user.role, user.phone, user.personCode, user.isBanned ? 1 : 0, user.isMuted ? 1 : 0, user.id]
  );

  res.json(user);
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const index = users.findIndex(u => String(u.id) === String(userId));
  if (index === -1) return res.status(404).json({ error: "کاربر یافت نشد" });

  users.splice(index, 1);
  const remainingSessions = sessions.filter(s => String(s.userId) !== String(userId));
  sessions.length = 0;
  sessions.push(...remainingSessions);

  await dbExecute(`DELETE FROM users WHERE id = ?`, [userId]);

  res.json({ message: "کاربر با موفقیت حذف شد" });
});

router.post("/users/:userId/ban", (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

  user.isBanned = !user.isBanned;

  const logId = auditLogs.length > 0 ? Math.max(...auditLogs.map(l => Number(l.id) || 0)) + 1 : 1;
  auditLogs.unshift({
    id: logId,
    actorName: "مدیر سیستم",
    action: user.isBanned ? "BAN_USER" : "UNBAN_USER",
    details: `وضعیت کاربر ${user.displayName} تغییر کرد`,
    timestamp: new Date().toISOString(),
    level: "warning"
  });

  res.json(user);
});

router.get("/users/:userId/sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userSessions = sessions.filter(s => String(s.userId) === String(userId));
  res.json(userSessions);
});

router.post("/users/:userId/terminate-sessions", (req: Request, res: Response) => {
  const { userId } = req.params;
  const remaining = sessions.filter(s => String(s.userId) !== String(userId));
  sessions.length = 0;
  sessions.push(...remaining);
  res.json({ message: "تمام نشست‌های کاربر خاتمه یافت" });
});

export default router;
