import React from "react";
import {
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const SystemTogglesTab = () => {
  const {
    activeTab,
    localSettings,
    setLocalSettings,
    saveSuccess,
    toggleFeature,
    handleSaveToggles
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 9: SYSTEM TOGGLES */}
      {activeTab === "toggles" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="font-bold text-sm text-slate-100">تنظیمات کلیدی پلتفرم</h3>
              <p className="text-xs text-slate-400">غیرفعال‌سازی یا فعال‌سازی آنی فیچرهای اصلی</p>
            </div>
            <button
              onClick={handleSaveToggles}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              ذخیره تنظیمات
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold text-center">
              تنظیمات با موفقیت ذخیره شد.
            </div>
          )}

          {/* Session & Numeric Settings */}
          <div className="p-5 rounded-2xl bg-[#1A1D2B] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-100">مدت زمان اعتبار نشست / لاگین کاربر (بر حسب دقیقه)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">پس از این مدت، کاربر نیاز به احراز هویت مجدد خواهد داشت.</p>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                {(localSettings.sessionTimeoutMinutes || 1440) >= 60
                  ? `${Math.floor((localSettings.sessionTimeoutMinutes || 1440) / 60)} ساعت و ${(localSettings.sessionTimeoutMinutes || 1440) % 60} دقیقه`
                  : `${localSettings.sessionTimeoutMinutes || 1440} دقیقه`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={525600}
                value={localSettings.sessionTimeoutMinutes || 1440}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, sessionTimeoutMinutes: Math.max(1, parseInt(e.target.value, 10) || 1440) }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                placeholder="1440"
              />
              <div className="flex gap-1.5 shrink-0">
                {[
                  { label: "15 دقیقه", value: 15 },
                  { label: "1 ساعت", value: 60 },
                  { label: "24 ساعت", value: 1440 },
                  { label: "7 روز", value: 10080 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setLocalSettings(prev => ({ ...prev, sessionTimeoutMinutes: preset.value }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${localSettings.sessionTimeoutMinutes === preset.value
                      ? "bg-cyan-600 text-white border-cyan-500"
                      : "bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800"
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "registrationEnabled", label: "عضویت کاربران جدید" },
              { key: "loginEnabled", label: "ورود کاربران" },
              { key: "groupsEnabled", label: "قابلیت ساخت گروه" },
              { key: "channelsEnabled", label: "قابلیت ساخت کانال" },
              { key: "allowFileUpload", label: "آپلود فایل" },
              { key: "allowImages", label: "ارسال تصویر" },
              { key: "allowAudio", label: "ارسال صوت & وویس" },
              { key: "editMessageEnabled", label: "ویرایش پیام" },
              { key: "deleteMessageEnabled", label: "حذف پیام" },
            ].map((item) => {
              const val = localSettings[item.key as keyof typeof localSettings];
              return (
                <div key={item.key} className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{item.label}</span>
                  <button
                    onClick={() => toggleFeature(item.key as keyof typeof localSettings)}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${val ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {val ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
