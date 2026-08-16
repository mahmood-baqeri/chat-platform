import React, { useState, useMemo } from "react";
import { useChat } from "../../store/chatContext";
import { X, Pin, PinOff, Search, Image as ImageIcon, FileText, Music, Video, User } from "lucide-react";
import { Message } from "../../types";
import { ShowImage } from "@/src/utils/showImage";

export const PinnedMessagesModal: React.FC = () => {
  const {
    activeChat,
    messages,
    showPinnedModal,
    setShowPinnedModal,
    togglePinMessage,
    highlightedMessageId,
    setHighlightedMessageId,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState("");

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.isPinned);
  }, [messages]);

  const filteredPinned = useMemo(() => {
    if (!searchQuery.trim()) return pinnedMessages;
    const q = searchQuery.toLowerCase();
    return pinnedMessages.filter((m) =>
      m.content.toLowerCase().includes(q)
    );
  }, [pinnedMessages, searchQuery]);

  if (!showPinnedModal || !activeChat) return null;

  const handleJumpToMessage = (messageId: string) => {
    setShowPinnedModal(false);
    setHighlightedMessageId(messageId);

    setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3000);
  };

  const handleUnpin = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    await togglePinMessage(messageId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-xl max-h-[85vh] text-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="text-[var(--text-primary)]">پیام‌های سنجاق‌شده</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-mono font-bold border border-cyan-500/30">
                  {pinnedMessages.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">گفتگو: {activeChat.title}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPinnedModal(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بین پیام‌های پین‌شده..."
            className="w-full border border border-[var(--border)] rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none placeholder-slate-500 transition-all"
          />
        </div>

        {/* Pinned Messages List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-1 custom-scrollbar">
          {filteredPinned.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Pin className="w-8 h-8 text-slate-600 stroke-[1.5]" />
              <p>{searchQuery ? "هیچ پیام پین‌شده‌ای با این عبارت یافت نشد" : "هنوز هیچ پیامی در این گفتگو پین نشده است"}</p>
            </div>
          ) : (
            filteredPinned.map((msg) => {
              const hasMedia = msg.attachments && msg.attachments.length > 0;
              const attachment = hasMedia ? msg.attachments![0] : null;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleJumpToMessage(String(msg.id))}
                  className="p-3.5 rounded-2xl border border border-[var(--border)] hover:border-cyan-500/40 hover:bg-white/5 transition-all cursor-pointer group flex items-start gap-3 relative"
                >

                  <ShowImage src={msg.senderAvatar} className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/20 group-hover:ring-cyan-500 transition-all" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-cyan-500">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {msg.content && (
                      <p className="text-xs text-[var(--text-primary)]/50 line-clamp-2 leading-relaxed mb-2">
                        {msg.content}
                      </p>
                    )}

                    {/* Media Preview Thumbnail */}
                    {attachment && (
                      <div className="mt-1 flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/5 max-w-xs">
                        {attachment.type === "image" ? (
                          <img src={attachment.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : attachment.type === "video" ? (
                          <Video className="w-6 h-6 text-indigo-400" />
                        ) : attachment.type === "audio" ? (
                          <Music className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <FileText className="w-6 h-6 text-cyan-400" />
                        )}
                        <div className="min-w-0 flex-1 text-[11px]">
                          <p className="font-semibold text-[var(--text-primary)]/50 truncate">{attachment.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(attachment.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unpin Action Button */}
                  <button
                    onClick={(e) => handleUnpin(e, String(msg.id))}
                    title="خروج از حالت پین"
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 opacity-80 group-hover:opacity-100 transition-all shrink-0 self-center"
                  >
                    <PinOff className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
