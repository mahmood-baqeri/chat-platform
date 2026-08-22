//  web/src/components/layout/Header.tsx

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
import { ShowImage } from "@/src/utils/showImage";
import { LogoPhoto } from "@/src/types";

export const Header: React.FC = () => {
  const {
    currentUser,
    theme,
    setTheme,
    soundEnabled,
    setSoundEnabled,
    setShowAdminPanel,
    setShowProfileModal,
    setShowAuthModal,
    mobileView,
  } = useChat();

  // تشخیص موبایل
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // اگر در موبایل هستیم و در صفحه چت هستیم، هدر رو نشون نده
  if (isMobile && mobileView === 'chat') {
    return null;
  }

  return (
    <header className="h-16 bg-[var(--sidebar)] backdrop-blur-md border-b border-[var(--border)] text-[var(--text-primary)] sm:px-4 px-2 flex items-center justify-between z-30 shrink-0 transition-colors duration-200">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="w-20 sm:w-32 sm:h-10 h-8">
          <ShowImage src={LogoPhoto} className="w-20 sm:w-32 sm:h-10 h-8" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight flex items-center gap-2">
            <span>فیــــدار</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/20 font-vazir  hidden sm:block">
              v2.5 Pro
            </span>
          </h1>
          <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>آنلاین</span>
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        {/* <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "صدای اعلان فعال است" : "صدای اعلان خاموش است"}
          className="hidden sm:flex p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-[var(--text-secondary)]" />}
        </button> */}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="تغییر تم (تاریک / روشن)"
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-500" />}
        </button>

        {/* Admin Dashboard Button - Rendered ONLY if user has admin permission */}
        {(currentUser?.role === "admin" || currentUser?.role === "owner" || currentUser?.role === "super_admin") && (
          <button
            onClick={() => {
              setShowAdminPanel(true);
              try {
                window.history.pushState({}, "", "/admin");
              } catch (e) { }
            }}
            className="flex items-center gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
            title="ورود به پنل مدیریت"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">پنل مدیریت</span>
          </button>
        )}

        {/* User Profile Button */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-1 border-r border-[var(--border)] pr-2">
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
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5" />
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                  {currentUser.displayName}
                </p>
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
          >
            ورود
          </button>
        )}
      </div>
    </header>
  );
};