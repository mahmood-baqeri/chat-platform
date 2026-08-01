import React from "react";
import { MessageSquare, Sparkles, ShieldCheck } from "lucide-react";

interface SplashLoaderProps {
  isLoading: boolean;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col items-center justify-center p-6 transition-opacity duration-500 animate-in fade-in"
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-[#09387C]/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Main Logo & Loader Wrapper */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Icon */}
        <div className="relative group">
          {/* Pulsing Outer Ring */}
          <div className="absolute -inset-3 rounded-3xl bg-[#09387C]/30 blur-md animate-ping opacity-75" />
          
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#09387C] to-[#1a55a8] p-0.5 shadow-2xl shadow-[#09387C]/40 flex items-center justify-center">
            <div className="w-full h-full bg-[var(--sidebar)] rounded-[22px] flex items-center justify-center border border-white/10">
              <MessageSquare className="w-12 h-12 text-[#09387C] transform -rotate-3 transition-transform group-hover:scale-110" />
            </div>
          </div>

          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#09387C] border-2 border-[var(--bg)] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center justify-center gap-2">
            <span>پلتفرم چت و گفتگو</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#09387C]/10 text-[#09387C] border border-[#09387C]/20 font-mono font-bold">
              v2.5 Pro
            </span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#09387C]" />
            <span>ارتباط امن، سریع و هماهنگ</span>
          </p>
        </div>

        {/* Loading Progress Spinner & Message */}
        <div className="flex flex-col items-center space-y-3 pt-4">
          <div className="w-10 h-10 border-3 border-[#09387C]/20 border-t-[#09387C] rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium animate-pulse">
            در حال بارگذاری و راه‌اندازی اطلاعات...
          </p>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="absolute bottom-6 text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>در حال اتصال به وب‌سوکت و سرور مرکزی</span>
      </div>
    </div>
  );
};
