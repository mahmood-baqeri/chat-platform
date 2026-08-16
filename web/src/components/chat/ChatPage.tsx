// web/src/components/ChatPane.tsx
import React, { useRef, useEffect, useState, useMemo, UIEvent } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { FilePreviewModal, FileWithCaption } from "../modals/FilePreviewModal";
import { MessageSquare } from "lucide-react";
import { ChatPageDragDropOverlay } from "./ChatPageDragDropOverlay";
import { ChatPageHeader } from "./ChatPageHeader";
import { ChatPageMessages } from "./ChatPageMessages";
import { ChatPageMobileBottomSheet } from "./ChatPageMobileBottomSheet";
import { ChatPageScrollToBottomButton } from "./ChatPageScrollToBottomButton";
import { ChatPageFooter } from "./ChatPageFooter";

export const ChatPane: React.FC = () => {
  const {
    activeChat,
    currentUser,
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
    hasMoreAfter,
    isLoadingNewerMessages,
    loadNewerMessages,
    firstUnreadMessageId,
    setShowSearchModal,
    sendMessage,
    markMessagesAsRead
  } = useChat();

  const [showMobileBottomSheet, setShowMobileBottomSheet] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingDroppedFiles, setPendingDroppedFiles] = useState<File[]>([]);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isPrependingRef = useRef(false);
  const preScrollHeightRef = useRef<number>(0);
  const preScrollTopRef = useRef<number>(0);
  const isAppendingRef = useRef(false);
  const initialScrolledChatRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const readTimeoutRef = useRef<any>(null);

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
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles: File[] = [];
      for (const file of droppedFiles) {
        if (systemSettings.maxFileSizeMB && file.size > systemSettings.maxFileSizeMB * 1024 * 1024) {
          alert(`حجم فایل ${file.name} بیشتر از ${systemSettings.maxFileSizeMB} مگابایت است.`);
          continue;
        }
        validFiles.push(file);
      }
      if (validFiles.length > 0) {
        setPendingDroppedFiles(validFiles);
      }
    }
  };

  const handleSendDroppedFiles = async (items: FileWithCaption[]) => {
    try {
      for (const item of items) {
        const { promise } = api.uploadFileWithProgress(item.file);
        const uploaded = await promise;
        let msgType: any = "document";
        if (item.file.type.startsWith("image/")) msgType = "image";
        else if (item.file.type.startsWith("video/")) msgType = "video";
        else if (item.file.type.startsWith("audio/")) msgType = "audio";

        await sendMessage({
          content: item.caption || item.file.name,
          type: msgType,
          attachments: [uploaded],
        });
      }
      setPendingDroppedFiles([]);
    } catch (err: any) {
      alert(err.message || "خطا در آپلود فایل");
    }
  };

  // 1. Initial Positioning on Chat Entry
  useEffect(() => {
    if (!activeChat || isChatLoading) return;

    if (initialScrolledChatRef.current !== activeChat.id) {
      const currentId = activeChat.id;
      setTimeout(() => {
        if (firstUnreadMessageId) {
          const unreadEl = document.getElementById(`message-${firstUnreadMessageId}`);
          if (unreadEl) {
            unreadEl.scrollIntoView({ behavior: "auto", block: "center" });
            initialScrolledChatRef.current = currentId;
            return;
          }
        }
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
        initialScrolledChatRef.current = currentId;
      }, 50);
    }
  }, [activeChat?.id, isChatLoading, firstUnreadMessageId]);

  // 2. Adjust Scroll Position when Messages update
  React.useLayoutEffect(() => {
    if (!scrollContainerRef.current || !activeChat) return;
    const container = scrollContainerRef.current;

    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - preScrollHeightRef.current;
      container.scrollTop = preScrollTopRef.current + heightDiff;
      return;
    }

    if (isAppendingRef.current) {
      isAppendingRef.current = false;
      return;
    }
  }, [messages, activeChat]);

  // 3. Real-time New Message Auto-scroll
  useEffect(() => {
    if (!scrollContainerRef.current || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMessageIdRef.current && lastMsg && lastMsg.id !== lastMessageIdRef.current) {
      if (!isAppendingRef.current && !hasMoreAfter) {
        const container = scrollContainerRef.current;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isFromMe = currentUser && String(lastMsg.senderId) === String(currentUser.id);
        if (isFromMe || distanceFromBottom < 200) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    lastMessageIdRef.current = lastMsg ? String(lastMsg.id) : null;
  }, [messages, currentUser, hasMoreAfter]);

  // 4. IntersectionObserver for Read Receipts
  useEffect(() => {
    if (!scrollContainerRef.current || !activeChat || !currentUser) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const msgId = el.getAttribute("data-message-id");
            const isUnread = el.getAttribute("data-unread") === "true";
            if (msgId && isUnread) {
              pendingReadIdsRef.current.add(msgId);
              el.setAttribute("data-unread", "false");

              if (!readTimeoutRef.current) {
                readTimeoutRef.current = setTimeout(() => {
                  const ids = Array.from(pendingReadIdsRef.current);
                  if (ids.length > 0) {
                    markMessagesAsRead(ids);
                    pendingReadIdsRef.current.clear();
                  }
                  readTimeoutRef.current = null;
                }, 100);
              }
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.2,
      }
    );

    const unreadEls = scrollContainerRef.current.querySelectorAll('.message-item[data-unread="true"]');
    unreadEls.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
    };
  }, [activeChat?.id, messages, currentUser, markMessagesAsRead]);

  const handleManualLoadMore = () => {
    if (scrollContainerRef.current) {
      isPrependingRef.current = true;
      preScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      preScrollTopRef.current = scrollContainerRef.current.scrollTop;
    }
    loadMoreMessages();
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottomButton(distanceFromBottom > 250);

    if (initialScrolledChatRef.current !== activeChat?.id) return;

    const oldestMsgId = messages.length > 0 ? messages[0].id : null;
    const newestMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;

    if (container.scrollTop < 150) {
      if (hasMoreMessages && !isLoadingMoreMessages && !isChatLoading) {
        isPrependingRef.current = true;
        preScrollHeightRef.current = container.scrollHeight;
        preScrollTopRef.current = container.scrollTop;
        loadMoreMessages();
      }
    }
    if (distanceFromBottom < 150) {
      if (hasMoreAfter && !isLoadingNewerMessages && !isChatLoading) {
        isAppendingRef.current = true;
        loadNewerMessages();
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const chatMessages = useMemo(() => {
    return messages.filter((m) => m.chatId === activeChat?.id);
  }, [messages, activeChat?.id]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return chatMessages.filter(
      (m) =>
        String(m.senderId) !== String(currentUser.id) &&
        (!m.seenBy || !m.seenBy.some((s) => String(s.userId) === String(currentUser.id)))
    ).length;
  }, [chatMessages, currentUser]);

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const latestPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;
  const activeTypingList = activeChat ? typingUsers[activeChat.id] || [] : [];
  const actualMemberCount = activeChat?.members ? activeChat.members.length : (activeChat?.memberCount || 0);

  if (!activeChat) {
    return (
      <div className={`flex-1 bg-[var(--bg)] flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] ${mobileView === "sidebar" ? "hidden md:flex" : "flex"}`}>
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">گفت‌وگویی انتخاب نشده است</h3>
      </div>
    );
  }

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 bg-[var(--bg)] flex-col h-full min-w-0 relative ${mobileView === "sidebar" ? "hidden md:flex" : "flex"}`}
    >
      <ChatPageDragDropOverlay isDragging={isDraggingFile} />

      <ChatPageHeader
        activeChat={activeChat}
        activeTypingList={activeTypingList}
        actualMemberCount={actualMemberCount}
        pinnedMessages={pinnedMessages}
        onShowGroupDrawer={() => setShowGroupDrawer(true)}
        onShowPinnedModal={() => setShowPinnedModal(true)}
        onShowSearchModal={() => setShowSearchModal(true)}
        onSetMobileView={setMobileView}
        onShowMobileBottomSheet={() => setShowMobileBottomSheet(true)}
      />

      <ChatPageMessages
        messages={chatMessages}
        isChatLoading={isChatLoading}
        isLoadingMoreMessages={isLoadingMoreMessages}
        hasMoreMessages={hasMoreMessages}
        isLoadingNewerMessages={isLoadingNewerMessages}
        hasMoreAfter={hasMoreAfter}
        activeTypingList={activeTypingList}
        latestPinned={latestPinned}
        pinnedMessages={pinnedMessages}
        onLoadMore={handleManualLoadMore}
        onLoadNewer={loadNewerMessages}
        onScroll={handleScroll}
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        onShowPinnedModal={() => setShowPinnedModal(true)}
      />

      <ChatPageScrollToBottomButton
        show={showScrollBottomButton}
        unreadCount={unreadCount}
        onClick={scrollToBottom}
      />

      <ChatPageFooter
        activeChat={activeChat}
        currentUser={currentUser}
      />

      <ChatPageMobileBottomSheet
        isOpen={showMobileBottomSheet}
        onClose={() => setShowMobileBottomSheet(false)}
        activeChat={activeChat}
        pinnedMessages={pinnedMessages}
        onShowSearchModal={() => setShowSearchModal(true)}
        onShowPinnedModal={() => setShowPinnedModal(true)}
        onShowGroupDrawer={() => setShowGroupDrawer(true)}
      />

      <FilePreviewModal
        files={pendingDroppedFiles}
        isOpen={pendingDroppedFiles.length > 0}
        onClose={() => setPendingDroppedFiles([])}
        onSend={handleSendDroppedFiles}
      />
    </main>
  );
};