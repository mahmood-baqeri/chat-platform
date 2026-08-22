import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";
import { WordCategory } from "@/src/types";

export const AddForbiddenWordModal = () => {
  const {
    showAddWordModal,
    setShowAddWordModal,
    newWordText,
    setNewWordText,
    newWordCategory,
    setNewWordCategory,
    handleAddWord
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: ADD FORBIDDEN WORD */}
      {showAddWordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddWord} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">افزودن کلمه ممنوعه جدید</h3>
              <button type="button" onClick={() => setShowAddWordModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" required value={newWordText} onChange={(e) => setNewWordText(e.target.value)} placeholder="عبارت یا کلمه ممنوعه..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <select value={newWordCategory} onChange={(e) => setNewWordCategory(e.target.value as WordCategory)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white">
                <option value="custom">سفارشی (Custom)</option>
                <option value="political">سیاسی (Political)</option>
                <option value="insult">توهین/ناسزا (Insult)</option>
                <option value="ads">تبلیغات (Ads)</option>
                <option value="spam">اسپم (Spam)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddWordModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">افزودن به لیست</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
