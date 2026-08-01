import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { ChatType } from "../../types";
import {
  MessageSquare,
  Users,
  Radio,
  User,
  Plus,
  Pin,
  VolumeX,
  Check,
  CheckCheck,
  Search,
  X,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const {
    chats,
    activeChat,
    selectChat,
    setShowNewChatModal,
    searchQuery,
    setSearchQuery,
    systemSettings,
    mobileView,
  } = useChat();

  const [activeTab, setActiveTab] = useState<"all" | "direct" | "group" | "channel" | "pinned">("all");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search input for high performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const highlightText = (text: string | undefined, query: string) => {
    if (!text) return "";
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const filteredChats = chats.filter((chat) => {
    // Search query match across title, description, username, and last message content
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const matchTitle = chat.title.toLowerCase().includes(q);
      const matchDesc = chat.description?.toLowerCase().includes(q);
      const matchUser = chat.username?.toLowerCase().includes(q);
      const matchMsg = chat.lastMessage?.content.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUser && !matchMsg) return false;
    }

    // Category filter
    if (activeTab === "pinned") return chat.isPinned;
    if (activeTab === "direct") return chat.type === "direct";
    if (activeTab === "group") return chat.type === "group";
    if (activeTab === "channel") return chat.type === "channel";
    return true;
  });

  const getChatTypeIcon = (type: ChatType) => {
    switch (type) {
      case "group":
        return <Users className="w-3.5 h-3.5 text-indigo-400" />;
      case "channel":
        return <Radio className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const directUnread = chats.filter((c) => c.type === "direct").reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const groupUnread = chats.filter((c) => c.type === "group").reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const channelUnread = chats.filter((c) => c.type === "channel").reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <aside className={`w-full md:w-80 lg:w-96 bg-[var(--sidebar)] border-l border-[var(--border)] flex-col h-full shrink-0 transition-colors duration-200 ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
      {/* Sticky Top Header & Telegram Search Bar */}
      <div className="sticky top-0 z-20 bg-[var(--sidebar)] backdrop-blur-md p-3 border-b border-[var(--border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>گفت‌وگوها</span>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-mono text-[10px] font-bold">
                {totalUnread}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>گفت‌وگوی جدید</span>
          </button>
        </div>

        {/* Telegram-style Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی کاربران، گروه‌ها، کانال‌ها یا پیام‌ها..."
            className="w-full bg-[var(--list)] text-xs rounded-xl pr-9 pl-8 py-2 border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-blue-500/80 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="پاک کردن"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>همه ({chats.length})</span>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-bold">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("direct")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "direct"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>شخصی</span>
            {directUnread > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                {directUnread}
              </span>
            )}
          </button>
          {systemSettings.groupsEnabled && (
            <button
              onClick={() => setActiveTab("group")}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "group"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <span>گروه‌ها</span>
              {groupUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                  {groupUnread}
                </span>
              )}
            </button>
          )}
          {systemSettings.channelsEnabled && (
            <button
              onClick={() => setActiveTab("channel")}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "channel"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <span>کانال‌ها</span>
              {channelUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-bold">
                  {channelUnread}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("pinned")}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === "pinned"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            پین‌شده
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] p-1">
        {filteredChats.length === 0 ? (
          <div className="py-12 px-4 text-center text-[var(--text-secondary)]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--list)] flex items-center justify-center text-[var(--text-secondary)]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-[var(--text-primary)]">گفت‌وگویی یافت نشد</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              میتوانید از دکمه «گفت‌وگوی جدید» یک گفتگو یا گروه بسازید.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = activeChat?.id === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all my-0.5 flex items-center gap-3 relative group border-r-3 ${
                  isSelected
                    ? "bg-blue-500/10 border-blue-500 text-[var(--text-primary)] shadow-sm"
                    : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {/* Avatar with type indicator */}
                <div className="relative shrink-0">
                  <img
                    src={chat.avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150"}
                    alt={chat.title}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-[var(--border)]"
                  />
                  <span className="absolute -bottom-1 -left-1 bg-[var(--sidebar)] rounded-lg p-0.5 border border-[var(--border)]">
                    {getChatTypeIcon(chat.type)}
                  </span>
                </div>

                {/* Text Details */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-1">
                      <span>{highlightText(chat.title, debouncedQuery)}</span>
                      {chat.isMuted && <VolumeX className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />}
                    </h3>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0">
                      {formatTime(chat.lastMessage?.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                      {chat.lastMessage ? (
                        <>
                          {chat.lastMessage.status === "seen" ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                          )}
                          <span className="truncate">
                            {highlightText(chat.lastMessage.content || "ضمیمه رسانه‌ای", debouncedQuery)}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-[var(--text-secondary)]">گفت‌وگو آغاز شده است</span>
                      )}
                    </p>

                    <div className="flex items-center gap-1 shrink-0 mr-1">
                      {chat.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500/20" />}
                      {chat.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold text-[10px] min-w-[18px] text-center shadow-sm shadow-blue-500/30">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
