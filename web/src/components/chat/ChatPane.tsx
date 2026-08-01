import React, { useRef, useEffect, useState, UIEvent } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import { ChatSkeletonLoader } from "./ChatSkeletonLoader";
import { FilePreviewModal } from "../modals/FilePreviewModal";
import { Message } from "../../types";
import {
  Users,
  Radio,
  User,
  Pin,
  Info,
  Search,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MoreVertical,
  X,
  Bell,
  Calendar,
  Loader2,
  Upload
} from "lucide-react";

export const ChatPane: React.FC = () => {
  const {
    activeChat,
    messages,
    typingUsers,
    isChatLoading,
    setShowGroupDrawer,
    setShowPinnedModal,
    setMobileView,
    mobileView,
    systemSettings,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    setShowSearchModal,
    sendMessage,
  } = useChat();

  const [showMobileBottomSheet, setShowMobileBottomSheet] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingDroppedFile, setPendingDroppedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (systemSettings.maxFileSizeMB && file.size > systemSettings.maxFileSizeMB * 1024 * 1024) {
        alert(`حجم فایل ${file.name} بیشتر از ${systemSettings.maxFileSizeMB} مگابایت است.`);
        return;
      }
      setPendingDroppedFile(file);
    }
  };

  const handleSendDroppedFile = async (file: File, caption: string) => {
    try {
      const { promise } = api.uploadFileWithProgress(file);
      const uploaded = await promise;
      let msgType: any = "document";
      if (file.type.startsWith("image/")) msgType = "image";
      else if (file.type.startsWith("video/")) msgType = "video";
      else if (file.type.startsWith("audio/")) msgType = "audio";

      await sendMessage({
        content: caption || file.name,
        type: msgType,
        attachments: [uploaded],
      });
      setPendingDroppedFile(null);
    } catch (err: any) {
      alert(err.message || "خطا در آپلود فایل");
    }
  };

  // Auto-scroll to bottom on first load or when new message arrives at bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (isNearBottom || messages.length <= 30) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages.length, activeChat?.id]);

  // Handle scroll for Infinite Scroll (load older messages when user scrolls to top)
  const handleScroll = async (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMoreMessages) {
      prevScrollHeightRef.current = container.scrollHeight;
      await loadMoreMessages();
      // Restore scroll position so content doesn't jump
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
        }
      }, 50);
    }
  };

  if (!activeChat) {
    return (
      <div className={`flex-1 bg-[var(--bg)] flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] ${mobileView === "sidebar" ? "hidden md:flex" : "flex"}`}>
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">گفت‌وگویی انتخاب نشده است</h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
          لطفاً یک گفتگو از لیست انتخاب کنید یا گفتگو/گروه جدیدی ایجاد نمایید.
        </p>
      </div>
    );
  }

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const latestPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;
  const activeTypingList = typingUsers[activeChat.id] || [];
  const actualMemberCount = activeChat.members ? activeChat.members.length : (activeChat.memberCount || 0);

  // Group messages by date
  const formatDateLabel = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (msgDate.getTime() === today.getTime()) return "امروز";
      if (msgDate.getTime() === yesterday.getTime()) return "دیروز";

      return d.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Filter messages for active chat strictly
  const chatMessages = messages.filter((m) => m.chatId === activeChat.id);

  // Build array of items with date header markers
  const groupedItems: { type: "date" | "message"; label?: string; message?: Message }[] = [];
  let currentDateLabel = "";

  chatMessages.forEach((msg) => {
    const label = formatDateLabel(msg.createdAt);
    if (label && label !== currentDateLabel) {
      currentDateLabel = label;
      groupedItems.push({ type: "date", label });
    }
    groupedItems.push({ type: "message", message: msg });
  });

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 bg-[var(--bg)] flex-col h-full min-w-0 relative ${mobileView === "sidebar" ? "hidden md:flex" : "flex"}`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/30 border border-blue-400/50 flex items-center justify-center mb-4 shadow-2xl animate-bounce">
            <Upload className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">فایل را رها کنید</h3>
          <p className="text-xs text-blue-200">جهت ارسال سریع فایل به این گفتگو آن را اینجا رها کنید</p>
        </div>
      )}
      {/* Mobile Streamlined Header Bar */}
      <div className="h-16 px-3 sm:px-4 bg-[var(--sidebar)] border-b border-[var(--border)] text-[var(--text-primary)] flex items-center justify-between shrink-0 backdrop-blur-md z-20 transition-colors duration-200">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile Back Button */}
          <button
            onClick={() => setMobileView("sidebar")}
            className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-all shrink-0 active:scale-95 cursor-pointer"
            title="بازگشت به لیست گفتگوها"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Chat Avatar & Info */}
          <div
            onClick={() => setShowGroupDrawer(true)}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
          >
            <div className="relative shrink-0">
              <img
                src={activeChat.avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150"}
                alt={activeChat.title}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-500 transition-all"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5" />
            </div>

            <div className="text-right min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors flex items-center gap-1.5 truncate">
                <span className="truncate">{activeChat.title}</span>
                {activeChat.type === "group" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono shrink-0 hidden sm:inline-block">
                    {actualMemberCount} عضو
                  </span>
                )}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] flex items-center gap-1 truncate">
                {activeTypingList.length > 0 ? (
                  <span className="text-blue-500 font-medium italic animate-pulse truncate">
                    {activeTypingList.join("، ")} در حال تایپ...
                  </span>
                ) : (
                  <span className="truncate">
                    {activeChat.type === "channel"
                      ? "کانال رسمی"
                      : activeChat.type === "group"
                      ? `${actualMemberCount} عضو`
                      : "آنلاین"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls - Streamlined on Mobile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--list)] transition-colors cursor-pointer"
            title="جستجو در گفتگو"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Pinned Messages Button with badge */}
          <button
            onClick={() => setShowPinnedModal(true)}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors hidden sm:flex cursor-pointer"
            title="پیام‌های پین‌شده"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center border border-[var(--sidebar)]">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Info Button */}
          <button
            onClick={() => setShowGroupDrawer(true)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors hidden sm:flex cursor-pointer"
            title="اطلاعات گفتگو"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Mobile Bottom Sheet Menu Trigger */}
          <button
            onClick={() => setShowMobileBottomSheet(true)}
            className="sm:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
            title="منوی گزینه‌ها"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {latestPinned && (
        <div
          onClick={() => setShowPinnedModal(true)}
          className="bg-amber-500/10 hover:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-500 shrink-0 backdrop-blur-sm z-10 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold shrink-0">آخرین پیام پین‌شده ({pinnedMessages.length}):</span>
            <span className="truncate text-[var(--text-secondary)]">{latestPinned.content || "فایل ضمیمه"}</span>
          </div>
          <span className="text-[10px] text-amber-500/80 hover:underline shrink-0">مشاهده همه</span>
        </div>
      )}

      {/* Message Feed List with Infinite Scroll & Date Grouping */}
      {isChatLoading ? (
        <ChatSkeletonLoader />
      ) : (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sophisticated-chat-bg custom-scrollbar"
        >
          {/* Infinite Scroll Top Loading Indicator */}
          {isLoadingMoreMessages && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-blue-500 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>در حال دریافت پیام‌های قدیمی‌تر...</span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="py-20 text-center text-[var(--text-secondary)]">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-blue-500/40" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">پیامی ثبت نشده است</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">نخستین پیام این گفتگو را بنویسید.</p>
            </div>
          ) : (
            groupedItems.map((item, index) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${item.label}-${index}`} className="flex items-center justify-center my-4 sticky top-2 z-10">
                    <span className="bg-[var(--sidebar)] text-[var(--text-secondary)] border border-[var(--border)] px-3 py-1 rounded-full text-[10px] font-bold shadow-md backdrop-blur-md flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span>{item.label}</span>
                    </span>
                  </div>
                );
              }
              return <MessageItem key={item.message!.id} message={item.message!} />;
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Message Input Box */}
      <MessageInput />

      {/* Mobile Bottom Sheet Menu */}
      {showMobileBottomSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:hidden animate-in fade-in duration-200">
          <div className="bg-[var(--sidebar)] border-t border-[var(--border)] rounded-t-3xl p-5 w-full shadow-2xl text-[var(--text-primary)] space-y-3 animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <img
                  src={activeChat.avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150"}
                  alt={activeChat.title}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="font-bold text-sm truncate">{activeChat.title}</span>
              </div>
              <button
                onClick={() => setShowMobileBottomSheet(false)}
                className="p-1 rounded-xl bg-[var(--list)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  setShowMobileBottomSheet(false);
                  setShowSearchModal(true);
                }}
                className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center gap-3 text-[var(--text-primary)] font-medium"
              >
                <Search className="w-4 h-4 text-blue-500" />
                <span>جستجو در گفتگو</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileBottomSheet(false);
                  setShowPinnedModal(true);
                }}
                className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center justify-between text-[var(--text-primary)] font-medium"
              >
                <div className="flex items-center gap-3">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <span>پیام‌های پین‌شده</span>
                </div>
                {pinnedMessages.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold font-mono text-[10px]">
                    {pinnedMessages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowMobileBottomSheet(false);
                  setShowGroupDrawer(true);
                }}
                className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center gap-3 text-[var(--text-primary)] font-medium"
              >
                <Info className="w-4 h-4 text-emerald-500" />
                <span>اطلاعات و اعضای گفتگو</span>
              </button>
            </div>

            <button
              onClick={() => setShowMobileBottomSheet(false)}
              className="w-full py-3 rounded-2xl bg-[var(--list)] text-[var(--text-secondary)] font-bold text-xs"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop File Preview Modal */}
      <FilePreviewModal
        file={pendingDroppedFile}
        isOpen={!!pendingDroppedFile}
        onClose={() => setPendingDroppedFile(null)}
        onSend={handleSendDroppedFile}
      />
    </main>
  );
};
