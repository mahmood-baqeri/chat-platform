import React, { useState, useEffect, useRef } from "react";
import { Message, MessageType, NonePhoto } from "../../types";
import { useChat } from "../../store/chatContext";
import { AudioPlayer } from "./AudioPlayer";
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal";
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Share2,
  Smile,
  FileText,
  Play,
  Pause,
  Download,
  Image as ImageIcon,
  Clock,
  Sparkles,
  Eye,
  X,
  UserCheck
} from "lucide-react";
import { ShowImage } from "@/src/utils/showImage";
import { api } from "@/src/services/api";

interface Props {
  message: Message;
  isFirstInGroup?: boolean;
}

export const MessageItem: React.FC<Props> = ({ message, isFirstInGroup = true }) => {
  const {
    activeChat,
    currentUser,
    systemSettings,
    toggleReaction,
    togglePinMessage,
    deleteMessage,
    setReplyTo,
    setEditingMessage,
    setForwardingMessage,
    setActiveMediaUrl,
    setShowAdminPanel,
    highlightedMessageId,
    activeOpenMenuId,
    setActiveOpenMenuId,
    jumpToMessage,
    selectChat,
    chats,
    refreshChats
  } = useChat();

  const [showSeenModal, setShowSeenModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMe = String(currentUser?.id) === String(message.senderId);
  const isMenuOpen = activeOpenMenuId === `menu-${message.id}`;
  const isReactionOpen = activeOpenMenuId === `reaction-${message.id}`;

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🙏", "🎉"];

  // Click outside and ESC key listener for closing menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMenuOpen || isReactionOpen) {
          setActiveOpenMenuId(null);
        }
        if (showSeenModal) {
          setShowSeenModal(false);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (isMenuOpen || isReactionOpen)
      ) {
        setActiveOpenMenuId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, isReactionOpen, showSeenModal, setActiveOpenMenuId]);

  const toggleMenu = () => {
    if (isMenuOpen) {
      setActiveOpenMenuId(null);
    } else {
      setActiveOpenMenuId(`menu-${message.id}`);
    }
  };

  const toggleReactionPicker = () => {
    if (isReactionOpen) {
      setActiveOpenMenuId(null);
    } else {
      setActiveOpenMenuId(`reaction-${message.id}`);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderAttachments = () => {
    let list = message.attachments || [];

    // Fallback for voice messages missing attachment array
    if (list.length === 0 && message.type === "audio") {
      list = [
        {
          id: message.id + "-voice-fallback",
          name: "پیام صوتی",
          type: "audio",
          url: message.content,
          size: 0,
          mimeType: "audio/webm",
        },
      ];
    }

    if (list.length === 0) return null;

    return (
      <div className="space-y-2">
        {list.map((att) => {
          const isAudio =
            att.type === "audio" ||
            message.type === "audio" ||
            att.mimeType?.startsWith("audio/") ||
            att.url?.startsWith("data:audio/");

          if (isAudio) {
            return (
              <AudioPlayer
                key={att.id || message.id}
                attachment={att}
                isMe={isMe}
                onDelete={isMe ? () => setShowConfirmDelete(true) : undefined}
              />
            );
          }

          if (att.type === "image") {
            return (
              <div
                key={att.id}
                onClick={() => setActiveMediaUrl({ url: att.url, type: "image", name: att.name })}
                className="relative rounded-2xl overflow-hidden cursor-pointer group max-w-sm border border-slate-700/50 shadow-md"
              >
                <ShowImage src={att.url} defaultAvatar={NonePhoto} className="w-full max-h-64 object-cover group-hover:scale-105 transition-all duration-300" />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1 bg-slate-900/80 text-white text-xs rounded-xl backdrop-blur-sm">
                    مشاهده عکس
                  </span>
                </div>
              </div>
            );
          }

          if (att.type === "video") {
            return (
              <div key={att.id} className="rounded-2xl overflow-hidden max-w-sm border border-slate-700/50 shadow-md">
                <video src={att.url} controls className="w-full max-h-60 rounded-2xl bg-black" />
              </div>
            );
          }

          // Document / File
          return (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/90 border border-slate-700/60 max-w-xs text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs font-semibold truncate text-slate-200">{att.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{(att.size / 1024).toFixed(1)} KB</p>
              </div>
              <a
                href={att.url}
                download={att.name}
                className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  const isHighlighted = highlightedMessageId === message.id;
  const seenCount = message.seenBy?.length || 0;
  const isUnread = !isMe && !!currentUser && (!message.seenBy || !message.seenBy.some((s) => String(s.userId) === String(currentUser.id)));


  const handleSelectContact = async (contactId: string | number, contactName: string | undefined, contactAvatar: string | undefined) => {
    if (!currentUser) return;
    if (!contactId) return;

    try {
      // 1. Check if direct chat already exists in active chats
      let targetChat = chats.find(
        (chat) =>
          chat.type === "direct" &&
          chat.members?.some((m) => String(m.userId) === String(contactId))
      );


      // 3. Create direct chat via backend if none exists
      if (!targetChat) {
        const newChatData = await api.createChat({
          type: "direct",
          title: contactName,
          avatarUrl: contactAvatar,
          members: [
            { userId: currentUser.id, role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
            { userId: contactId, role: "user", joinedAt: new Date().toISOString(), isMuted: false },
          ],
        });

        await refreshChats();
        targetChat = newChatData;
      }

      selectChat(targetChat.id);
    } catch (err: any) {
      alert(err.message || "خطا در برقراری ارتباط با مخاطب");
    } finally {
    }
  };


  return (
    <div
      ref={containerRef}
      id={`message-${message.id}`}
      data-message-id={message.id}
      data-unread={isUnread ? "true" : "false"}
      className={`message-item flex flex-col mb-1 group relative transition-all duration-300 p-1 rounded-2xl ${isHighlighted ? "ring-2 ring-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20 scale-[1.01]" : ""
        } ${isMe ? "items-start" : "items-end"}`}
    >
      {/* Pinned Tag */}
      {message.isPinned && (
        <span className="text-[10px] font-medium text-amber-400 flex items-center gap-1 mb-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <Pin className="w-3 h-3" />
          <span>پین‌شده</span>
        </span>
      )}

      {/* Group Sender Avatar & Name Above Message (Shown only once for consecutive messages from same sender) */}
      {activeChat?.type === "group" && !isMe && isFirstInGroup && (
        <div className="flex items-center gap-1.5 mb-1 px-1 text-xs font-semibold text-blue-500 dark:text-blue-400 flex-row-reverse cursor-pointer" onClick={() => handleSelectContact(message.senderId, message.senderName, message.senderAvatar)}>
          <ShowImage src={message.senderAvatar} className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--border)] shadow-2xs" />
          <span className="text-[11px] font-bold">
            {message.senderName || "کاربر"}
          </span>
        </div>
      )}

      {/* Main Message Container */}
      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] relative ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        {/* Context Menu Button */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            onClick={toggleReactionPicker}
            className="p-1 rounded-lg bg-[var(--list)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMenu}
            className="p-1 rounded-lg bg-[var(--list)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reaction Popover */}
        {isReactionOpen && (
          <div className={`absolute -top-10 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-xl rounded-2xl p-1.5 flex items-center gap-1 backdrop-blur-md ${isMe ? "right-0" : "left-0"}`}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  toggleReaction(String(message.id), emoji);
                  setActiveOpenMenuId(null);
                }}
                className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Context Menu Dropdown */}
        {isMenuOpen && (
          <div className={`absolute top-8 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded-2xl py-1.5 w-40 text-xs text-[var(--text-primary)] font-medium ${isMe ? "right-0" : "left-0"}`}>
            {systemSettings.replyEnabled && (
              <button
                onClick={() => {
                  setReplyTo(message);
                  setActiveOpenMenuId(null);
                }}
                className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Reply className="w-3.5 h-3.5 text-blue-500" />
                <span>پاسخ (Reply)</span>
              </button>
            )}

            {systemSettings.forwardEnabled && (
              <button
                onClick={() => {
                  setForwardingMessage(message);
                  setActiveOpenMenuId(null);
                }}
                className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-emerald-500 hover:text-emerald-400"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>هدایت (فوروارد)</span>
              </button>
            )}

            {isMe && systemSettings.editMessageEnabled && (
              <button
                onClick={() => {
                  setEditingMessage(message);
                  setActiveOpenMenuId(null);
                }}
                className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span>ویرایش پیام</span>
              </button>
            )}

            {systemSettings.pinEnabled && (
              <button
                onClick={() => {
                  togglePinMessage(String(message.id));
                  setActiveOpenMenuId(null);
                }}
                className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>{message.isPinned ? "برداشتن پین" : "پین کردن"}</span>
              </button>
            )}

            {isMe && systemSettings.deleteMessageEnabled && (
              <button
                onClick={() => {
                  setShowConfirmDelete(true);
                  setActiveOpenMenuId(null);
                }}
                className="w-full text-right px-3 py-2 hover:bg-rose-500/20 text-rose-500 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف پیام</span>
              </button>
            )}
          </div>
        )}

        {/* Bubble Box */}
        <div
          className={`rounded-2xl p-3.5 shadow-sm text-right text-xs leading-relaxed transition-all relative ${isMe
            ? "bg-[var(--bg-chat-item-1)] text-white rounded-br-xs shadow-[0_2px_5px_rgba(0,0,0,0.2)]"
            : "bg-[var(--bg-chat-item-2)] text-[var(--text-primary)] rounded-bl-xs border border-[var(--border)] shadow-[0_2px_5px_rgba(0,0,0,0.1)]"
            }`}
        >
          {/* Reply Quote Banner */}
          {message.replyToMessage && (
            <div
              onClick={() => jumpToMessage(String(message.replyToMessageId || message.replyToMessage!.id))}
              className={`p-2 rounded-xl mb-2 text-[11px] border-r-2 cursor-pointer hover:opacity-90 transition-opacity ${isMe
                ? "bg-black/50 border-white/60 text-blue-100"
                : "bg-black/50 border-blue-400 text-slate-300"
                }`}
            >
              {/* <p className="font-bold text-[10px] text-blue-300 mb-0.5">
                {message.replyToMessage.senderName}
              </p> */}
              <p className="truncate opacity-90">{message.replyToMessage.content}</p>
            </div>
          )}

          {/* Forwarded Header */}
          {message.forwardedFrom && (
            <div className="flex items-center gap-1 text-[10px] opacity-75 mb-1.5 italic">
              <Share2 className="w-3 h-3" />
              <span>هدایت شده از {message.forwardedFrom.name}</span>
            </div>
          )}

          {/* Media Attachments FIRST */}
          {renderAttachments()}

          {/* Caption / Text Content SECOND (under media attachments / audio player, matching Telegram Desktop) */}
          {message.content &&
            message.content !== "پیام صوتی" &&
            !message.content.startsWith("data:audio/") &&
            !message.content.startsWith("ارسال فایل:") &&
            (!message.attachments || message.attachments.length === 0 || message.content !== message.attachments[0]?.name) && (
              <div className="whitespace-pre-wrap break-words text-[var(--text-primary)] font-normal border-white/10 text-xs leading-relaxed">
                {message.content}
              </div>
            )}

          {/* Footer Metadata (Time & Ticks & Seen Count) */}
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] opacity-80">
            {message.isEdited && <span className="italic">(ویرایش شده)</span>}
            <span className="whitespace-pre-wrap break-words text-[var(--text-primary)] font-normal">{formatTime(message.createdAt)}</span>

            {isMe && (
              <button
                onClick={() => {
                  if (seenCount > 0) setShowSeenModal(true);
                }}
                className={`inline-flex items-center gap-1 rounded px-1 transition-colors ${seenCount > 0 ? "hover:bg-white/20 cursor-pointer" : "cursor-default"
                  }`}
                title={seenCount > 0 ? `مشاهده لیست  (${seenCount} نفر)` : undefined}
              >
                {message.status === "seen" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[var(--seen-check-icon)]" />
                ) : message.status === "delivered" ? (
                  <CheckCheck className="w-3.5 h-3.5 opacity-70 text-[var(--seen-check-icon)]" />
                ) : (
                  <Check className="w-3.5 h-3.5 opacity-70 text-[var(--seen-check-icon)]" />
                )}
                {seenCount > 0 && (
                  <span className="font-mono text-[9px]  text-cyan-100 px-1 rounded-md font-bold  bg-[var(--seen-check-counter)]">
                    {seenCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Bar */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex items-center gap-1 mt-1 ${isMe ? "mr-1" : "ml-1"}`}>
          {message.reactions.map((rx) => (
            <button
              key={rx.emoji}
              onClick={() => toggleReaction(String(message.id), rx.emoji)}
              className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-sm"
            >
              <span>{rx.emoji}</span>
              <span className="font-mono font-bold text-slate-300">{rx.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* SeenBy Modal */}
      {showSeenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181B28] border border-white/10 rounded-3xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold">لیست مشاهده‌کنندگان پیام</h3>
              </div>
              <button
                onClick={() => setShowSeenModal(false)}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {message.seenBy?.map((info) => (
                <div
                  key={info.userId}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-center text-[10px]">
                      {info.userDisplayName ? info.userDisplayName[0] : "ک"}
                    </div>
                    <span className="font-semibold text-slate-200">{info.userDisplayName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatTime(info.seenAt)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSeenModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => deleteMessage(String(message.id))}
      />
    </div>
  );
};
