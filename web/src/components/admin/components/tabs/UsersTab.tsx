import React from "react";
import {
  RotateCcw,
  Search,
  Trash2,
  Edit,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Volume2
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";
import { UserRole } from "@/src/types";
import { ShowImage } from "@/src/utils/showImage";

export const UsersTab = () => {
  const {
    activeTab,
    userSearchQuery,
    setUserSearchQuery,
    userSortBy,
    setUserSortBy,
    userCurrentPage,
    setUserCurrentPage,
    setShowCreateUserModal,
    setEditingUser,
    handleToggleBan,
    handleToggleMute,
    handleRoleChange,
    handleTerminateSessions,
    handleDeleteUser,
    filteredUsers,
    totalUserPages,
    paginatedUsers
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* SEARCH & ACTION BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => { setUserSearchQuery(e.target.value); setUserCurrentPage(1); }}
                placeholder="جستجو بر اساس نام، نام کاربری، شماره موبایل یا شناسه کاربر..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as "name" | "createdAt" | "role" | "messages")}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="name">مرتب‌سازی: نام</option>
                <option value="createdAt">مرتب‌سازی: تاریخ عضویت</option>
                <option value="role">مرتب‌سازی: نقش</option>
                <option value="messages">مرتب‌سازی: تعداد پیام‌ها</option>
              </select>

              {/* <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>ایجاد کاربر جدید</span>
              </button> */}
            </div>
          </div>

          {/* USERS TABLE */}
          <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">کاربر</th>
                    <th className="px-4 py-3">شماره موبایل</th>
                    <th className="px-4 py-3">کد پرسنلی</th>
                    <th className="px-4 py-3">نقش کاربری</th>
                    <th className="px-4 py-3">وضعیت اکانت</th>
                    <th className="px-4 py-3 text-center">آمار فعال</th>
                    <th className="px-4 py-3 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        کاربری یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <ShowImage src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-500/20 group-hover:ring-cyan-500 transition-all" />
                            <div>
                              <p className="font-bold text-slate-100">{u.displayName}</p>

                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{u.phone}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{u.personCode}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(String(u.id), e.target.value as UserRole)}
                            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-cyan-300 focus:outline-none"
                          >
                            <option value="super_admin">مدیر ارشد</option>
                            <option value="admin">مدیر</option>
                            <option value="user">کاربر عادی</option>

                            {/* <option value="owner">مالک (Owner)</option>
                            <option value="moderator">ناظر (Moderator)</option>
                            <option value="room_admin">مدیر روم (Room Admin)</option>
                            <option value="channel_admin">مدیر کانال (Channel Admin)</option>
                            <option value="trusted_user">کاربر معتبر (Trusted)</option>
                            <option value="user">کاربر عادی (User)</option>
                            <option value="guest">مهمان (Guest)</option> */}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleBan(String(u.id))}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${u.isBanned
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                }`}
                            >
                              {u.isBanned ? "مسدودشده (Banned)" : "فعال (Active)"}
                            </button>
                            {/* <button
                              onClick={() => handleToggleMute(String(u.id))}
                              className={`p-1 rounded-md text-[10px] border transition-all ${u.isMuted
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                                }`}
                              title={u.isMuted ? "سکوت فعالم است" : "بی‌صدا کردن"}
                            >
                              {u.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button> */}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-mono text-slate-400">
                            {(u.groupsCount) || 0} گروه • {(u.messagesCount) || 0} پیام
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                              title="ویرایش کاربر"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTerminateSessions(String(u.id))}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              title="بستن نشست‌ها"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(String(u.id))}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              title="حذف کاربر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="p-3 bg-slate-900 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>
                نمایش صفحه {userCurrentPage} از {totalUserPages} ({filteredUsers.length} کاربر یافت شد)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={userCurrentPage === 1}
                  onClick={() => setUserCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={userCurrentPage === totalUserPages}
                  onClick={() => setUserCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
