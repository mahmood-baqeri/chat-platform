import React from "react";
import { MessageSquare, Sparkles, ShieldCheck } from "lucide-react";
import { LogoPhoto } from "@/server/models/types";
import { ShowImage } from "@/src/utils/showImage";

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
      <div className="absolute w-96 h-96 rounded-full bg-[var(--main-color)]/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Main Logo & Loader Wrapper */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Icon */}
        <div className="relative group">
          {/* Pulsing Outer Ring */}
          <div className="absolute -inset-3 rounded-3xl bg-[var(--main-color)]/30 blur-md animate-ping opacity-75" />

          <div className="relative w-80 h-30 rounded-3xl bg-gradient-to-tr from-[var(--main-color)] to-[#1a55a8] p-0.5 shadow-2xl shadow-[var(--main-color)]/40 flex items-center justify-center">
            <div className="w-full h-full bg-[var(--sidebar)] rounded-[22px] flex items-center justify-center border border-white/10 p-5">
              <ShowImage src={LogoPhoto} className="w-full h-full object-cover" />
            </div>
          </div>

          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--main-color)] border-2 border-[var(--bg)] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center justify-center gap-2">
            <span>فیـــــــدار</span>
          </h1>
        </div>

        {/* Loading Progress Spinner & Message */}
        <div className="flex flex-col items-center space-y-3 pt-4">
          <div className="w-10 h-10 border-3 border-[var(--main-color)]/20 border-t-[var(--main-color)] rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium animate-pulse">
            در حال بارگذاری و راه‌اندازی اطلاعات...
          </p>
        </div>
      </div>
    </div>
  );
};
