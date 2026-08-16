//  web/src/utils/helper.ts


import { dbQuery } from "@/server/db";

// ============================================
// تابع کمکی برای دریافت  تایم زون تهران
// ============================================
export function getTehranTime(): string {
     const now = new Date();
     const tehranTime = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
     return tehranTime.toISOString().slice(0, 19).replace("T", " ");
}


// ============================================
// تابع کمکی برای دریافت یک رکورد از دیتابیس
// ============================================
export async function dbGet(sql: string, params: any[] = []): Promise<any | null> {
     const results = await dbQuery(sql, params);
     return results && results.length > 0 ? results[0] : null;
}