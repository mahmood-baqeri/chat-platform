// web/server/db/repositories/SystemSettingsRepository.ts

import { BaseRepository } from './BaseRepository.js';
import { dbQuery, dbExecute } from '../index.js';

export interface ISystemSettings {
  id?: number;
  registration_enabled: number;
  login_enabled: number;
  otp_enabled: number;
  channels_enabled: number;
  groups_enabled: number;
  calls_enabled: number;
  edit_message_enabled: number;
  delete_message_enabled: number;
  max_file_size_mb: number;
  allowed_file_extensions?: string;
  push_policy: 'always' | 'never' | 'only_mentions';
}

export class SystemSettingsRepository extends BaseRepository<ISystemSettings> {
  constructor() {
    super('system_settings');
  }

  // دریافت تنظیمات (همیشه فقط یک رکورد وجود دارد)
  async getSettings(): Promise<ISystemSettings | null> {
    const query = 'SELECT * FROM system_settings LIMIT 1';
    const rows = await dbQuery(query, []);
    return rows.length > 0 ? rows[0] as ISystemSettings : null;
  }

  // به‌روزرسانی تنظیمات
  async updateSettings(settings: Partial<ISystemSettings>): Promise<ISystemSettings | null> {
    const current = await this.getSettings();
    
    if (!current) {
      // اگر تنظیماتی وجود ندارد، ایجاد کن
      return this.createSettings(settings as any);
    }

    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'registration_enabled', 'login_enabled', 'otp_enabled',
      'channels_enabled', 'groups_enabled', 'calls_enabled',
      'edit_message_enabled', 'delete_message_enabled',
      'max_file_size_mb', 'allowed_file_extensions', 'push_policy'
    ];

    for (const field of allowedFields) {
      if (settings[field as keyof ISystemSettings] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(settings[field as keyof ISystemSettings]);
      }
    }

    if (fields.length === 0) {
      return current;
    }

    params.push(current.id);
    const query = `UPDATE system_settings SET ${fields.join(', ')} WHERE id = ?`;
    await dbExecute(query, params);
    
    return this.getSettings();
  }

  // ایجاد تنظیمات اولیه
  async createSettings(settings: Omit<ISystemSettings, 'id'>): Promise<ISystemSettings> {
    const query = `
      INSERT INTO system_settings (
        registration_enabled, login_enabled, otp_enabled,
        channels_enabled, groups_enabled, calls_enabled,
        edit_message_enabled, delete_message_enabled,
        max_file_size_mb, allowed_file_extensions, push_policy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      settings.registration_enabled || 1,
      settings.login_enabled || 1,
      settings.otp_enabled || 1,
      settings.channels_enabled || 1,
      settings.groups_enabled || 1,
      settings.calls_enabled || 0,
      settings.edit_message_enabled || 1,
      settings.delete_message_enabled || 1,
      settings.max_file_size_mb || 25,
      settings.allowed_file_extensions || null,
      settings.push_policy || 'always'
    ];

    await dbExecute(query, params);
    return await this.getSettings() as ISystemSettings;
  }

  // بررسی فعال بودن ثبت‌نام
  async isRegistrationEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings ? settings.registration_enabled === 1 : true;
  }

  // بررسی فعال بودن ورود
  async isLoginEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings ? settings.login_enabled === 1 : true;
  }

  // بررسی فعال بودن OTP
  async isOtpEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings ? settings.otp_enabled === 1 : true;
  }
}

export const systemSettingsRepository = new SystemSettingsRepository();

/*

متد	توضیح	خروجی
getSettings()	دریافت تنظیمات	Promise<ISystemSettings | null>
updateSettings(settings)	به‌روزرسانی تنظیمات	Promise<ISystemSettings | null>
createSettings(settings)	ایجاد تنظیمات اولیه	Promise<ISystemSettings>
isRegistrationEnabled()	بررسی فعال بودن ثبت‌نام	Promise<boolean>
isLoginEnabled()	بررسی فعال بودن ورود	Promise<boolean>
isOtpEnabled()	بررسی فعال بودن OTP	Promise<boolean>
findById(id)	پیدا کردن تنظیمات با ID (از BaseRepository)	Promise<ISystemSettings | null>
findAll(options?)	دریافت همه تنظیمات (از BaseRepository)	Promise<ISystemSettings[]>
delete(id)	حذف تنظیمات (از BaseRepository)	Promise<boolean>
count(where?)	تعداد تنظیمات (از BaseRepository)	Promise<number>
exists(id)	بررسی وجود تنظیمات (از BaseRepository)	Promise<boolean>

*/