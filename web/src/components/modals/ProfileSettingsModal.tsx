import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { permissionManager, PermissionStatus } from "../../utils/permissionManager";
import { X, User, Laptop, Smartphone, Shield, LogOut, Check, Moon, Sun, Bell, Volume2, VolumeX, Mic, Camera, Lock } from "lucide-react";

export const ProfileSettingsModal: React.FC = () => {
  const {
    showProfileModal,
    setShowProfileModal,
    currentUser,
    setCurrentUser,
    sessions,
    themeMode,
    toggleTheme,
    soundEnabled,
    setSoundEnabled,
  } = useChat();

  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [notifPermission, setNotifPermission] = useState<PermissionStatus>("default");
  const [micPermission, setMicPermission] = useState<PermissionStatus>("default");
  const [camPermission, setCamPermission] = useState<PermissionStatus>("default");

  useEffect(() => {
    if (showProfileModal) {
      setNotifPermission(permissionManager.checkNotificationPermission());
      permissionManager.checkMediaPermission("microphone").then(setMicPermission);
      permissionManager.checkMediaPermission("camera").then(setCamPermission);
    }
  }, [showProfileModal]);

  const handleRequestNotif = async () => {
    try {
      const cfg = await api.getPushSettings();
      const res = await permissionManager.requestNotificationPermission(cfg?.vapidPublicKey);
      setNotifPermission(res.status);
      if (res.status === "granted" && res.subscription) {
        await api.subscribePush(res.subscription, currentUser?.id);
      }
    } catch (err: any) {
      alert(err.message || "خطا در دریافت دسترسی اعلان‌ها");
    }
  };

  const handleRequestMic = async () => {
    const res = await permissionManager.requestMediaPermission("microphone");
    setMicPermission(res.status);
    if (res.status === "denied") alert(res.message);
  };

  const handleRequestCam = async () => {
    const res = await permissionManager.requestMediaPermission("camera");
    setCamPermission(res.status);
    if (res.status === "denied") alert(res.message);
  };

  if (!showProfileModal || !currentUser) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg("");
    try {
      const res = await api.updateProfile({
        userId: currentUser.id,
        firstName,
        lastName,
        displayName,
        username,
        bio,
      });
      setCurrentUser(res.user);
      setSuccessMsg("تغییرات با موفقیت ذخیره شدند");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateOtherSessions = async () => {
    if (confirm("آیا مایلید تمام نشست‌های فعال در سایر دستگاه‌ها بسته شوند؟")) {
      await api.terminateOtherSessions(currentUser.id, sessions[0]?.id || "");
      alert("تمام نشست‌های دیگر غیرفعال شدند");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-lg text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <h3 className="font-bold text-sm text-slate-100">تنظیمات پروفایل، پوسته و اعلام‌ها</h3>
          <button
            onClick={() => setShowProfileModal(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
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

        {/* Quick App Preferences Section (Theme & Sound) */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 mb-2">تنظیمات ظاهر و صداها</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
              {themeMode === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              <span>حالت پوسته (تاریک / روشن)</span>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold transition-all"
            >
              {themeMode === "dark" ? "حالت تاریک" : "حالت روشن"}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              <span>صدای هشدار پیام جدید</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                soundEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/30"
              }`}
            >
              {soundEnabled ? "فعال" : "غیرفعال"}
            </button>
          </div>

          {/* Device Permissions Controls */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <h5 className="text-[11px] font-bold text-slate-400 mb-1">دسترسی‌های مرورگر و دستگاه</h5>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <Bell className="w-3.5 h-3.5 text-purple-400" />
                <span>اعلان‌های Push مرورگر</span>
              </span>
              <button
                type="button"
                onClick={handleRequestNotif}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  notifPermission === "granted"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : notifPermission === "denied"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : "bg-purple-600/20 text-purple-300 border-purple-500/30"
                }`}
              >
                {notifPermission === "granted" ? "مجوز داده شده" : notifPermission === "denied" ? "مسدود شده" : "درخواست مجوز"}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>میکروفون (وویس و تماس)</span>
              </span>
              <button
                type="button"
                onClick={handleRequestMic}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  micPermission === "granted"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : micPermission === "denied"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : "bg-cyan-600/20 text-cyan-300 border-cyan-500/30"
                }`}
              >
                {micPermission === "granted" ? "مجوز داده شده" : micPermission === "denied" ? "مسدود شده" : "درخواست مجوز"}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>دوربین (ویدیو/عکس)</span>
              </span>
              <button
                type="button"
                onClick={handleRequestCam}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  camPermission === "granted"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : camPermission === "denied"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : "bg-blue-600/20 text-blue-300 border-blue-500/30"
                }`}
              >
                {camPermission === "granted" ? "مجوز داده شده" : camPermission === "denied" ? "مسدود شده" : "درخواست مجوز"}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">نام</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">نام خانوادگی</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">نام نمایشی</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">نام کاربری (آیدی)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">بیوگرافی کوتاه</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none resize-none"
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

        {/* Multi Device Active Sessions Management */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>نشست‌های فعال (ورود چند دستگاهی)</span>
            </span>
            <button
              onClick={handleTerminateOtherSessions}
              className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از سایر دستگاه‌ها</span>
            </button>
          </div>

          <div className="space-y-2">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {sess.deviceName.includes("Android") ? (
                    <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" />
                  ) : (
                    <Laptop className="w-5 h-5 text-cyan-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-200">{sess.deviceName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {sess.ipAddress} • {sess.lastActive}
                    </p>
                  </div>
                </div>
                {sess.isCurrent && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    جلسه کنونی
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
