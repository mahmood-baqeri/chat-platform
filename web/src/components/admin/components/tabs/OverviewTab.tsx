import React from "react";
import {
  Server
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const OverviewTab = () => {
  const {
    stats,
    forbiddenWordsList,
    rolePermissionsList,
    activeTab
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 space-y-1">
              <span className="text-xs text-cyan-300/80">کل کاربران سیستم</span>
              <p className="text-2xl font-bold font-mono">{stats.totalUsers}</p>
              <span className="text-[10px] text-cyan-300">({stats.onlineCount} آنلاین)</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
              <span className="text-xs text-emerald-300/80">گفت‌وگوهای فعال</span>
              <p className="text-2xl font-bold font-mono">{stats.activeChats}</p>
              <span className="text-[10px] text-emerald-300">({stats.groupsCount} گروه / {stats.channelsCount} کانال)</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 space-y-1">
              <span className="text-xs text-amber-300/80">کل پیام‌های مبادله‌شده</span>
              <p className="text-2xl font-bold font-mono">{stats.totalMessages}</p>
              <span className="text-[10px] text-amber-300">({stats.deletedMessagesCount} حذف‌شده)</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 space-y-1">
              <span className="text-xs text-indigo-300/80">حجم ذخیره‌سازی فایل‌ها</span>
              <p className="text-2xl font-bold font-mono">{stats.totalStorageMB} MB</p>
              <span className="text-[10px] text-indigo-300">({stats.totalFiles} فایل)</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>وضعیت سرور و اتصال WebSocket</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-1">کلاینت‌های متصل به WS:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{stats.wsConnectedCount} سوکت فعال</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-1">کلمات ممنوعه فعال:</span>
                <span className="font-bold text-rose-400 font-mono text-sm">{forbiddenWordsList.filter(w => w.isEnabled).length} کلمه</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 block mb-1">نقش‌های تعریف‌شده:</span>
                <span className="font-bold text-indigo-400 font-mono text-sm">{rolePermissionsList.length} نقش</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
