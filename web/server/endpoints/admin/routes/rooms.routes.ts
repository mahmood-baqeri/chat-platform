import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { users, chats } from "../dependencies.js";
import { dbExecute, dbGet, getUserById } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.post("/rooms/:chatId/members", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, role } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({ error: "شناسه اتاق و کاربر الزامی است" });
  }

  try {
    const now = new Date().toISOString();
    
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
    
    
    const chat = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [chatId]);
    if (!chat) {
      return res.status(404).json({ error: "گفتگو یافت نشد" });
    }

    const user = await getUserById(userId);
    // const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    const existingMember = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );

    if (existingMember) {
      return res.status(400).json({ error: "این کاربر قبلاً عضو گفتگو شده است" });
    }


    await dbExecute(
      `INSERT INTO room_members (room_id, user_id, role, joined_at, is_muted) 
       VALUES (?, ?, ?, ?, ?)`,
      [chatId, userId, role || "user", now, 0]
    );

    await dbExecute(
      `UPDATE rooms SET member_count = member_count + 1 WHERE id = ?`,
      [chatId]
    );

    await dbGet(
      `SELECT rm.*, u.display_name, u.avatar_url, u.phone 
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = ? AND rm.user_id = ?`,
      [chatId, userId]
    );

    
    chatInMemory.members.push({
      userId: Number(userId),
      userDisplayname : user.displayName,
      role: role || "user",
      joinedAt: now,
      isMuted: false,
    });
    chatInMemory.memberCount = chatInMemory.members.length;
    res.json(chatInMemory);


  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "خطا در افزودن کاربر به گفتگو" });
  }
});

router.delete("/rooms/:chatId/members/:userId", async (req: Request, res: Response) => {
  const { chatId, userId } = req.params;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
    chatInMemory.members = chatInMemory.members.filter(m => String(m.userId) !== String(userId));
    chatInMemory.memberCount = chatInMemory.members.length;
    
    
    const member = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );
    if (!member) {
      return res.status(404).json({ error: "عضو یافت نشد" });
    }

    await dbExecute(
      `DELETE FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );

    await dbExecute(
      `UPDATE rooms SET member_count = member_count - 1 WHERE id = ?`,
      [chatId]
    );

    res.json(chatInMemory);

  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "خطا در حذف عضو از گفتگو" });
  }
});

router.put("/rooms/:chatId/members/:userId", async (req: Request, res: Response) => {
  const { chatId, userId } = req.params;
  const { role } = req.body;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });

    const memberInMemory = chatInMemory.members.find(m => String(m.userId) === String(userId));
    if (!memberInMemory) return res.status(404).json({ error: "عضو یافت نشد" });

    memberInMemory.role = role || "user";
      
    
    const member = await dbGet(
      `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`,
      [chatId, userId]
    );
    if (!member) {
      return res.status(404).json({ error: "عضو یافت نشد" });
    }
       
    await dbExecute(
      `UPDATE room_members SET role = ? WHERE room_id = ? AND user_id = ?`,
      [role || "user", chatId, userId]
    );

    res.json(chatInMemory);

  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "خطا در ویرایش نقش عضو" });
  }
});

router.post("/rooms/:chatId/transfer-owner", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { newOwnerId } = req.body;

  try {
    const chatInMemory = chats.find(c => c.id === chatId);
    if (!chatInMemory) return res.status(404).json({ error: "گفتگو یافت نشد" });
  
  
    const chat = await dbGet(`SELECT * FROM rooms WHERE id = ?`, [chatId]);
    if (!chat) {
      return res.status(404).json({ error: "گفتگو یافت نشد" });
    }

    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [newOwnerId]);
    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    await dbExecute(
      `UPDATE rooms SET owner_id = ? WHERE id = ?`,
      [newOwnerId, chatId]
    );
    
    chatInMemory.ownerId = newOwnerId;
    const member = chatInMemory.members.find(m => String(m.userId) === String(newOwnerId));
    if (member) {
      member.role = "owner";
    } else {
      chatInMemory.members.push({
        userDisplayname: user.displayName,
        userId: newOwnerId,
        role: "owner",
        joinedAt: new Date().toISOString(),
        isMuted: false
      });
      chatInMemory.memberCount = chatInMemory.members.length;
    }
    res.json(chatInMemory);

  } catch (error) {
    console.error("Error transferring ownership:", error);
    res.status(500).json({ error: "خطا در انتقال مالکیت" });
  }
});

export default router;
