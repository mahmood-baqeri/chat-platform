import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { Search, User, MessageSquare, Phone, Clock, Loader2, Sparkles, UserCheck } from "lucide-react";
import { formatTime, formatDateGroupHeader } from "../../utils/dateUtils";

export interface EnrichedContact {
  id: string;
  userId: string;
  contactUserId: string;
  customName: string;
  displayName: string;
  avatarUrl: string;
  status: "online" | "offline" | "away";
  lastSeen: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    type?: string;
  } | null;
  unreadCount: number;
  chatId: string | null;
  phone?: string;
  username?: string;
}

export const ContactsTab: React.FC = () => {
  const { currentUser, selectChat, chats, refreshChats, searchQuery } = useChat();
  const [contactsList, setContactsList] = useState<EnrichedContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOpeningChat, setIsOpeningChat] = useState<string | null>(null);

  const fetchContacts = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const data = await api.getContacts(currentUser.id);
      setContactsList(data || []);
    } catch (err) {
      console.error("Error fetching contacts from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentUser?.id, chats.length]);

  const filteredContacts = contactsList.filter((c) => {
    // 1. Exclude self user from contacts list
    if (currentUser && String(c.contactUserId) === String(currentUser.id)) {
      return false;
    }

    // 2. Filter by global search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.customName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  });

  const handleSelectContact = async (contact: EnrichedContact) => {
    if (!currentUser) return;
    setIsOpeningChat(contact.contactUserId);

    try {
      // 1. Check if direct chat already exists in active chats
      let targetChat = chats.find(
        (chat) =>
          chat.type === "direct" &&
          chat.members?.some((m) => String(m.userId) === String(contact.contactUserId))
      );

      // 2. If chatId was provided by backend
      if (!targetChat && contact.chatId) {
        targetChat = chats.find((c) => c.id === contact.chatId);
      }

      // 3. Create direct chat via backend if none exists
      if (!targetChat) {
        const newChatData = await api.createChat({
          type: "direct",
          title: contact.displayName || contact.customName || "گفتگوی شخصی",
          avatarUrl: contact.avatarUrl,
          members: [
            { userId: currentUser.id, role: "owner", joinedAt: new Date().toISOString(), isMuted: false },
            { userId: contact.contactUserId, role: "user", joinedAt: new Date().toISOString(), isMuted: false },
          ],
        });

        await refreshChats();
        targetChat = newChatData;
      }

      selectChat(targetChat.id);
    } catch (err: any) {
      alert(err.message || "خطا در برقراری ارتباط با مخاطب");
    } finally {
      setIsOpeningChat(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--sidebar)]">
      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span>در حال بارگذاری لیست مخاطبین از پایگاه‌داده...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-secondary)] text-xs px-4">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
            <p className="font-bold text-[var(--text-primary)] mb-1">مخاطبی یافت نشد</p>
            <p className="text-[11px] leading-relaxed">
              {searchQuery ? "هیچ مخاطبی با عبارت جستجو شده تطابق ندارد." : "هنوز مخاطبی ثبت نشده است."}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className="p-3 rounded-2xl bg-[var(--list)]/50 hover:bg-[var(--list)] border border-[var(--border)]/40 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between gap-3 relative"
            >
              {/* Avatar with Status Badge */}
              <div className="relative shrink-0">
                <img
                  src={contact.avatarUrl}
                  alt={contact.displayName}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500 transition-all"
                />
                <span
                  className={`w-3 h-3 rounded-full ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5 ${
                    contact.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                  }`}
                  title={contact.status === "online" ? "آنلاین" : "آفلاین"}
                />
              </div>

              {/* Contact Info */}
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors truncate">
                    {contact.displayName || contact.customName}
                  </h4>
                  {contact.lastMessage?.createdAt && (
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0">
                      {formatTime(contact.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {contact.lastMessage?.content ? (
                      <span className="truncate block">{contact.lastMessage.content}</span>
                    ) : (
                      <span className="text-[10px] italic text-emerald-400/80">
                        {contact.status === "online" ? "آنلاین" : `آخرین بازدید: ${contact.lastSeen}`}
                      </span>
                    )}
                  </p>

                  {/* Unread Count Badge */}
                  {contact.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold shrink-0">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Loading indicator when opening chat */}
              {isOpeningChat === contact.contactUserId && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
