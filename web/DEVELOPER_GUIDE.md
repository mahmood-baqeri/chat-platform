# راهنمای جامع توسعه‌دهندگان (DEVELOPER_GUIDE.md)

این سند شامل راهنمای گام‌به‌گام و استاندارد مهندسی برای توسعه، تغییر و افزودن فیلدها یا جداول جدید به دیتابیس پروژه پلتفرم گفتگو می‌باشد.

---

## بخش ۱: نحوه افزودن فیلد جدید به جدول موجود (مثال: افزودن `BirthDate` یا `NationalCode` به `Users`)

برای اضافه کردن یک فیلد جدید به جدول موجود (مانند اضافه کردن تاریخ تولد `birthDate` یا کد ملی `nationalCode` به جدول `users`)، مراحل زیر را به ترتیب اجرا نمایید:

### ۱. به‌روزرسانی مدل و طرح پایگاه‌داده (Database Model & Schema)
* **فایل:** `/server.ts` یا ماژول‌های دیتابیس در `/server/db/schema.ts`
* فیلد جدید را به تعاریف جدول و فیلدهای پایه متصل کنید:
  ```typescript
  export interface User {
    id: string;
    username: string;
    fullName: string;
    birthDate?: string;     // فیلد جدید
    nationalCode?: string;  // فیلد جدید
    // ... سایر فیلدها
  }
  ```

### ۲. ایجاد اسکریپت مایگریشن (Database Migration Script)
* اسکریپت مایگریشن برای اعمال تغییرات بر روی پایگاه داده واقعی تولید می‌شود:
  ```sql
  ALTER TABLE users ADD COLUMN birth_date VARCHAR(50) NULL;
  ALTER TABLE users ADD COLUMN national_code VARCHAR(20) NULL;
  ```

### ۳. به‌روزرسانی Repository & Service Layers
* در سرویس مدیریت کاربران (`userService.ts` یا مسیر هندلرهای سرور)، متدهای `createUser` و `updateUser` را به‌روزرسانی کنید تا فیلدهای جدید را دریافت، ذخیره‌سازی و بازگردانی نمایند.

### ۴. اعتبارسنجی ورودی‌ها (Input Validation & Schemas)
* در مسیر API (مانند `POST /api/users/profile`) اعتبارسنجی‌های لازمه را اعمال کنید:
  ```typescript
  if (req.body.nationalCode && !/^\d{10}$/.test(req.body.nationalCode)) {
    return res.status(400).json({ error: "کد ملی ۱۰ رقمی نامعتبر است" });
  }
  ```

### ۵. به‌روزرسانی تایپ‌های فرانت‌اند (Frontend TypeScript Interfaces)
* **فایل:** `/src/types.ts`
* اضافه کردن فیلد به اینترفیس `User`:
  ```typescript
  export interface User {
    id: string;
    name: string;
    username: string;
    birthDate?: string;
    nationalCode?: string;
    // ...
  }
  ```

### ۶. به‌روزرسانی فرم‌ها و پنل مدیریت (Forms & Admin Panel)
* **فایل‌ها:** `/src/components/modals/ProfileSettingsModal.tsx` و `/src/components/admin/AdminDashboard.tsx`
* افزودن ورودی‌های فرم و نمایش در جزییات کاربر و ویرایش پروفایل.

### ۷. تست عملکردی و رگرسیون (Testing)
* تست ارسال درخواست API، ذخیره در دیتابیس و نمایش صحیح در پنل کاربری.

---

## بخش ۲: نحوه ایجاد جدول جدید در دیتابیس

در صورتی که قصد دارید امکان جدیدی مانند **"برچسب‌های پیام" (Message Labels)** اضافه کنید:

1. **Model & Migration:** ایجاد جدول جدید `message_labels` با کلید خارجی `message_id` و `label_id`.
2. **Repository & Service:** ایجاد فایل `labelRepository.ts` و `labelService.ts`.
3. **API Routes:** ایجاد مسیرهای API:
   * `GET /api/labels`
   * `POST /api/labels`
   * `DELETE /api/labels/:id`
4. **Frontend Integration:** ایجاد سرویس متناسب در `/src/services/api.ts` و کامپوننت‌های UI مربوطه.

---

## بخش ۳: اصول کدنویسی و معماری
* تمام داده‌ها باید از دیتابیس واقعی خوانده شوند (هیچ آرایه ثابت یا داده فیک نباید در فرانت‌اند مجزا تعریف شود).
* برای رنگ‌های UI همیشه از متغیرهای سیستم دیزاین و رنگ سازمانی `#09387C` استفاده کنید.
