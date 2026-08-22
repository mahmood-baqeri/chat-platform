import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { rolePermissions } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/permissions", (req: Request, res: Response) => {
  res.json(rolePermissions);
});

router.put("/permissions", (req: Request, res: Response) => {
  const { permissions } = req.body;
  if (Array.isArray(permissions)) {
    rolePermissions.length = 0;
    rolePermissions.push(...permissions);
  }
  res.json({ message: "دسترسی‌های نقش‌ها با موفقیت بروزرسانی شد", permissions: rolePermissions });
});

export default router;
