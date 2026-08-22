import React, { useState, useEffect, useMemo } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { Search, User, MessageSquare, Phone, Clock, Loader2, Sparkles, UserCheck } from "lucide-react";
import { formatTime, formatDateGroupHeader } from "../../utils/dateUtils";
import { ShowImage } from "@/src/utils/showImage";

export interface EnrichedContact {
  id: string;
  userId: string;
  contactUserId: string;
  customName: string;
  displayName: string;
  firstName: string;   // ✅ اضافه شده
  lastName: string;    // ✅ اضافه شده
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

  // فیلتر کردن مخاطبین بر اساس جستجو
  const filteredContacts = useMemo(() => {
    return contactsList.filter((c) => {
      // 1. حذف خود کاربر
      if (currentUser && String(c.contactUserId) === String(currentUser.id)) {
        return false;
      }

      // 2. فیلتر بر اساس جستجو
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.displayName.toLowerCase().includes(q) ||
        c.customName.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q))
      );
    });
  }, [contactsList, searchQuery, currentUser]);

  // ============================================================
  // ✅ گروه‌بندی بر اساس حروف الفبا (lastName)
  // ============================================================
  const groupedContacts = useMemo(() => {
    // اگر جستجو فعال است، گروه‌بندی نمی‌کنیم
    if (searchQuery.trim()) {
      return { searchResults: filteredContacts, groups: null };
    }

    // ✅ مرتب‌سازی بر اساس lastName
    const sorted = [...filteredContacts].sort((a, b) => {
      const lastNameA = a.lastName || a.displayName || "";
      const lastNameB = b.lastName || b.displayName || "";
      return lastNameA.localeCompare(lastNameB, 'fa');
    });

    // گروه‌بندی بر اساس حرف اول lastName
    const groups: { [key: string]: EnrichedContact[] } = {};

    sorted.forEach((contact) => {
      const lastName = contact.lastName || contact.displayName || "";

      // گرفتن حرف اول
      const firstChar = lastName.charAt(0).toUpperCase();

      // تشخیص فارسی یا انگلیسی
      const isPersian = /[\u0600-\u06FF]/.test(firstChar);
      const isEnglish = /[A-Za-z]/.test(firstChar);

      let groupKey = firstChar;

      // اگر عدد یا کاراکتر خاص بود، در گروه 'سایر' قرار می‌گیرد
      if (!isPersian && !isEnglish) {
        groupKey = '#';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(contact);
    });

    // مرتب‌سازی کلیدهای گروه
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const isPersianA = /[\u0600-\u06FF]/.test(a);
      const isPersianB = /[\u0600-\u06FF]/.test(b);

      if (isPersianA && !isPersianB) return -1;
      if (!isPersianA && isPersianB) return 1;

      return a.localeCompare(b, 'fa');
    });

    const groupList = sortedKeys.map((key) => ({
      letter: key,
      contacts: groups[key],
      count: groups[key].length,
    }));

    return { searchResults: null, groups: groupList };
  }, [filteredContacts, searchQuery]);

  const handleSelectContact = async (contact: EnrichedContact) => {
    if (!currentUser) return;
    setIsOpeningChat(contact.contactUserId);

    try {
      let targetChat = chats.find(
        (chat) =>
          chat.type === "direct" &&
          chat.members?.some((m) => String(m.userId) === String(contact.contactUserId))
      );

      if (!targetChat && contact.chatId) {
        targetChat = chats.find((c) => c.id === contact.chatId);
      }

      if (!targetChat) {
        const newChatData = await api.createChat({
          type: "direct",
          title: contact.displayName || contact.customName || "گفتگوی شخصی",
          avatarUrl: contact.avatarUrl,
          members: [
            {
              userId: currentUser.id,
              userDisplayname: currentUser.displayName,
              role: "owner",
              joinedAt: new Date().toISOString(),
              isMuted: false
            },
            {
              userId: contact.contactUserId,
              userDisplayname: contact.displayName,
              role: "user",
              joinedAt: new Date().toISOString(),
              isMuted: false
            },
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

  // ============================================================
  // ✅ رندر مخاطب (با نمایش lastName)
  // ============================================================
  const renderContact = (contact: EnrichedContact) => {
    // ✅ نمایش lastName به همراه firstName
    const displayName = contact.lastName
      ? (contact.firstName ? `${contact.lastName} ${contact.firstName}` : contact.lastName)
      : contact.displayName || contact.customName;

    return (
      <div
        key={contact.id}
        onClick={() => handleSelectContact(contact)}
        className="p-3 rounded-2xl bg-[var(--list)]/50 hover:bg-[var(--list)] border border-[var(--border)]/40 hover:border-cyan-500/30 transition-all cursor-pointer group flex items-center justify-between gap-3 relative"
      >
        {/* Avatar with Status Badge */}
        <div className="relative shrink-0">
          <ShowImage src={contact.avatarUrl} className="w-11 h-11 rounded-full object-cover ring-2 ring-cyan-500/20 group-hover:ring-cyan-500 transition-all" />
          <span
            className={`w-3 h-3 rounded-full ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5 ${contact.status === "online" ? "bg-cyan-500 animate-pulse" : "bg-slate-500"
              }`}
            title={contact.status === "online" ? "آنلاین" : "آفلاین"}
          />
        </div>

        {/* Contact Info */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors truncate">
              {displayName}
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
                <span className="text-[10px] italic text-cyan-400/80">
                  {contact.status === "online" ? "آنلاین" : `آخرین بازدید: ${contact.lastSeen}`}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        {isOpeningChat === contact.contactUserId && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-2xl flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // ✅ رندر گروه‌ها
  // ============================================================
  const renderGroupedContacts = () => {
    // حالت جستجو: نمایش بدون گروه‌بندی
    if (searchQuery.trim()) {
      return (
        <div className="space-y-1.5">
          {filteredContacts.map((contact) => renderContact(contact))}
        </div>
      );
    }

    // حالت گروه‌بندی
    if (!groupedContacts.groups || groupedContacts.groups.length === 0) {
      return (
        <div className="py-16 text-center text-[var(--text-secondary)] text-xs px-4">
          <UserCheck className="w-10 h-10 mx-auto mb-2 text-cyan-500/40" />
          <p className="font-bold text-[var(--text-primary)] mb-1">مخاطبی یافت نشد</p>
          <p className="text-[11px] leading-relaxed">هنوز مخاطبی ثبت نشده است.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {groupedContacts.groups.map((group) => (
          <div key={group.letter} className="space-y-1">
            {/* عنوان گروه (حرف الفبا) */}
            <div className="sticky top-0 z-10 bg-[var(--sidebar)]/95 backdrop-blur-sm py-1.5 px-3 rounded-lg border-b border-[var(--border)]/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400">
                  {group.letter}
                </span>
                <span className="text-[9px] text-[var(--text-secondary)] font-mono bg-[var(--list)] px-2 py-0.5 rounded-full">
                  {group.count}
                </span>
              </div>
            </div>

            {/* مخاطبین این گروه */}
            <div className="space-y-1.5 pr-2">
              {group.contacts.map((contact) => renderContact(contact))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--sidebar)]">
      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            <span>در حال بارگذاری لیست مخاطبین ...</span>
          </div>
        ) : (
          renderGroupedContacts()
        )}
      </div>
    </div>
  );
};