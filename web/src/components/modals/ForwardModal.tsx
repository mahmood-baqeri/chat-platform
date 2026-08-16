import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { Message, Chat, AvatarPhoto } from "../../types";
import { X, Search, Share2, Users, Radio, UserCheck, Check, Send } from "lucide-react";
import { ShowImage } from "@/src/utils/showImage";

interface ForwardModalProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, isOpen, onClose }) => {
  const { chats, activeChat, currentUser, sendMessage, selectChat } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      // وقتی مودال باز میشه، ریست کن
      setSelectedChatId(null);
      setSearchQuery("");
      setIsSending(false);
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  // Filter chats where user is allowed to send message (excluding current active chat room)
  const eligibleChats = chats.filter((chat) => {
    if (activeChat && (chat.id === activeChat.id || chat.id === `chat-${activeChat.id}` || activeChat.id === `chat-${chat.id}`)) {
      return false;
    }
    if (chat.type === "channel") {
      const isOwnerOrAdmin =
        String(chat.ownerId) === String(currentUser?.id) ||
        chat.members?.some((m) => String(m.userId) === String(currentUser?.id) && (m.role === "owner" || m.role === "admin")) ||
        currentUser?.role === "admin" ||
        currentUser?.role === "super_admin";
      return isOwnerOrAdmin;
    }
    return true;
  });

  const filteredChats = eligibleChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    return chat.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleForward = async () => {
    if (!selectedChatId || !message) return;
    setIsSending(true);
    try {
      const senderName = message.senderName || (String(message.senderId) === String(currentUser?.id) ? (currentUser?.displayName || "شما") : "کاربر");

      // Forward message to destination chat
      await sendMessage({
        content: message.content,
        type: message.type,
        attachments: message.attachments,
        forwardedFrom: {
          id: message.senderId,
          name: senderName,
        },
      }, selectedChatId);

      selectChat(selectedChatId);
      handleClose();
    } catch (err: any) {
      alert(err.message || "خطا در هدایت پیام");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedChatId(null);
    setSearchQuery("");
    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg)] border border-white/10 rounded-3xl p-5 max-w-md w-full shadow-2xl text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-500" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]/60">هدایت پیام به گفتگو</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-white/5 border border-[var(--border)] rounded-2xl p-3 text-xs text-slate-300">
          <div className="text-[10px] text-cyan-400 font-bold mb-1">پیش‌نمایش پیام جهت هدایت:</div>
          <p className="truncate line-clamp-2 text-[var(--text-primary)]/80">{message.content || (message.type === "image" ? "📷 تصویر" : message.type === "video" ? "🎥 ویدیو" : message.type === "audio" ? "🎵 پیام صوتی" : "📁 فایل")}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی گفتگو یا گروه..."
            className="w-full bg-white/5 border border-[var(--border)] rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Chat List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
          {filteredChats.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">هیچ گفتگوی معتبری یافت نشد.</div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isSelected
                    ? "bg-cyan-500/20 border-cyan-500/50 text-white"
                    : "bg-white/5 border-[var(--border)] hover:bg-white/10 text-slate-200"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-800 shrink-0">
                      <ShowImage src={chat.avatarUrl} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                        {chat.title}
                        {chat.type === "group" && <Users className="w-3 h-3 text-amber-400 inline" />}
                        {chat.type === "channel" && <Radio className="w-3 h-3 text-purple-400 inline" />}
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)]/30">
                        {chat.type === "direct" ? "گفتگوی شخصی" : chat.type === "group" ? "گروه" : "کانال"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-cyan-400 bg-cyan-500 text-black" : "border-[var(--border)]"
                      }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[var(--border)] hover:bg-white/10 text-[var(--text-primary)] text-xs font-semibold"
          >
            انصراف
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedChatId || isSending}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? "در حال ارسال..." : "ارسال"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};