import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin } from "../../../middleware/admin-auth.middleware.js";
import { forbiddenWords } from "../dependencies.js";
import type { ForbiddenWord, WordCategory } from "../../../models/types.js";
import { dbExecute } from "../dependencies.js";

const router = Router();

// Every route in this module is protected.
router.use(requireAdmin);

router.get("/forbidden-words", (req: Request, res: Response) => {
  res.json(forbiddenWords);
});

router.post("/forbidden-words", async (req: Request, res: Response) => {
  const { word, category, isEnabled } = req.body;
  if (!word || !word.trim()) {
    return res.status(400).json({ error: "متن کلمه ممنوعه الزامی است" });
  }

  const fwId = forbiddenWords.length > 0 ? Math.max(...forbiddenWords.map(w => Number(w.id) || 0)) + 1 : 1;
  const newWord: ForbiddenWord = {
    id: fwId,
    word: word.trim(),
    category: (category as WordCategory) || "custom",
    isEnabled: isEnabled !== undefined ? !!isEnabled : true,
    createdAt: new Date().toISOString()
  };

  forbiddenWords.unshift(newWord);

  await dbExecute(
    `INSERT INTO forbidden_words (id, word, category, is_enabled, created_at) VALUES (?, ?, ?, ?, ?)`,
    [newWord.id, newWord.word, newWord.category, newWord.isEnabled ? 1 : 0, newWord.createdAt]
  );

  res.json(newWord);
});

router.put("/forbidden-words/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = forbiddenWords.find(w => String(w.id) === String(id));
  if (!item) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  const { word, category, isEnabled } = req.body;
  if (word) item.word = word.trim();
  if (category) item.category = category as WordCategory;
  if (isEnabled !== undefined) item.isEnabled = isEnabled;

  await dbExecute(
    `UPDATE forbidden_words SET word = ?, category = ?, is_enabled = ? WHERE id = ?`,
    [item.word, item.category, item.isEnabled ? 1 : 0, id]
  );

  res.json(item);
});

router.delete("/forbidden-words/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = forbiddenWords.findIndex(w => String(w.id) === String(id));
  if (index === -1) return res.status(404).json({ error: "کلمه ممنوعه یافت نشد" });

  forbiddenWords.splice(index, 1);

  await dbExecute(`DELETE FROM forbidden_words WHERE id = ?`, [id]);

  res.json({ message: "کلمه ممنوعه با موفقیت حذف شد" });
});

export default router;
