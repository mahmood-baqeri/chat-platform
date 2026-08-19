// web/server/db/repositories/ForbiddenWordsRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

export interface IForbiddenWord {
  id?: number;
  word: string;
  category: string;
  is_enabled: number;
  created_at?: string;
}

export class ForbiddenWordsRepository extends BaseRepository<IForbiddenWord> {
  constructor() {
    super('forbidden_words');
  }

  // ایجاد کلمه ممنوعه
  async create(wordData: Omit<IForbiddenWord, 'id' | 'created_at'>): Promise<IForbiddenWord> {
    const query = 'INSERT INTO forbidden_words (word, category, is_enabled) VALUES (?, ?, ?)';
    const params = [wordData.word, wordData.category, wordData.is_enabled || 1];
    
    const result = await dbExecute(query, params) as ResultSetHeader;
    const word = await this.findById(result.insertId);
    return word as IForbiddenWord;
  }

  // دریافت همه کلمات ممنوعه فعال
  async getActiveWords(): Promise<IForbiddenWord[]> {
    const query = 'SELECT * FROM forbidden_words WHERE is_enabled = 1 ORDER BY word';
    const rows = await dbQuery(query, []);
    return rows as IForbiddenWord[];
  }

  // دریافت کلمات بر اساس دسته‌بندی
  async getByCategory(category: string): Promise<IForbiddenWord[]> {
    const query = 'SELECT * FROM forbidden_words WHERE category = ? AND is_enabled = 1 ORDER BY word';
    const rows = await dbQuery(query, [category]);
    return rows as IForbiddenWord[];
  }

  // بررسی وجود کلمه
  async exists(word: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM forbidden_words WHERE word = ?';
    const rows = await dbQuery(query, [word]);
    return rows[0]?.count > 0;
  }

  // جستجوی کلمات
  async search(queryText: string): Promise<IForbiddenWord[]> {
    const query = 'SELECT * FROM forbidden_words WHERE word LIKE ? ORDER BY word';
    const rows = await dbQuery(query, [`%${queryText}%`]);
    return rows as IForbiddenWord[];
  }

  // فعال/غیرفعال کردن کلمه
  async toggleStatus(id: number, enabled: boolean): Promise<void> {
    const query = 'UPDATE forbidden_words SET is_enabled = ? WHERE id = ?';
    await dbExecute(query, [enabled ? 1 : 0, id]);
  }

  // بررسی متن برای کلمات ممنوعه
  async checkText(text: string): Promise<{ hasForbidden: boolean; foundWords: string[] }> {
    const words = await this.getActiveWords();
    const foundWords: string[] = [];
    
    for (const word of words) {
      if (text.toLowerCase().includes(word.word.toLowerCase())) {
        foundWords.push(word.word);
      }
    }

    return {
      hasForbidden: foundWords.length > 0,
      foundWords
    };
  }
}

export const forbiddenWordsRepository = new ForbiddenWordsRepository();


/*

متد	توضیح	خروجی
create(wordData)	ایجاد کلمه ممنوعه	Promise<IForbiddenWord>
findById(id)	پیدا کردن کلمه با ID (از BaseRepository)	Promise<IForbiddenWord | null>
getActiveWords()	دریافت همه کلمات ممنوعه فعال	Promise<IForbiddenWord[]>
getByCategory(category)	دریافت کلمات بر اساس دسته‌بندی	Promise<IForbiddenWord[]>
findAll(options?)	دریافت همه کلمات (از BaseRepository)	Promise<IForbiddenWord[]>
update(id, wordData)	به‌روزرسانی کلمه ممنوعه	Promise<IForbiddenWord | null>
delete(id)	حذف کلمه ممنوعه (از BaseRepository)	Promise<boolean>
exists(word)	بررسی وجود کلمه	Promise<boolean>
search(queryText)	جستجوی کلمات	Promise<IForbiddenWord[]>
toggleStatus(id, enabled)	فعال/غیرفعال کردن کلمه	Promise<void>
checkText(text)	بررسی متن برای کلمات ممنوعه	Promise<{ hasForbidden, foundWords }>
count(where?)	تعداد کلمات ممنوعه (از BaseRepository)	Promise<number>

*/