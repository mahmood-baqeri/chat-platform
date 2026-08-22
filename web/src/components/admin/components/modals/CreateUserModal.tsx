import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";
import { UserRole } from "@/src/types";

export const CreateUserModal = () => {
  const {
    showCreateUserModal,
    setShowCreateUserModal,
    newUserForm,
    setNewUserForm,
    handleCreateUser
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ایجاد کاربر جدید</h3>
              <button type="button" onClick={() => setShowCreateUserModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" required value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} placeholder="شماره موبایل (مثلا 09121111111)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" required value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} placeholder="نام کاربری (مثلا user_1)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" value={newUserForm.displayName} onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })} placeholder="نام نمایشی" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white">
                <option value="user">کاربر عادی (User)</option>
                <option value="trusted_user">کاربر معتبر (Trusted User)</option>
                <option value="admin">مدیر (Admin)</option>
                <option value="super_admin">مدیر ارشد (Super Admin)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs">ثبت کاربر</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
