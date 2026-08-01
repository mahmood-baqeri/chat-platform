# پلتفرم چت حرفه‌ای، مدرن و مقیاس‌پذیر (Chat Platform)

پلتفرم ارتباطی کاملاً راست‌چین (RTL) الهام‌گرفته از **Telegram**، **Discord**، **Slack** و **WhatsApp** جهت تبادل پیام‌های متنی، چندرسانه‌ای، مدیریت گروه‌ها، کانال‌ها، وب‌سوکت زنده و پنل مدیریت پیشرفته.

---

## 🚀 امکانات و قابلیت‌های اصلی

1. **ارتباطات زنده (Real-Time WebSockets & Pub/Sub)**:
   - تبادل آنی پیام‌ها، تیک‌های تحویل (ارسال شد، تحویل شد، دیده شد)
   - وضعیت آنلاین/آفلاین بودن کاربران
   - نمایش وضعیت «در حال تایپ...» در گروه و چت‌های خصوصی
   - به‌روزرسانی لحظه‌ای کلیدهای تنظیمات سیستم (Dynamic Feature Toggles)

2. **احراز هویت و ورود ایمن (OTP & Multi-Device Sessions)**:
   - ورود با شماره موبایل و کد یکبارمصرف (OTP)
   - قابلیت ثبت‌نام کاربران جدید
   - مدیریت نشست‌های فعال و قابلیت خروج از سایر دستگاه‌ها

3. **چت خصوصی، گروه‌ها و کانال‌ها**:
   - ایجاد گروه‌ها و کانال‌های عمومی و خصوصی
   - لینک دعوت اختصاصی و تولید خودکار QR Code جهت پیوستن سریع
   - نقش‌های کاربری (`Owner`, `Admin`, `Moderator`, `User`)
   - امکان پین کردن پیام‌های مهم

4. **ارسال انواع رسانه و ابزارهای پیشرفته**:
   - متن، تصویر، ویدئو، اسناد (PDF/Office/ZIP)
   - پیام صوتی (Voice Note) با ضبط زنده توسط Web Audio API
   - واکنشت‌ها (Emoji Reactions) با کلیک سریع
   - پاسخ (Reply)، ویرایش پیام، حذف برای خود/همه، هدایت (Forward)
   - ذخیره خودکار پیش‌نویس (Draft Auto-Save)

5. **پنل مدیریت پیشرفته (Admin Dashboard)**:
   - داشبورد جامع با شاخص‌های کلیدی (کاربران، پیام‌ها، فایل‌ها، اتصالات وب‌سوکت)
   - کنترل پویای تمامی ویژگی‌های سیستم (Dynamic Feature Toggles)
   - مدیریت مسدودی کاربران (Ban/Unban) و سطح دسترسی‌ها
   - لاگ‌های سیستمی و گزارش‌های کارکرد سرور

---

## 🛠️ ساختار معماری پروژه

```
├── server.ts                       # سرور اصلی Express + WebSocket + REST API
├── src/
│   ├── types.ts                    # مدلهای داده و اینترفیسهای TypeScript
│   ├── services/
│   │   ├── api.ts                  # سرویس درخواست‌های REST API
│   │   └── websocket.ts            # کلاینت وب‌سوکت با بازاتصال خودکار
│   ├── store/
│   │   └── chatContext.tsx         # مدیریت استیت سراسری React و هندلرهای زنده
│   ├── components/
│   │   ├── layout/ (Header, Sidebar)
│   │   ├── chat/ (ChatPane, MessageItem, MessageInput, VoiceRecorderModal, GroupInfoDrawer)
│   │   ├── modals/ (AuthModal, NewChatModal, ProfileSettingsModal)
│   │   ├── admin/ (AdminDashboard)
│   │   └── media/ (MediaViewerModal)
│   └── App.tsx                     # کامپوننت اصلی برنامه
├── Dockerfile                      # کانفیگ Docker پروتاکشن
└── docker-compose.yml              # داکر کامپوز به همراه Redis و PostgreSQL
```

---

## 💻 راهنمای اجرا

### اجرای محلی (Local Development)
```bash
npm install
npm run dev
```
برنامه روی آدرس `http://localhost:3000` اجرا خواهد شد.

### اجرای تولیدی با داکر (Docker Compose)
```bash
docker-compose up --build -d
```
