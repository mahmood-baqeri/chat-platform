# راهنمای نصب و راه‌اندازی پروژه (INSTALL.md)

این سند مراحل دقیق راه‌اندازی و دپلوی پلتفرم چت و گفتگو را در محیط‌های توسعه (Development) و عملیاتی (Production) تشریح می‌کند.

---

## ۱. پیش‌نیازها (Prerequisites)
قبل از شروع، از نصب ابزارهای زیر روی سیستم یا سرور اطمینان حاصل کنید:
* **Node.js**: نسخه 18.x یا بالاتر
* **npm** / **bun** / **pnpm**: مدیریت‌کننده‌های پکیج
* **SQLite / PostgreSQL**: پایگاه‌داده اصلی پروژه
* **Redis**: برای مدیریت نشست‌ها (Sessions) و پاپ‌ساب وب‌سوکت
* **Git**: برای مدیریت سورس‌کد

---

## ۲. دریافت سورس‌کد و نصب وابستگی‌ها
```bash
# دریافت مخزن
git clone https://github.com/organization/chat-platform.git
cd chat-platform

# نصب پکیج‌های نود برای بک‌اند و فرانت‌اند
npm install
```

---

## ۳. تنظیم متغیرهای محیطی (Environment Variables)
یک فایل `.env` بر اساس `.env.example` ایجاد کنید:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=sqlite://./chat.db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_optional_gemini_key
```

---

## ۴. راه‌اندازی دیتابیس و اجرای مایگریشن‌ها (Database Migration & Seed)
```bash
# اجرای مایگریشن‌های دیتابیس
npm run db:migrate

# اجرای داده‌های اولیه (Seed Data)
npm run db:seed
```

---

## ۵. راه‌اندازی سرویس‌های جنبی (Redis & WebSockets)
در محیط‌های پروداکشن، سرویس‌های زیر را روشن کنید:
```bash
# اجرای Redis Server
redis-server --daemonize yes
```

---

## ۶. اجرای پروژه در محیط توسعه (Development)
```bash
# اجرای همزمان سرور و فرانت‌اند
npm run dev
```
پروژه در آدرس `http://localhost:3000` در دسترس خواهد بود.

---

## ۷. ساخت و ساختار عملیاتی (Production Build & Start)
```bash
# کامپایل فرانت‌اند و بک‌اند
npm run build

# اجرای پروداکشن
npm start
```

---

## ۸. دپلوی با Docker (اختیاری)
پروژه دارای Dockerfile است:
```bash
docker build -t chat-platform .
docker run -p 3000:3000 --env-file .env chat-platform
```
