import React from "react";
import {
  Check,
  Search,
  Trash2,
  Copy
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const MessagesTab = () => {
  const {
    activeTab,
    copiedId,
    msgSearchQuery,
    setMsgSearchQuery,
    setEditingMsgModal,
    setNewMsgIdValue,
    setNewMsgContentValue,
    handleDeleteMessageAdmin,
    handleCopyId,
    filteredActiveMessages
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 7: MESSAGES & MESSAGE ID */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          <div className="bg-[#1A1D2B] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={msgSearchQuery}
                onChange={(e) => setMsgSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس متن پیام یا شناسه اختصاصی Message ID (UUID v4)..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">شناسه پیام (Message ID - UUID v4)</th>
                  <th className="px-4 py-3">محتوای پیام</th>
                  <th className="px-4 py-3">شناسه فرستنده</th>
                  <th className="px-4 py-3">تاریخ ثبت</th>
                  <th className="px-4 py-3 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {filteredActiveMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-sans">
                      پیامی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredActiveMessages.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-cyan-400 font-bold">
                        <div className="flex items-center gap-2">
                          <span>{m.id}</span>
                          <button
                            onClick={() => handleCopyId(String(m.id))}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="کپی شناسه"
                          >
                            {copiedId === String(m.id) ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans max-w-xs truncate text-slate-100">{m.content || "[فایل ضمیمه]"}</td>
                      <td className="px-4 py-3 text-slate-400">{m.senderId}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(m.createdAt).toLocaleTimeString("fa-IR")}</td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingMsgModal(m);
                              setNewMsgIdValue(String(m.id));
                              setNewMsgContentValue(m.content);
                            }}
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-sans text-xs cursor-pointer"
                          >
                            ویرایش شناسه
                          </button>
                          <button
                            onClick={() => handleDeleteMessageAdmin(String(m.id))}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-sans text-xs flex items-center gap-1 cursor-pointer"
                            title="حذف پیام از سیستم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
