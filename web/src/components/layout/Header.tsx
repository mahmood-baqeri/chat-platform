import React from "react";
import { useChat } from "../../store/chatContext";
import {
  MessageSquare,
  ShieldAlert,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  LogOut,
} from "lucide-react";

export const Header: React.FC = () => {
  const {
    currentUser,
    theme,
    setTheme,
    soundEnabled,
    setSoundEnabled,
    setShowAdminPanel,
    setShowProfileModal,
    logout,
  } = useChat();

  return (
    <header className="h-16 bg-[var(--sidebar)] backdrop-blur-md border-b border-[var(--border)] text-[var(--text-primary)] px-4 flex items-center justify-between z-30 shrink-0 transition-colors duration-200">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
          <div className="w-full h-full bg-[var(--sidebar)] rounded-[10px] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight flex items-center gap-2">
            <span>پلتفرم چت حرفه‌ای</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              v2.5 Pro
            </span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل به وب‌سوکت real-time</span>
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "صدای اعلان فعال است" : "صدای اعلان خاموش است"}
          className="hidden sm:flex p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-[var(--text-secondary)]" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="تغییر تم (تاریک / روشن)"
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>

        {/* Admin Dashboard Button */}
        <button
          onClick={() => {
            setShowAdminPanel(true);
            try {
              window.history.pushState({}, "", "/admin");
            } catch (e) {}
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
          title="ورود به پنل مدیریت (/admin)"
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="hidden sm:inline">پنل مدیریت</span>
        </button>

        {/* User Profile Button */}
        {currentUser ? (
          <div className="flex items-center gap-2 mr-2 pl-1 border-r border-[var(--border)] pr-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 group p-1 rounded-xl hover:bg-[var(--list)] transition-all text-right cursor-pointer"
            >
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-500 transition-all"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5" />
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                  {currentUser.displayName}
                </p>
                <p className="text-[10px] text-blue-500 font-mono">
                  @{currentUser.username}
                </p>
              </div>
            </button>

            <button
              onClick={logout}
              title="خروج از حساب"
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => useChat().setShowAuthModal(true)}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
          >
            ورود / ثبت‌نام
          </button>
        )}
      </div>
    </header>
  );
};
