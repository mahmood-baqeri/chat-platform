import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";
import { ShowImage } from "@/src/utils/showImage";
import { NonePhoto } from "@/src/types";


export const EditRoomModal = () => {
  const {
    editingRoom,
    setEditingRoom,
    handleSaveRoomEdit
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: EDIT ROOM */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveRoomEdit} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ویرایش {editingRoom.title}</h3>
              <button type="button" onClick={() => setEditingRoom(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-slate-900 border border-white/10 rounded-xl p-2">
                <ShowImage src={editingRoom.avatarUrl} className="w-10 h-10 rounded-full object-cover" defaultAvatar={NonePhoto} />
                <label className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer hover:bg-cyan-600/30">
                  تغییر تصویر {editingRoom.type === "group" ? "گروه" : "کانال"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setEditingRoom({ ...editingRoom, avatarUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">عنوان:</label>
                <input type="text" value={editingRoom.title} onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">توضیحات:</label>
                <textarea value={editingRoom.description || ""} onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingRoom.isPrivate} onChange={(e) => setEditingRoom({ ...editingRoom, isPrivate: e.target.checked })} className="accent-cyan-500" />
                  <span>خصوصی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingRoom.isArchived || false} onChange={(e) => setEditingRoom({ ...editingRoom, isArchived: e.target.checked })} className="accent-cyan-500" />
                  <span>آرشیو شده</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs">ذخیره تغییرات</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
