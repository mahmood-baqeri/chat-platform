import React from "react";
import {
  FileText,
  Trash2
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const FilesTab = () => {
  const {
    filesData,
    activeTab,
    handleDeleteFile
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 8: FILES MANAGEMENT */}
      {activeTab === "files" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
            <span>تعداد کل فایل‌های آپلودشده: <strong className="text-cyan-400 font-mono">{filesData.totalCount}</strong></span>
            <span>حجم کل: <strong className="text-emerald-400 font-mono">{filesData.totalSizeMB} MB</strong></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filesData.files.map((f) => (
              <div key={f.id} className="p-3.5 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-cyan-400" />
                  <div>
                    <p className="font-bold text-slate-200">{f.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {((f.size || 0) / 1024).toFixed(1)} KB • {f.mimeType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(f.id)}
                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
