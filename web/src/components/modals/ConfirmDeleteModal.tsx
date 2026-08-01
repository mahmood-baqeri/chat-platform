import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "آیا از حذف این مورد اطمینان دارید؟",
  description = "این عملیات قابل بازگشت نیست.",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#181B28] border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm text-center text-white shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 left-4 p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">{description}</p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/30 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? "در حال حذف..." : "حذف"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
