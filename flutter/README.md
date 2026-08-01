# راهنمای اجرای پروژه فلاتر (Flutter Companion App)

این پروژه نسخه فلاتر (Flutter) پیام‌رسان هوشمند با رعایت کامل اصول **Clean Architecture**، **Feature-First Structure** و مدیریت وضعیت متمرکز **flutter_bloc (BLoC/Cubit)** می‌باشد.

## 🛠 معماری و ساختار پروژه

```
flutter_app/text
├── pubspec.yaml
└── lib/
    ├── main.dart                      # نقطه ورود پروژه و تنظیمات MultiBlocProvider و RTL
    ├── core/                          # لایه هسته سیستم
    │   ├── theme/app_theme.dart       # تم‌های Material 3 (تاریک و روشن)
    │   └── utils/constants.dart       # آدرس‌های REST API و WebSocket
    ├── models/                        # مدل‌های داده (User, Chat, Message, Attachment)
    ├── services/                      # لایه سرویس ارتباطی (REST API Service & WebSocket)
    ├── repositories/                  # لایه مخزن داده (Auth, Chat, Admin Repositories)
    ├── bloc/                          # BLoC و Cubitهای مدیریت وضعیت با flutter_bloc
    │   ├── auth/auth_bloc.dart
    │   └── chat/chat_bloc.dart
    └── features/                      # ماژول‌های جداگانه صفحات پروژه
        ├── splash/                    # صفحه Splash
        ├── auth/                      # صفحات Login و OTP
        ├── home/                      # صفحه اصلی و ناوبری BottomNavigationBar
        ├── chat/                      # صفحات ChatListView و ChatDetailScreen
        ├── profile/                   # صفحه پروفایل
        ├── settings/                  # صفحه تنظیمات
        ├── notifications/             # صفحه اعلان‌ها
        ├── search/                    # صفحه جستجو
        ├── pinned/                    # صفحه پیام‌های پین‌شده
        └── admin/                     # پنل مدیریت سیستم
```

## 🚀 نحوه اتصال به Backend موجود

بک‌اند پروژه همان سرور Express + WebSockets در فایل `server.ts` است. پروژه فلاتر بدون نیاز به کوچکترین تغییر در بک‌اند، مستقیماً به APIها و WebSocket متصل می‌گردد.

1. اجرای پکیج‌ها:
   ```bash
   cd flutter_app
   flutter pub get
   ```

2. اجرا در مرورگر یا شبیه‌ساز:
   ```bash
   flutter run
   ```
