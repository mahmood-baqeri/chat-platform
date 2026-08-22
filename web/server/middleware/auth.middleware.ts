import { User } from "@/src/types";
import { users } from "../store/dataStore.js";
import { Request, Response, NextFunction } from "express";
// import { users } from "../../../store/dataStore.js";


export interface AdminRequest extends Request {
  currentUser?: User;
}

export const adminAuthMiddleware = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const authHeader = req.headers.authorization;

  // بررسی وجود توکن
  if (!authHeader || !authHeader.includes("jwt-token-")) {
    return res.status(403).json({
      error: "دسترسی غیرمجاز. شما وارد سیستم نشده‌اید.",
    });
  }

  // استخراج توکن
  const tokenContent = authHeader.split("jwt-token-")[1];
  if (!tokenContent) {
    return res.status(403).json({ error: "توکن نامعتبر است." });
  }

  // استخراج userId از توکن
  const lastHyphenIndex = tokenContent.lastIndexOf("-");
  const userId = lastHyphenIndex > 0
    ? tokenContent.substring(0, lastHyphenIndex)
    : tokenContent;

  // پیدا کردن کاربر
  const user = users.find((u) => String(u.id) === String(userId));
  if (!user) {
    return res.status(403).json({ error: "کاربر یافت نشد." });
  }

  // بررسی مسدود بودن
  if (user.isBanned) {
    return res.status(403).json({
      error: "حساب کاربری شما مسدود شده است.",
    });
  }

  // بررسی نقش کاربر (فقط ادمین‌ها)
  if (
    user.role !== "admin" &&
    user.role !== "owner" &&
    user.role !== "super_admin"
  ) {
    return res.status(403).json({
      error: "دسترسی غیرمجاز. فقط مدیران سیستم به این بخش دسترسی دارند.",
    });
  }

  // ذخیره کاربر در request
  (req as AdminRequest).currentUser = user;
  next();
};

// میدلور برای بررسی دسترسی خاص (مثلاً فقط super_admin)
export const requireRole = (allowedRoles: string[]) => {
  return (req: AdminRequest, res: Response, next: NextFunction): void | Response => {
    const user = req.currentUser;
    if (!user) {
      return res.status(403).json({ error: "کاربر یافت نشد." });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `دسترسی غیرمجاز. فقط ${allowedRoles.join(" یا ")} مجاز هستند.`,
      });
    }

    next();
  };
};