import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { VoiceRecorderModal } from "./VoiceRecorderModal";
import { FilePreviewModal, FileWithCaption } from "../modals/FilePreviewModal";
import { Attachment } from "../../types";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Image as ImageIcon,
  FileText,
  Film,
  Sparkles,
  X,
  Sticker,
  Clock
} from "lucide-react";

interface UploadProgressState {
  fileName: string;
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  cancelFn?: () => void;
}

export const MessageInput: React.FC = () => {
  const {
    activeChat,
    currentUser,
    sendMessage,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    editMessage,
    sendTypingSignal,
    systemSettings,
    drafts,
    setDraft,
  } = useChat();

  const [text, setText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  const footerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fileAccept, setFileAccept] = useState("*");
  const typingTimeoutRef = useRef<any>(null);

  // Close Attachment Menu and Emoji Picker on click outside or ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAttachMenu(false);
        setShowEmojiPicker(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
        setShowEmojiPicker(false);
      }
    };

    if (showAttachMenu || showEmojiPicker) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu, showEmojiPicker]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 400);
      textareaRef.current.style.height = `${nextHeight}px`;
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 400 ? "auto" : "hidden";
    }
  }, [text]);

  const emojis = [
    // 😂 خنده و شادی (محبوب‌ترین)
    "😊", "😂", "🤣", "😄", "😁", "😆", "😅", "🤗", "😋", "😛",
    "😝", "🤪", "🥳", "🎉", "🎊", "🎈", "🎁", "✨", "🌟", "⭐",

    // ❤️ عشق و احساسات
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🥰",
    "😍", "🥹", "😘", "😗", "😙", "😚", "🥲", "☺️", "🙂", "😇",

    // 👍 تایید و مثبت
    "👍", "👏", "🙌", "🤝", "✌️", "🤞", "🫶", "💪", "🤙", "👊",
    "✊", "🤛", "🤜", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌",

    // 😎 باحال و اعتماد به نفس
    "😎", "🤩", "😏", "🥸", "🧐", "🤓", "😜", "😉", "🤨", "🙃",

    // 🔥 انرژی و هیجان
    "🔥", "⚡", "💯", "🚀", "💡", "🎯", "🏆", "🥇", "🥈", "🥉",
    "💎", "🪄", "⭐", "🌟", "✨", "🌈", "☀️", "🌙", "🌊", "⛰️",

    // 🌸 طبیعت و زیبایی
    "🌸", "🌺", "🌻", "🌹", "🥀", "🌷", "🌱", "🌿", "☘️", "🍀",
    "🌵", "🌴", "🌳", "🍃", "🍂", "🍁", "🌾", "🌽", "🍄", "🌼",

    // 😢 ناراحتی و همدردی
    "😢", "😭", "🥺", "😥", "😓", "😔", "😞", "😟", "😕", "🙁",
    "☹️", "😣", "😖", "😫", "😩", "🥹", "😰", "😨", "😧", "😦",

    // 🐱 حیوانات
    "🐱", "🐶", "🐰", "🐼", "🦊", "🐺", "🐨", "🐵", "🐸", "🐧",
    "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐗", "🐴",
    "🦄", "🐝", "🐞", "🦋", "🐙", "🐬", "🐳", "🐊", "🦕", "🦖",

    // 🍕 غذا و نوشیدنی
    "🍕", "🍔", "🍟", "🌭", "🍿", "🧇", "🥞", "🧁", "🍩", "🍪",
    "🍫", "🍬", "🍭", "🍮", "🍯", "🥐", "🥖", "🥨", "🥯", "🧀",
    "🥚", "🍳", "🥓", "🥩", "🍗", "🍖", "🌮", "🌯", "🥙", "🧆",

    // 🎵 سرگرمی
    "🎵", "🎶", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸",
    "🎻", "🪕", "🎮", "🎲", "♟️", "🎯", "🎳", "🎪", "🎭", "🎨",

    // 🏃 ورزش
    "🏃", "🏃‍♂️", "🏃‍♀️", "🚴", "🚴‍♂️", "🚴‍♀️", "🏊", "🏊‍♂️", "🏊‍♀️", "⛹️",
    "⛹️‍♂️", "⛹️‍♀️", "🤸", "🤸‍♂️", "🤸‍♀️", "🧘", "🧘‍♂️", "🧘‍♀️", "🤼", "🤼‍♂️",
    "🤼‍♀️", "🤽", "🤽‍♂️", "🤽‍♀️", "🤾", "🤾‍♂️", "🤾‍♀️", "🏋️", "🏋️‍♂️", "🏋️‍♀️",


    // 💻 تکنولوژی
    "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "📱", "📲", "💾", "📀",
    "💿", "🧮", "📡", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📼",

    // 📚 تحصیل و کار
    "📚", "📖", "📗", "📘", "📙", "📕", "📓", "📔", "📒", "📰",
    "📑", "🔖", "📎", "📏", "📐", "✏️", "✒️", "🖊️", "🖋️", "🖌️",
    "🖍️", "📝", "📃", "📜", "📄", "📋", "📌", "📍", "📌", "🔗",

    // 💰 پول و ثروت
    "💰", "💵", "💴", "💶", "💷", "🪙", "💳", "🧾", "💎", "⚖️",

    // 🎃 مناسبت‌ها
    "🎃", "🕯️", "🪔", "🎄", "🎅", "🤶", "🎁", "🎀", "🎈", "🎉",
    "🎊", "🎋", "🎍", "🎎", "🎏", "🎐", "🎑", "🎒", "🎓", "🧑‍🎓",

    // 🧠 فکری
    "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👄", "👅", "🦻",
    "👂", "👃", "👣", "🧬", "🔬", "🔭", "🧪", "🧫", "🧬", "🩺",

    // 🧘 حالت‌ها
    "🧘", "🧘‍♂️", "🧘‍♀️", "🕉️", "☯️", "✡️", "☸️", "☦️", "🛐", "⛎",
  ];



  // Load draft or editing content
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
    } else if (activeChat) {
      setText(drafts[activeChat.id] || "");
    }
  }, [activeChat?.id, editingMessage]);

  const triggerFileInput = (acceptType: string) => {
    setFileAccept(acceptType);
    setShowAttachMenu(false);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (activeChat && !editingMessage) {
      setDraft(activeChat.id, val);
    }

    // Broadcast typing signal
    if (systemSettings.typingIndicatorEnabled) {
      sendTypingSignal(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingSignal(false);
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !uploadProgress) return;

    if (editingMessage) {
      await editMessage(String(editingMessage.id), text);
      setText("");
      return;
    }

    await sendMessage({ content: text });
    setText("");
  };

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      // Validate file size limit
      const fileSizeMB = file.size / (1024 * 1024);
      if (systemSettings.maxFileSizeMB && fileSizeMB > systemSettings.maxFileSizeMB) {
        alert(`حجم فایل "${file.name}" بیشتر از حد مجاز سیستم (${systemSettings.maxFileSizeMB} مگابایت) است.`);
        continue;
      }

      // Validate allowed file extensions
      if (systemSettings.allowedFileExtensions) {
        const allowedExts = systemSettings.allowedFileExtensions.toLowerCase().split(",").map(s => s.trim());
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && !allowedExts.includes(ext) && !allowedExts.includes("*" + ext)) {
          alert(`پسوند فایل .${ext} مجاز نیست.`);
          continue;
        }
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    const validFiles: File[] = [];
    for (const file of droppedFiles) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (systemSettings.maxFileSizeMB && fileSizeMB > systemSettings.maxFileSizeMB) {
        alert(`حجم فایل "${file.name}" بیشتر از حد مجاز سیستم (${systemSettings.maxFileSizeMB} مگابایت) است.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const executeSendBatchWithCaptions = async (items: FileWithCaption[]) => {
    if (items.length === 0) return;

    for (let idx = 0; idx < items.length; idx++) {
      const { file, caption } = items[idx];

      const { promise, cancel } = api.uploadFileWithProgress(
        file,
        undefined,
        (prog) => {
          setUploadProgress({
            fileName: `فایل (${idx + 1}/${items.length}): ${file.name}`,
            percent: prog.percent,
            uploadedBytes: prog.uploadedBytes,
            totalBytes: prog.totalBytes,
            speedBps: prog.speedBps,
            etaSeconds: prog.etaSeconds,
            cancelFn: cancel,
          });
        }
      );

      setUploadProgress({
        fileName: file.name,
        percent: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        speedBps: 0,
        etaSeconds: 0,
        cancelFn: cancel,
      });

      try {
        const att = await promise;
        const finalCaption = caption || (items.length === 1 ? text.trim() : "") || file.name;
        await sendMessage({
          content: finalCaption,
          type: att.type,
          attachments: [att],
        });
      } catch (err: any) {
        if (err.message !== "آپلود لغو شد") {
          console.error("Upload error:", err);
          alert(err.message || `خطا در بارگذاری فایل ${file.name}`);
        }
      }
    }

    setUploadProgress(null);
    setPendingFiles([]);
    setText("");
  };

  const handleVoiceSend = async (blob: Blob, duration: number, sizeBytes: number, voiceCaption?: string) => {
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type || "audio/webm" });

    const { promise, cancel } = api.uploadFileWithProgress(
      file,
      duration,
      (prog) => {
        setUploadProgress({
          fileName: "پیام صوتی",
          percent: prog.percent,
          uploadedBytes: prog.uploadedBytes,
          totalBytes: prog.totalBytes,
          speedBps: prog.speedBps,
          etaSeconds: prog.etaSeconds,
          cancelFn: cancel,
        });
      }
    );

    setUploadProgress({
      fileName: "پیام صوتی",
      percent: 0,
      uploadedBytes: 0,
      totalBytes: sizeBytes || blob.size,
      speedBps: 0,
      etaSeconds: 0,
      cancelFn: cancel,
    });

    try {
      const att = await promise;
      att.duration = duration;
      const finalCaption = voiceCaption || text.trim() || "پیام صوتی";
      await sendMessage({ content: finalCaption, type: "audio", attachments: [att] });
      setText("");
    } catch (e: any) {
      if (e.message !== "آپلود لغو شد") {
        console.error("Voice send error:", e);
        alert("خطا در ارسال پیام صوتی.");
      }
    } finally {
      setUploadProgress(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const sendSticker = async (url: string) => {
    const att = { id: "stk-" + Date.now(), name: "استیکر", type: "sticker" as const, url, size: 1024, mimeType: "image/png" };
    await sendMessage({ content: "استیکر", type: "sticker", attachments: [att] });
    setShowAttachMenu(false);
  };

  return (
    <div
      ref={footerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-[var(--sidebar)] backdrop-blur-md border-t border-[var(--border)] p-3 relative text-[var(--text-primary)] shrink-0 transition-all duration-200 ${isDragOver ? "border-2 border-dashed border-[#09387C] bg-[#09387C]/5" : ""
        }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={fileAccept}
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* When Voice Recorder is active, hide normal Footer completely */}
      {showVoiceModal ? (
        <VoiceRecorderModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onSendAudio={handleVoiceSend}
        />
      ) : (
        <>
          {/* Upload Progress Indicator HUD */}
          {uploadProgress && (
            <div className="bg-[var(--list)] border border-cyan-500/30 p-3 rounded-2xl mb-2 backdrop-blur-md shadow-xl text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-cyan-500 shrink-0 animate-spin" />
                  <span className="font-bold text-[var(--text-primary)] truncate">{uploadProgress.fileName}</span>
                </div>
                <button
                  onClick={() => uploadProgress.cancelFn?.()}
                  className="p-1 rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
                  title="لغو آپلود"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-150"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                <span>
                  {formatSize(uploadProgress.uploadedBytes)} / {formatSize(uploadProgress.totalBytes)} ({uploadProgress.percent}%)
                </span>
                <span>
                  {formatSpeed(uploadProgress.speedBps)} • {uploadProgress.etaSeconds} ثانیه باقی‌مانده
                </span>
              </div>
            </div>
          )}

          {/* Reply or Edit Banner */}
          {(replyTo || editingMessage) && (
            <div className="bg-[var(--list)] border-r-4 border-cyan-500 p-2.5 rounded-xl mb-2 flex items-center justify-between text-xs backdrop-blur-md">
              <div className="min-w-0 pr-1">
                <p className="font-bold text-cyan-500 mb-0.5">
                  {editingMessage ? "ویرایش پیام" : `پاسخ به ${String(replyTo?.senderId) === String(currentUser?.id) ? "خودتان" : "کاربر"}`}
                </p>
                <p className="text-[var(--text-secondary)] truncate text-[11px]">
                  {editingMessage ? editingMessage.content : replyTo?.content}
                </p>
              </div>
              <button
                onClick={() => {
                  setReplyTo(null);
                  setEditingMessage(null);
                  setText("");
                }}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment Popover */}
          {showAttachMenu && (
            <div className="absolute bottom-16 right-4 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded-2xl p-3 w-64 space-y-2 backdrop-blur-md text-xs">
              <p className="font-bold text-[var(--text-secondary)] mb-2 border-b border-[var(--border)] pb-1">ارسال ضمیمه</p>
              {systemSettings.allowImages && (
                <button
                  onClick={() => triggerFileInput("image/png, image/jpeg, image/gif, image/webp")}
                  className="w-full text-right p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--text-primary)] transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>ارسال تصویر یا عکس</span>
                </button>
              )}
              {systemSettings.allowVideos && (
                <button
                  onClick={() => triggerFileInput("video/mp4, video/webm, video/mkv")}
                  className="w-full text-right p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--text-primary)] transition-colors"
                >
                  <Film className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>ارسال ویدئو</span>
                </button>
              )}
              {systemSettings.allowAudio && (
                <button
                  onClick={() => triggerFileInput("audio/mp3, audio/wav, audio/ogg, audio/webm, audio/m4a")}
                  className="w-full text-right p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--text-primary)] transition-colors"
                >
                  <Mic className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>ارسال فایل صوتی یا موزیک</span>
                </button>
              )}
              {systemSettings.allowDocuments && (
                <button
                  onClick={() => triggerFileInput(".pdf, .docx, .doc, .zip, .rar, .xlsx, .txt")}
                  className="w-full text-right p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--text-primary)] transition-colors"
                >
                  <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>ارسال سند (PDF / Word / ZIP)</span>
                </button>
              )}
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div
              dir="rtl"
              className="absolute bottom-16 right-4 sm:right-12 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded-2xl p-3.5 w-72 sm:w-96 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 text-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      if (textareaRef.current) {
                        const start = textareaRef.current.selectionStart || text.length;
                        const end = textareaRef.current.selectionEnd || text.length;
                        const newText = text.substring(0, start) + emoji + text.substring(end);
                        setText(newText);
                        if (activeChat && !editingMessage) {
                          setDraft(activeChat.id, newText);
                        }
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
                            textareaRef.current.focus();
                          }
                        }, 10);
                      } else {
                        setText((prev) => prev + emoji);
                      }
                    }}
                    className="w-9 h-9 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 hover:scale-125 rounded-xl transition-all cursor-pointer active:scale-95"
                    title={`درج ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Input Controls Row */}
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            {/* Attachment Toggle */}
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2.5 rounded-xl bg-[var(--list)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-cyan-500 transition-colors border border-[var(--border)] shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Emoji Toggle */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-[var(--list)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-amber-500 transition-colors border border-[var(--border)] shrink-0"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Text Area Input */}
            <div className="flex-1 bg-[var(--list)] border border-[var(--border)] rounded-xl px-4 py-1.5 focus-within:border-cyan-500 transition-all flex items-center">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="پیام خود را بنویسید..."
                rows={1}
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none resize-none leading-relaxed py-1 custom-scrollbar max-h-[400px]"
              />
            </div>

            {/* Send / Mic Action */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                disabled={uploadProgress !== null}
                className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20 transition-all shrink-0 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : systemSettings.allowAudio ? (
              <button
                onClick={() => setShowVoiceModal(true)}
                className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all shrink-0"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        </>
      )}

      {/* File Preview & Caption Modal */}
      <FilePreviewModal
        files={pendingFiles}
        isOpen={pendingFiles.length > 0}
        onClose={() => setPendingFiles([])}
        onSend={executeSendBatchWithCaptions}
        onAddMoreFiles={handleFileUpload}
      />
    </div>
  );
};
