import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const CreateRoomModal = () => {
  const {
    showCreateRoomModal,
    setShowCreateRoomModal,
    newRoomForm,
    setNewRoomForm,
    handleCreateRoom
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: CREATE ROOM */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateRoom} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ساخت {newRoomForm.type === "group" ? "گروه" : "کانال"} جدید</h3>
              <button type="button" onClick={() => setShowCreateRoomModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-slate-900 border border-white/10 rounded-xl p-2">
                {newRoomForm.avatarUrl ? (
                  <img src={newRoomForm.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">عکس</div>
                )}
                <label className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer hover:bg-cyan-600/30">
                  انتخاب تصویر {newRoomForm.type === "group" ? "گروه" : "کانال"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setNewRoomForm({ ...newRoomForm, avatarUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <input type="text" required value={newRoomForm.title} onChange={(e) => setNewRoomForm({ ...newRoomForm, title: e.target.value })} placeholder="عنوان یا نام..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" value={newRoomForm.username} onChange={(e) => setNewRoomForm({ ...newRoomForm, username: e.target.value })} placeholder="نام کاربری عمومی (مثلا my_group)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <textarea value={newRoomForm.description} onChange={(e) => setNewRoomForm({ ...newRoomForm, description: e.target.value })} placeholder="توضیحات..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateRoomModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs">ایجاد</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
