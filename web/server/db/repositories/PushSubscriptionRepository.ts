// web/server/db/repositories/PushSubscriptionRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

export interface IPushSubscription {
  id?: number;
  user_id: number;
  endpoint: string;
  subscription_json: string;
  created_at?: string;
}

export class PushSubscriptionRepository extends BaseRepository<IPushSubscription> {
  constructor() {
    super('push_subscriptions');
  }

  // ایجاد اشتراک push
  async create(subscriptionData: Omit<IPushSubscription, 'id' | 'created_at'>): Promise<IPushSubscription> {
    const query = `
      INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE subscription_json = ?
    `;
    
    const params = [
      subscriptionData.user_id,
      subscriptionData.endpoint,
      subscriptionData.subscription_json,
      subscriptionData.subscription_json
    ];

    const result = await dbExecute(query, params) as ResultSetHeader;
    
    if (result.insertId) {
      return this.findById(result.insertId) as Promise<IPushSubscription>;
    }
    
    // اگر وجود داشت، پیدا کن
    const rows = await dbQuery('SELECT * FROM push_subscriptions WHERE endpoint = ?', [subscriptionData.endpoint]);
    return rows[0] as IPushSubscription;
  }

  // دریافت اشتراک‌های یک کاربر
  async getByUser(userId: number): Promise<IPushSubscription[]> {
    const query = 'SELECT * FROM push_subscriptions WHERE user_id = ?';
    const rows = await dbQuery(query, [userId]);
    return rows as IPushSubscription[];
  }

  // حذف اشتراک
  async deleteByEndpoint(endpoint: string): Promise<boolean> {
    const query = 'DELETE FROM push_subscriptions WHERE endpoint = ?';
    const result = await dbExecute(query, [endpoint]) as ResultSetHeader;
    return result.affectedRows > 0;
  }

  // حذف اشتراک‌های یک کاربر
  async deleteByUser(userId: number): Promise<number> {
    const query = 'DELETE FROM push_subscriptions WHERE user_id = ?';
    const result = await dbExecute(query, [userId]) as ResultSetHeader;
    return result.affectedRows;
  }
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();

/*

متد	توضیح	خروجی
create(subscriptionData)	ایجاد اشتراک push	Promise<IPushSubscription>
findById(id)	پیدا کردن اشتراک با ID (از BaseRepository)	Promise<IPushSubscription | null>
getByUser(userId)	دریافت اشتراک‌های یک کاربر	Promise<IPushSubscription[]>
findAll(options?)	دریافت همه اشتراک‌ها (از BaseRepository)	Promise<IPushSubscription[]>
delete(id)	حذف اشتراک (از BaseRepository)	Promise<boolean>
deleteByEndpoint(endpoint)	حذف اشتراک با endpoint	Promise<boolean>
deleteByUser(userId)	حذف اشتراک‌های یک کاربر	Promise<number>
count(where?)	تعداد اشتراک‌ها (از BaseRepository)	Promise<number>
exists(id)	بررسی وجود اشتراک (از BaseRepository)	Promise<boolean>

*/