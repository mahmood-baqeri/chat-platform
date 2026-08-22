import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const EditUserModal = () => {
  const {
    editingUser,
    setEditingUser,
    handleSaveUserEdit
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveUserEdit} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ویرایش کاربر: {editingUser.displayName}</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">نام نمایشی:</label>
                <input type="text" value={editingUser.displayName} onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">شماره موبایل:</label>
                <input type="text" value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs">ذخیره ویرایش</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
