// web/src/components/modals/ProfileSettingsModal.tsx

import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { permissionManager, PermissionStatus } from "../../utils/permissionManager";
import { X, LogOut, Check, Bell, Mic, Camera, RefreshCw } from "lucide-react";
import { ShowImage } from "@/src/utils/showImage";

export const ProfileSettingsModal: React.FC = () => {
  const {
    showProfileModal,
    setShowProfileModal,
    currentUser,
    setCurrentUser,
    sessions,
    logout,
  } = useChat();

  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [notifPermission, setNotifPermission] = useState<PermissionStatus>("default");
  const [micPermission, setMicPermission] = useState<PermissionStatus>("default");
  const [camPermission, setCamPermission] = useState<PermissionStatus>("default");
  const [notifLoading, setNotifLoading] = useState(false);

  // بررسی مجوزها هنگام باز شدن مودال
  useEffect(() => {
    if (showProfileModal) {
      checkAllPermissions();
    }
  }, [showProfileModal]);

  const checkAllPermissions = async () => {
    setNotifPermission(permissionManager.checkNotificationPermission());
    const mic = await permissionManager.checkMediaPermission("microphone");
    setMicPermission(mic);
    const cam = await permissionManager.checkMediaPermission("camera");
    setCamPermission(cam);
  };

  // ==========================================
  // درخواست مجوز اعلان‌های Push
  // ==========================================
  const handleRequestNotif = async () => {
    setNotifLoading(true);
    try {
      console.log("🔔 درخواست مجوز اعلان...");

      // 1️⃣ دریافت VAPID Public Key از سرور
      console.log("📡 دریافت VAPID Public Key از سرور...");
      const pushConfig = await api.getVapidPublicKey();
      console.log("🔑 VAPID Public Key:", pushConfig?.vapidPublicKey);

      if (!pushConfig?.vapidPublicKey) {
        throw new Error("VAPID Public Key از سرور دریافت نشد");
      }

      // 2️⃣ درخواست مجوز و ثبت اشتراک
      const result = await permissionManager.requestNotificationPermission(
        pushConfig.vapidPublicKey
      );

      setNotifPermission(result.status);

      if (result.status === "granted" && result.subscription) {
        // 3️⃣ ارسال اشتراک به سرور
        console.log("📤 ارسال اشتراک به سرور...");
        await api.subscribePush(result.subscription, String(currentUser?.id || "guest"));
        console.log("✅ اشتراک با موفقیت به سرور ارسال شد");
        setSuccessMsg("✅ مجوز اعلان‌ها با موفقیت فعال شد");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else if (result.status === "denied") {
        alert("❌ مجوز اعلان‌ها در مرورگر مسدود شده است. لطفاً از تنظیمات مرورگر آن را فعال کنید.");
      } else if (result.status === "default") {
        alert("⚠️ درخواست مجوز اعلان لغو شد");
      }

    } catch (err: any) {
      console.error("❌ خطا در درخواست مجوز اعلان:", err);
      alert(err.message || "خطا در دریافت دسترسی اعلان‌ها");
    } finally {
      setNotifLoading(false);
    }
  };

  // ==========================================
  // درخواست مجوز میکروفون
  // ==========================================
  const handleRequestMic = async () => {
    const result = await permissionManager.requestMediaPermission("microphone");
    setMicPermission(result.status);
    if (result.status === "granted") {
      setSuccessMsg("✅ مجوز میکروفون فعال شد");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else if (result.status === "denied") {
      alert(result.message || "مجوز میکروفون مسدود شده است");
    }
  };

  // ==========================================
  // درخواست مجوز دوربین
  // ==========================================
  const handleRequestCam = async () => {
    const result = await permissionManager.requestMediaPermission("camera");
    setCamPermission(result.status);
    if (result.status === "granted") {
      setSuccessMsg("✅ مجوز دوربین فعال شد");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else if (result.status === "denied") {
      alert(result.message || "مجوز دوربین مسدود شده است");
    }
  };

  if (!showProfileModal || !currentUser) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg("");
    try {
      const res = await api.updateProfile({
        userId: String(currentUser.id),
        firstName,
        lastName,
        displayName,
        avatarUrl,
      });
      setCurrentUser(res.user);
      setSuccessMsg("✅ تغییرات با موفقیت ذخیره شدند");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const getStatusText = (status: PermissionStatus) => {
    if (status === "granted") return "✅ مجوز داده شده";
    if (status === "denied") return "🚫 مسدود شده";
    return "📢 درخواست مجوز";
  };

  const getStatusClass = (status: PermissionStatus, color: string) => {
    if (status === "granted") {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
    if (status === "denied") {
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
    return `bg-${color}-600/20 text-${color}-300 border-${color}-500/30 hover:bg-${color}-600/30`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-lg text-[var(--text-primary)] shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5 border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">تنظیمات پروفایل و مجوزات</h3>
          <button
            onClick={() => setShowProfileModal(false)}
            className="p-1.5 rounded-xl bg-[var(--list)] hover:bg-[var(--list-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-2.5 rounded-xl mb-4 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Permissions Section */}
        <div className="bg-[var(--list)] border border-[var(--border)] rounded-2xl p-4 mb-5 space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">دسترسی‌های مرورگر و دستگاه</h4>

          {/* Push Notification */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[var(--text-primary)]/50">
              <Bell className="w-3.5 h-3.5 text-purple-400" />
              <span>اعلان‌های Push مرورگر</span>
            </span>
            <button
              type="button"
              onClick={handleRequestNotif}
              disabled={notifLoading}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${getStatusClass(notifPermission, "purple")} disabled:opacity-50`}
            >
              {notifLoading ? "⏳ در حال..." : getStatusText(notifPermission)}
            </button>
          </div>

          {/* Microphone */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[var(--text-primary)]/50">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>میکروفون (وویس و تماس)</span>
            </span>
            <button
              type="button"
              onClick={handleRequestMic}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${getStatusClass(micPermission, "cyan")}`}
            >
              {getStatusText(micPermission)}
            </button>
          </div>

          {/* Camera */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[var(--text-primary)]/50">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>دوربین (ویدیو/عکس)</span>
            </span>
            <button
              type="button"
              onClick={handleRequestCam}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${getStatusClass(camPermission, "blue")}`}
            >
              {getStatusText(camPermission)}
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleUpdate} className="space-y-4 mb-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <div className="relative group">
              <ShowImage src={avatarUrl} className="w-14 h-14 rounded-full object-cover ring-2 ring-cyan-500/40" />
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-200">تصویر پروفایل</p>
              <p className="text-[10px] text-slate-400 mt-0.5">برای تغییر تصویر روی عکس کلیک کنید</p>
              <label className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer hover:bg-cyan-600/30">
                تغییر تصویر
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]/50 mb-1">نام</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-slate-700 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]/50 mb-1">نام خانوادگی</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-slate-700 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)]/50 mb-1">نام نمایشی</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-slate-700 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isLoading ? "در حال ذخیره‌سازی..." : "ذخیره ویرایش‌های پروفایل"}
          </button>
        </form>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="text-[11px] text-rose-400 flex items-center gap-1 cursor-pointer hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج از حساب کاربری</span>
          </button>
        </div>
      </div>
    </div>
  );
};