import type { NextFunction, Request, Response } from "express";
import { users } from "../endpoints/admin/dependencies.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.includes("jwt-token-")) {
    res.status(403).json({ error: "دسترسی غیرمجاز. شما وارد سیستم نشده‌اید." });
    return;
  }

  const tokenContent = authHeader.split("jwt-token-")[1];
  if (!tokenContent) {
    res.status(403).json({ error: "توکن نامعتبر است." });
    return;
  }

  const lastHyphenIndex = tokenContent.lastIndexOf("-");
  const userId = lastHyphenIndex > 0
    ? tokenContent.substring(0, lastHyphenIndex)
    : tokenContent;

  const user = users.find((item) => String(item.id) === String(userId));

  if (!user) {
    res.status(403).json({ error: "کاربر یافت نشد." });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "حساب کاربری شما مسدود شده است." });
    return;
  }

  if (user.role !== "admin" && user.role !== "owner" && user.role !== "super_admin") {
    res.status(403).json({ error: "دسترسی غیرمجاز. فقط مدیران سیستم به این بخش دسترسی دارند." });
    return;
  }

  req.currentUser = user;
  next();
}
