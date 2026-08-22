import React from "react";
import {
  Search,
  Trash2,
  Plus
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const ForbiddenWordsTab = () => {
  const {
    activeTab,
    fwSearchQuery,
    setFwSearchQuery,
    fwCategoryFilter,
    setFwCategoryFilter,
    setShowAddWordModal,
    handleToggleWordStatus,
    handleDeleteWord,
    filteredWords
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 5: FORBIDDEN WORDS */}
      {activeTab === "forbiddenWords" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={fwSearchQuery}
                  onChange={(e) => setFwSearchQuery(e.target.value)}
                  placeholder="جستجو در لیست کلمات ممنوعه..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={fwCategoryFilter}
                onChange={(e) => setFwCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">همه دسته‌ها</option>
                <option value="political">سیاسی</option>
                <option value="insult">توهین/ناسزا</option>
                <option value="ads">تبلیغات</option>
                <option value="spam">اسپم</option>
                <option value="custom">سفارشی</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddWordModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن کلمه ممنوعه</span>
            </button>
          </div>

          <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">کلمه ممنوعه</th>
                  <th className="px-4 py-3">دسته‌بندی</th>
                  <th className="px-4 py-3">وضعیت فیلتر</th>
                  <th className="px-4 py-3">تاریخ ثبت</th>
                  <th className="px-4 py-3 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredWords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      کلمه ممنوعه‌ای یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((fw) => (
                    <tr key={fw.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-bold text-rose-300">{fw.word}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {fw.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleWordStatus(fw)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${fw.isEnabled
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-slate-800 text-slate-500 border-slate-700"
                            }`}
                        >
                          {fw.isEnabled ? "فعال (مسدودکننده)" : "غیرفعال"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                        {new Date(fw.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleDeleteWord(String(fw.id))}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
