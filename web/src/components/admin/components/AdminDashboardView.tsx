import React from "react";
import {
  X,
  Shield,
  Users,
  MessageSquare,
  FileText,
  Activity,
  ToggleLeft,
  ToggleRight,
  Ban,
  UserCheck,
  Check,
  RotateCcw,
  Sparkles,
  Server,
  Folder,
  Radio,
  Search,
  Trash2,
  Bell,
  HardDrive,
  RefreshCw,
  Plus,
  Key,
  Edit,
  Copy,
  Lock,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Volume2,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAdminDashboardContext } from "../context/AdminDashboardContext";
import { AdminDashboardContent } from "./AdminDashboardContent";
import { AdminDashboardModals } from "./AdminDashboardModals";
export const AdminDashboardView = () => {
  const { showAdminPanel, setShowAdminPanel, currentUser, loadData, activeTab, setActiveTab, usersList, groupsList, channelsList, forbiddenWordsList, messagesData, filesData, pushSubs } = useAdminDashboardContext();
  if (!showAdminPanel) return null;
  if (currentUser && currentUser.role !== "owner" && currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#1A1D2B] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md text-center text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">دسترسی غیرمجاز</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            شما سطح دسترسی مدیر را برای ورود به این پنل ندارید.
          </p>
          <button
            onClick={() => setShowAdminPanel(false)}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#121420] border border-white/10 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">

        {/* HEADER BAR */}
        <div className="px-6 py-4 bg-[#181B28] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                پنل مدیریت سیستم
              </h2>
              <p className="text-[11px] text-slate-400">مدیریت کاربران، گفت‌وگوها، کلمات ممنوعه، دسترسی‌ها و شناسه پیام‌ها</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="بروزرسانی اطلاعات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdminPanel(false)}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 pt-3 bg-[#181B28]/50 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: "overview", label: "آمار کلی", icon: Activity },
            { id: "users", label: "مدیریت کاربران", icon: Users, badge: usersList.length },
            { id: "groups", label: "مدیریت گروه‌ها", icon: Folder, badge: groupsList.length },
            { id: "channels", label: "مدیریت کانال‌ها", icon: Radio, badge: channelsList.length },
            // { id: "forbiddenWords", label: "کلمات ممنوعه", icon: Ban, badge: forbiddenWordsList.length },
            { id: "permissions", label: "نقش‌ها و دسترسی‌ها", icon: Key },
            { id: "messages", label: "پیام‌ها", icon: MessageSquare, badge: messagesData.activeMessages.length },
            { id: "files", label: "مدیریت فایل‌ها", icon: HardDrive, badge: filesData.totalCount },
            // { id: "database", label: "تنظیمات دیتابیس", icon: Database },
            // { id: "smsSettings", label: "تنظیمات پنل پیامک", icon: Bell },
            // { id: "pushNotification", label: "تنظیمات Push Notification", icon: Sparkles, badge: pushSubs.length },
            { id: "toggles", label: "تنظیمات سیستم", icon: ToggleLeft },
            { id: "logs", label: "گزارشات لاگ", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-2.5 rounded-t-2xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${isActive
                  ? "bg-[#121420] text-cyan-400 border-t-2 border-cyan-500 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#121420]">
          <AdminDashboardContent />
        </div>
      </div>
      <AdminDashboardModals />
    </div>
  );
};
