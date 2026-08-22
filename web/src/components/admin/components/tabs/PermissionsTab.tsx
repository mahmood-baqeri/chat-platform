import React from "react";
import {
  Check
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const PermissionsTab = () => {
  const {
    rolePermissionsList,
    activeTab,
    permSaveSuccess,
    handleTogglePermission,
    handleSavePermissions
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 6: PERMISSIONS (RBAC MATRIX) */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
            <div>
              <h3 className="font-bold text-sm text-slate-100">ماتریس سطح دسترسی نقش‌ها (RBAC Matrix)</h3>
              <p className="text-xs text-slate-400">تنظیم دقیق مجوزهای دسترسی سیستم بر اساس 9 نقش تعریف‌شده (بدون کدنویسی سخت)</p>
            </div>
            <button
              onClick={handleSavePermissions}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره تغییرات ماتریس</span>
            </button>
          </div>

          {permSaveSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold text-center">
              ماتریس دسترسی‌ها با موفقیت در پایگاه‌داده ذخیره شد.
            </div>
          )}

          <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-center text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-300 text-[11px] border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 text-right">نقش کاربری</th>
                  <th className="px-2 py-3">ایجاد گروه</th>
                  <th className="px-2 py-3">ایجاد کانال</th>
                  <th className="px-2 py-3">حذف گروه</th>
                  <th className="px-2 py-3">حذف کانال</th>
                  <th className="px-2 py-3">افزودن عضو</th>
                  <th className="px-2 py-3">اخراج عضو</th>
                  <th className="px-2 py-3">ارسال پیام</th>
                  <th className="px-2 py-3">آپلود فایل</th>
                  <th className="px-2 py-3">پنل مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rolePermissionsList.map((rp, idx) => (
                  <tr key={rp.role} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-bold text-right text-slate-100">{rp.roleNameFa}</td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.createGroup} onChange={() => handleTogglePermission(idx, "createGroup")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.createChannel} onChange={() => handleTogglePermission(idx, "createChannel")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.deleteGroup} onChange={() => handleTogglePermission(idx, "deleteGroup")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.deleteChannel} onChange={() => handleTogglePermission(idx, "deleteChannel")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.addMember} onChange={() => handleTogglePermission(idx, "addMember")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.removeMember} onChange={() => handleTogglePermission(idx, "removeMember")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.sendMessage} onChange={() => handleTogglePermission(idx, "sendMessage")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.uploadFiles} onChange={() => handleTogglePermission(idx, "uploadFiles")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                    <td className="px-2 py-3">
                      <input type="checkbox" checked={rp.permissions.accessAdminPanel} onChange={() => handleTogglePermission(idx, "accessAdminPanel")} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
