import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Info
} from "lucide-react";

export interface FileWithCaption {
  file: File;
  caption: string;
}

interface FilePreviewItem {
  id: string;
  file: File;
  caption: string;
  previewUrl: string | null;
}

interface FilePreviewModalProps {
  files: File[];
  isOpen: boolean;
  onClose: () => void;
  onSend: (items: FileWithCaption[]) => Promise<void>;
  onAddMoreFiles?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  files,
  isOpen,
  onClose,
  onSend,
  onAddMoreFiles,
}) => {
  const [items, setItems] = useState<FilePreviewItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (files && files.length > 0) {
      const newItems: FilePreviewItem[] = files.map((f, idx) => {
        let previewUrl: string | null = null;
        if (
          f.type.startsWith("image/") ||
          f.type.startsWith("video/") ||
          f.type.startsWith("audio/")
        ) {
          previewUrl = URL.createObjectURL(f);
        }
        return {
          id: `${f.name}-${f.size}-${idx}-${Date.now()}`,
          file: f,
          caption: "",
          previewUrl,
        };
      });

      setItems(newItems);
      setSelectedIndex(0);
      setIsSubmitting(false);

      return () => {
        newItems.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
      };
    } else {
      setItems([]);
      setSelectedIndex(0);
    }
  }, [files]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[selectedIndex] || items[0];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (fileType.startsWith("image/")) return <ImageIcon className="w-7 h-7 text-emerald-500" />;
    if (fileType.startsWith("video/")) return <Film className="w-7 h-7 text-purple-500" />;
    if (fileType.startsWith("audio/")) return <Music className="w-7 h-7 text-amber-500" />;
    if (ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar") return <Archive className="w-7 h-7 text-yellow-500" />;
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return <FileSpreadsheet className="w-7 h-7 text-emerald-600" />;
    if (ext === "js" || ext === "ts" || ext === "html" || ext === "json" || ext === "py") return <FileCode className="w-7 h-7 text-cyan-500" />;
    return <FileText className="w-7 h-7 text-cyan-500" />;
  };

  const updateCaption = (idx: number, caption: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, caption } : item))
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => {
      const removed = prev[idx];
      if (removed && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        onClose();
      } else if (selectedIndex >= updated.length) {
        setSelectedIndex(updated.length - 1);
      }
      return updated;
    });
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setSelectedIndex(to);
  };

  const handleSendAll = async () => {
    if (isSubmitting || items.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload: FileWithCaption[] = items.map((item) => ({
        file: item.file,
        caption: item.caption.trim(),
      }));
      await onSend(payload);
      onClose();
    } catch (e) {
      console.error("Batch file send error:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--sidebar)] border border-[var(--border)] rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col text-[var(--text-primary)] overflow-hidden my-auto relative">

        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--sidebar)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>پیش‌نمایش و ارسال ضمیمه‌ها</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500 text-white font-mono font-bold">
                  {items.length} فایل
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">ارسال همزمان چند فایل با کپشن اختصاصی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

          {/* Main Selected File Display */}
          {currentItem && (
            <div className="bg-[var(--list)] border border-[var(--border)] rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-500 font-mono text-[10px] font-bold">
                    فایل {selectedIndex + 1} از {items.length}
                  </span>
                  <span className="font-bold truncate text-[var(--text-primary)]">{currentItem.file.name}</span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0">
                  {formatSize(currentItem.file.size)}
                </span>
              </div>

              {/* File Preview Visual Box */}
              <div className="bg-black/5 dark:bg-black/30 border border-[var(--border)] rounded-xl p-3 flex items-center justify-center min-h-[160px] max-h-[220px] overflow-hidden relative">
                {currentItem.file.type.startsWith("image/") && currentItem.previewUrl ? (
                  <img
                    src={currentItem.previewUrl}
                    alt={currentItem.file.name}
                    className="max-h-52 max-w-full object-contain rounded-lg shadow-sm"
                  />
                ) : currentItem.file.type.startsWith("video/") && currentItem.previewUrl ? (
                  <video
                    src={currentItem.previewUrl}
                    controls
                    className="max-h-52 max-w-full rounded-lg bg-black"
                  />
                ) : currentItem.file.type.startsWith("audio/") && currentItem.previewUrl ? (
                  <div className="w-full space-y-3 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Music className="w-7 h-7" />
                    </div>
                    <audio src={currentItem.previewUrl} controls className="w-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-2 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-100/10 border border-cyan-500/20 flex items-center justify-center">
                      {getFileIcon(currentItem.file.type, currentItem.file.name)}
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-xs">{currentItem.file.name}</p>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 text-[10px] font-mono font-semibold">
                      {currentItem.file.name.split(".").pop() || currentItem.file.type || "فایل"}
                    </span>
                  </div>
                )}
              </div>

              {/* Independent Caption Textarea */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>کپشن اختصاصی این فایل:</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-normal">اختیاری</span>
                </label>
                <textarea
                  value={currentItem.caption}
                  onChange={(e) => updateCaption(selectedIndex, e.target.value)}
                  placeholder={`توضیحات مربوط به "${currentItem.file.name}"...`}
                  rows={2}
                  className="w-full bg-[var(--sidebar)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-cyan-500 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Files Multi-Selection Strip & Quick List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-cyan-500" />
                <span>لیست تمام فایل‌های انتخاب شده ({items.length})</span>
              </span>
              {onAddMoreFiles && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (onAddMoreFiles) onAddMoreFiles(e);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-cyan-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن فایل بیشتر</span>
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                      ? "bg-cyan-500/10 border-cyan-500 shadow-sm"
                      : "bg-[var(--list)] border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                      <div className="w-8 h-8 rounded-lg bg-[var(--sidebar)] border border-[var(--border)] flex items-center justify-center shrink-0">
                        {getFileIcon(item.file.type, item.file.name)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-cyan-500" : "text-[var(--text-primary)]"}`}>
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {formatSize(item.file.size)} {item.caption ? `• کپشن: ${item.caption}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-[var(--text-secondary)]"
                        title="انتقال به بالا"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(idx, idx + 1);
                        }}
                        disabled={idx === items.length - 1}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 text-[var(--text-secondary)]"
                        title="انتقال به پایین"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(idx);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                        title="حذف این فایل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--sidebar)] shrink-0 flex items-center justify-between gap-3">
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 hidden sm:flex">
            <Info className="w-3.5 h-3.5 text-cyan-500" />
            <span>تمام فایل‌ها با یک درخواست ارسال می‌شوند</span>
          </div>

          <div className="flex items-center gap-2.5 mr-auto">
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
              onClick={handleSendAll}
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-[#072a5e] text-white text-xs font-bold shadow-md shadow-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال همه فایل‌ها ({items.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
