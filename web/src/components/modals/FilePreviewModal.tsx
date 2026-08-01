import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileCode,
  FileSpreadsheet,
  Paperclip,
  Sparkles,
  Check
} from "lucide-react";

interface FilePreviewModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (file: File, caption: string) => Promise<void>;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (file) {
      setCaption("");
      setIsSubmitting(false);

      if (
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type.startsWith("audio/")
      ) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (fileType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-emerald-400" />;
    if (fileType.startsWith("video/")) return <Film className="w-8 h-8 text-purple-400" />;
    if (fileType.startsWith("audio/")) return <Music className="w-8 h-8 text-amber-400" />;
    if (ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar") return <Archive className="w-8 h-8 text-yellow-400" />;
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    if (ext === "js" || ext === "ts" || ext === "html" || ext === "json" || ext === "py") return <FileCode className="w-8 h-8 text-cyan-400" />;
    return <FileText className="w-8 h-8 text-blue-400" />;
  };

  const handleSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSend(file, caption.trim());
      onClose();
    } catch (e) {
      console.error("File preview send error:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--sidebar)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--sidebar)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">پیش‌نمایش و ارسال فایل</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">ارسال فایل به گفت‌وگو</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / File Preview */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Visual Preview Box */}
          <div className="bg-[var(--list)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
            {file.type.startsWith("image/") && previewUrl ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-56 max-w-full object-contain rounded-xl shadow-md"
              />
            ) : file.type.startsWith("video/") && previewUrl ? (
              <video
                src={previewUrl}
                controls
                className="max-h-56 max-w-full rounded-xl bg-black"
              />
            ) : file.type.startsWith("audio/") && previewUrl ? (
              <div className="w-full space-y-3 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
                  <Music className="w-8 h-8" />
                </div>
                <audio src={previewUrl} controls className="w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                  {getFileIcon(file.type, file.name)}
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-xs">{file.name}</p>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-mono font-semibold uppercase">
                  {file.name.split(".").pop() || file.type || "فایل"}
                </span>
              </div>
            )}
          </div>

          {/* File Info Specs */}
          <div className="bg-[var(--list)]/50 border border-[var(--border)] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
            <div className="min-w-0 pr-1">
              <p className="font-bold text-[var(--text-primary)] truncate">{file.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{file.type || "نوع نامشخص"}</p>
            </div>
            <span className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] text-[11px] font-bold shrink-0">
              {formatSize(file.size)}
            </span>
          </div>

          {/* Caption Textarea Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>کپشن (اختیاری)</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-normal">Ctrl + Enter برای ارسال</span>
            </label>
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="توضیحات یا کپشن فایل را بنویسید..."
              rows={3}
              className="w-full bg-[var(--list)] border border-[var(--border)] rounded-2xl p-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--sidebar)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            لغو
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال ارسال...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 rotate-180" />
                <span>ارسال فایل</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
