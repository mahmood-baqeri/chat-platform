import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, Chat, Message, SystemSettings, UserSession, MessageType } from "../types";
import { api } from "../services/api";
import { wsClient } from "../services/websocket";
import { playNotificationSound as playAudioSound } from "../services/sound";
import { requestAllPermissionsAfterLogin } from "../utils/permissions";

export type ThemeMode = "dark" | "light" | "system";

interface ChatContextType {
  currentUser: User | null;
  sessions: UserSession[];
  setCurrentUser: (user: User | null) => void;
  systemSettings: SystemSettings;
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  typingUsers: { [chatId: string]: string[] };
  theme: ThemeMode;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  
  // App & Chat Loading States
  isAppInitializing: boolean;
  isChatLoading: boolean;
  
  // Modals & UI States
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  showAdminPanel: boolean;
  setShowAdminPanel: (v: boolean) => void;
  showNewChatModal: boolean;
  setShowNewChatModal: (v: boolean) => void;
  showProfileModal: boolean;
  setShowProfileModal: (v: boolean) => void;
  showGroupDrawer: boolean;
  setShowGroupDrawer: (v: boolean) => void;
  showPinnedModal: boolean;
  setShowPinnedModal: (v: boolean) => void;
  showSearchModal: boolean;
  setShowSearchModal: (v: boolean) => void;
  searchResults: Message[];
  isSearching: boolean;
  performSearch: (query: string) => void;
  jumpToMessage: (messageId: string) => void;
  mobileView: "sidebar" | "chat";
  setMobileView: (view: "sidebar" | "chat") => void;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  activeMediaUrl: { url: string; type: MessageType; name: string } | null;
  setActiveMediaUrl: (media: { url: string; type: MessageType; name: string } | null) => void;

  // Pagination & Search
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  loadMoreMessages: () => Promise<void>;
  hasMoreAfter: boolean;
  isLoadingNewerMessages: boolean;
  loadNewerMessages: () => Promise<void>;
  firstUnreadMessageId: string | null;
  
  // Menu state management
  activeOpenMenuId: string | null;
  setActiveOpenMenuId: (id: string | null) => void;

  // Sound Settings
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  soundChoice: string;
  setSoundChoice: (v: string) => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;
  playNotificationSound: () => void;

  // Actions
  selectChat: (chatId: string) => void;
  sendMessage: (data: { content: string; type?: MessageType; attachments?: any[]; replyToId?: string; forwardedFrom?: any; scheduledFor?: string }, targetChatId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePinMessage: (messageId: string) => Promise<void>;
  sendTypingSignal: (isTyping: boolean) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  logout: () => void;
  refreshChats: () => Promise<void>;
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  drafts: { [chatId: string]: string };
  setDraft: (chatId: string, text: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  markMessagesAsRead: (messageIds: string[]) => Promise<void>;
}

const defaultSettings: SystemSettings = {
  registrationEnabled: true,
  loginEnabled: true,
  otpEnabled: true,
  sessionTimeoutMinutes: 1440,
  channelsEnabled: true,
  groupsEnabled: true,
  callsEnabled: false,
  editMessageEnabled: true,
  deleteMessageEnabled: true,
  replyEnabled: true,
  forwardEnabled: true,
  mentionEnabled: true,
  pinEnabled: true,
  allowFileUpload: true,
  allowImages: true,
  allowVideos: true,
  allowAudio: true,
  allowDocuments: true,
  allowStickers: true,
  allowEmojis: true,
  onlineStatusEnabled: true,
  lastSeenEnabled: true,
  typingIndicatorEnabled: true,
  readReceiptEnabled: true,
  notificationsEnabled: true,
  pushNotificationsEnabled: true,
  darkModeDefault: true,
  loggingEnabled: true,
  maxFileSizeMB: 25,
  maxGroupMembers: 200,
  maxChannelsPerUser: 10,
  allowedFileExtensions: "png, jpg, jpeg, gif, mp4, mp3, pdf, docx, zip",
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSettings);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});
  const [theme, setThemeState] = useState<ThemeMode>("light");
  
  // Loading States
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Modals & Drawers
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState<{ url: string; type: MessageType; name: string } | null>(null);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [drafts, setDrafts] = useState<{ [chatId: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcut Ctrl+K / Cmd+K / Ctrl+F for Search Modal
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const performSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim().toLowerCase();
      if (!trimmed || !activeChat) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const localMatches = (Array.isArray(messages) ? messages : []).filter(
          (m) =>
            m.content?.toLowerCase().includes(trimmed) ||
            m.attachments?.some((att) => att.name?.toLowerCase().includes(trimmed))
        );
        const apiMatches = await api.searchChatMessages(activeChat.id, { q: trimmed }).catch(() => []);
        const combinedMap = new Map<string, Message>();
        localMatches.forEach((m) => combinedMap.set(m.id, m));
        if (Array.isArray(apiMatches)) {
          apiMatches.forEach((m) => combinedMap.set(m.id, m));
        }
        setSearchResults(Array.from(combinedMap.values()));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [activeChat, messages]
  );

  const jumpToMessage = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;

      const messageExists = messages.some((m) => m.id === messageId);
      if (messageExists) {
        setHighlightedMessageId(messageId);
        setTimeout(() => {
          const el = document.getElementById(`message-${messageId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
        setTimeout(() => setHighlightedMessageId(null), 3500);
        return;
      }

      // Target message not loaded in current messages array, fetch around target message
      setIsChatLoading(true);
      try {
        const res = await api.getMessages(activeChat.id, { aroundId: messageId });
        if (res.messages && res.messages.length > 0) {
          const filtered = res.messages.filter((m: Message) => m.chatId === activeChat.id);
          setMessages(filtered);
          setHasMoreMessages(res.hasMoreBefore ?? res.hasMore ?? false);
          setHasMoreAfter(res.hasMoreAfter ?? false);
          setFirstUnreadMessageId(null);

          setHighlightedMessageId(messageId);

          setTimeout(() => {
            const el = document.getElementById(`message-${messageId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 150);

          setTimeout(() => {
            setHighlightedMessageId(null);
          }, 3500);
        }
      } catch (e) {
        console.error("Error jumping to message:", e);
      } finally {
        setIsChatLoading(false);
      }
    },
    [activeChat, messages]
  );

  // Pagination State
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [isLoadingNewerMessages, setIsLoadingNewerMessages] = useState(false);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);

  // Active Menu ID (Ensures only one 3-dots menu open at a time)
  const [activeOpenMenuId, setActiveOpenMenuId] = useState<string | null>(null);

  // Sound Settings
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const val = localStorage.getItem("app_sound_enabled");
    return val !== null ? JSON.parse(val) : true;
  });
  const [soundChoice, setSoundChoiceState] = useState<string>(() => {
    return localStorage.getItem("app_sound_choice") || "chime";
  });
  const [soundVolume, setSoundVolumeState] = useState<number>(() => {
    const v = localStorage.getItem("app_sound_volume");
    return v !== null ? Number(v) : 0.6;
  });

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    localStorage.setItem("app_sound_enabled", JSON.stringify(v));
  };

  const setSoundChoice = (v: string) => {
    setSoundChoiceState(v);
    localStorage.setItem("app_sound_choice", v);
  };

  const setSoundVolume = (v: number) => {
    setSoundVolumeState(v);
    localStorage.setItem("app_sound_volume", String(v));
  };

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      playAudioSound(soundVolume, soundChoice);
    } catch (e) {}
  }, [soundEnabled, soundChoice, soundVolume]);

  // Initialize & Persist Theme
  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem("app_theme_mode", mode);
    applyTheme(mode);
  };

  const toggleTheme = () => {
    const nextMode = theme === "dark" ? "light" : "dark";
    setTheme(nextMode);
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem("app_theme_mode") as ThemeMode) || "light";
    setThemeState(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem("app_theme_mode") || "light") === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  // Fetch initial system settings & current user
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        const s = await api.getSettings().catch(() => defaultSettings);
        if (isMounted) setSystemSettings(s);

        const savedToken = localStorage.getItem("app_auth_token");
        const savedTimestamp = localStorage.getItem("app_token_timestamp");
        const timeoutMins = s.sessionTimeoutMinutes || 1440;

        let isExpired = false;
        if (savedTimestamp) {
          const elapsedMins = (Date.now() - Number(savedTimestamp)) / (1000 * 60);
          if (elapsedMins > timeoutMins) {
            isExpired = true;
          }
        }

        if (savedToken && !isExpired) {
          try {
            const { user, sessions } = await api.getMe(savedToken);
            if (isMounted) {
              setCurrentUser(user);
              setSessions(sessions);
              wsClient.connect(user.id);
              const chatList = await api.getChats(user.id);
              setChats(chatList);
              if (chatList.length > 0 && !activeChat) {
                setActiveChat(chatList[0]);
              }
            }
          } catch (err) {
            console.error("Session restoration error:", err);
            localStorage.removeItem("app_auth_token");
            localStorage.removeItem("app_token_timestamp");
            localStorage.removeItem("app_user_id");
            if (isMounted) {
              setCurrentUser(null);
              setShowAuthModal(true);
            }
          }
        } else {
          localStorage.removeItem("app_auth_token");
          localStorage.removeItem("app_token_timestamp");
          localStorage.removeItem("app_user_id");
          if (isMounted) {
            setCurrentUser(null);
            setShowAuthModal(true);
          }
        }
      } finally {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) setIsAppInitializing(false);
          }, 600);
        }
      }
    };

    initApp();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch chats when user is available
  const refreshChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const chatList = await api.getChats(currentUser.id);
      setChats(chatList);
      if (chatList.length > 0 && !activeChat) {
        setActiveChat(chatList[0]);
      }
    } catch (e) {
      console.error("Error fetching chats:", e);
    }
  }, [currentUser, activeChat]);

  useEffect(() => {
    refreshChats();
    if (currentUser) {
      requestAllPermissionsAfterLogin(currentUser.id);
    }
  }, [currentUser]);

  // Ref to always track latest activeChat in WS callbacks without stale closures
  const activeChatRef = useRef<Chat | null>(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Fetch messages when activeChat changes with pagination & unread support
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setIsChatLoading(false);
      setFirstUnreadMessageId(null);
      return;
    }

    let isCurrent = true;
    setIsChatLoading(true);
    setMessages([]); // Instantly clear previous room messages
    setFirstUnreadMessageId(null);

    api.getMessages(activeChat.id, { limit: 20, userId: currentUser?.id })
      .then((res) => {
        if (!isCurrent) return;
        if (Array.isArray(res)) {
          setMessages(res.filter((m: Message) => m.chatId === activeChat.id));
          setHasMoreMessages(false);
          setHasMoreAfter(false);
          setFirstUnreadMessageId(null);
        } else {
          const msgs = (res.messages || []).filter((m: Message) => m.chatId === activeChat.id);
          setMessages(msgs);
          setHasMoreMessages(res.hasMoreBefore ?? res.hasMore ?? false);
          setHasMoreAfter(res.hasMoreAfter ?? false);
          setFirstUnreadMessageId(res.firstUnreadMessageId || null);
        }
        // Note: Do NOT auto mark-as-read all messages on room entry. Read status is handled via viewport IntersectionObserver.
      })
      .catch((err: any) => {
        if (!isCurrent) return;
        // Clean auto-redirect on non-existent or inaccessible room (404 or 403)
        if (err?.status === 404 || err?.status === 403 || err?.message?.includes("پیدا نشد") || err?.message?.includes("عضو")) {
          setChats((prev) => prev.filter((c) => c.id !== activeChat.id));
          setActiveChat(null);
          try {
            window.history.replaceState({}, "", "/");
          } catch (e) {}
          setMobileView("sidebar");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setTimeout(() => {
            if (isCurrent) setIsChatLoading(false);
          }, 250);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [activeChat?.id, currentUser]);

  const loadMoreMessages = async () => {
    if (!activeChat || isLoadingMoreMessages || !hasMoreMessages || messages.length === 0) return;
    setIsLoadingMoreMessages(true);
    try {
      const oldestId = messages[0].id;
      console.log("🔽 [Frontend loadMoreMessages] Fetching older messages beforeId:", oldestId);
      const res = await api.getMessages(activeChat.id, { limit: 20, beforeId: oldestId });
      if (res.messages && res.messages.length > 0) {
        const filtered = res.messages.filter((m: Message) => m.chatId === activeChat.id);
        if (filtered.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = filtered.filter((m: Message) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...newMsgs, ...prev];
          });
          setHasMoreMessages(res.hasMoreBefore ?? res.hasMore ?? false);
          if (res.hasMoreAfter !== undefined) setHasMoreAfter(res.hasMoreAfter);
        } else {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (e) {
      console.error("Error loading previous messages:", e);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const loadNewerMessages = async () => {
    if (!activeChat || isLoadingNewerMessages || !hasMoreAfter || messages.length === 0) return;
    setIsLoadingNewerMessages(true);
    try {
      const newestId = messages[messages.length - 1].id;
      console.log("🔼 [Frontend loadNewerMessages] Fetching newer messages afterId:", newestId);
      const res = await api.getMessages(activeChat.id, { limit: 20, afterId: newestId });
      if (res.messages && res.messages.length > 0) {
        const filtered = res.messages.filter((m: Message) => m.chatId === activeChat.id);
        if (filtered.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = filtered.filter((m: Message) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          setHasMoreAfter(res.hasMoreAfter ?? res.hasMore ?? false);
          if (res.hasMoreBefore !== undefined) setHasMoreMessages(res.hasMoreBefore);
        } else {
          setHasMoreAfter(false);
        }
      } else {
        setHasMoreAfter(false);
      }
    } catch (e) {
      console.error("Error loading newer messages:", e);
    } finally {
      setIsLoadingNewerMessages(false);
    }
  };

  // Setup WebSocket listeners
  useEffect(() => {
    const unsubNewMsg = wsClient.on("message:new", (newMsg: Message) => {
      const currentChatId = activeChatRef.current?.id;
      if (currentChatId && newMsg.chatId === currentChatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      // Update chat's lastMessage and unread count
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === newMsg.chatId) {
            const isSelf = currentUser && newMsg.senderId === currentUser.id;
            return {
              ...c,
              lastMessage: newMsg,
              unreadCount: isSelf ? c.unreadCount : c.unreadCount + 1,
            };
          }
          return c;
        })
      );

      // Play notification sound if not current sender
      if (currentUser && newMsg.senderId !== currentUser.id) {
        playNotificationSound();
      }
    });

    const unsubMsgUpdated = wsClient.on("message:updated", (updatedMsg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    });

    const unsubStatusUpdated = wsClient.on("message:status_updated", ({ chatId, userId, messageIds, status, seenAt, unreadCount }: any) => {
      if (unreadCount !== undefined) {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, unreadCount } : c))
        );
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.chatId === chatId && (!messageIds || messageIds.includes(m.id))) {
            const seenBy = m.seenBy || [];
            if (userId && !seenBy.some((s) => s.userId === userId)) {
              return {
                ...m,
                status: "seen",
                seenBy: [...seenBy, { userId, seenAt: seenAt || new Date().toISOString() }],
              };
            }
            return { ...m, status: "seen" };
          }
          return m;
        })
      );
    });

    const unsubMsgDeleted = wsClient.on("message:deleted", ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    const unsubReaction = wsClient.on("message:reaction_updated", (updatedMsg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    });

    const unsubSettings = wsClient.on("settings:updated", (newSettings: SystemSettings) => {
      setSystemSettings(newSettings);
    });

    const unsubTyping = wsClient.on("typing:status", ({ chatId, userName, isTyping }: { chatId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const existing = prev[chatId] || [];
        let updated = existing;
        if (isTyping && !existing.includes(userName)) {
          updated = [...existing, userName];
        } else if (!isTyping) {
          updated = existing.filter((u) => u !== userName);
        }
        return { ...prev, [chatId]: updated };
      });
    });

    const unsubChatCreated = wsClient.on("chat:created", (newChat: Chat) => {
      if (!currentUser) return;
      const isMember = newChat.members?.some((m) => m.userId === currentUser.id);
      if (!isMember) return;

      setChats((prev) => {
        if (prev.some((c) => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
    });

    return () => {
      unsubNewMsg();
      unsubMsgUpdated();
      unsubStatusUpdated();
      unsubMsgDeleted();
      unsubReaction();
      unsubSettings();
      unsubTyping();
      unsubChatCreated();
    };
  }, [activeChat, currentUser, playNotificationSound]);

  const selectChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId || c.username === chatId);
    if (chat) {
      if (chat.id !== activeChat?.id) {
        setIsChatLoading(true);
        setActiveChat(chat);
      }
      setMobileView("chat");
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
      );
      try {
        window.history.pushState({}, "", `/chat/${chat.id}`);
      } catch (e) {}
    }
  };

  // Synchronize URL Routes (/admin, /dashboard, /chat/:chatId)
  useEffect(() => {
    const handleUrlRoute = async () => {
      const path = window.location.pathname;

      if (path === "/admin" || path === "/dashboard" || window.location.search.includes("admin=true")) {
        setShowAdminPanel(true);
        return;
      }

      if (path.startsWith("/chat/")) {
        const targetId = path.replace("/chat/", "").trim();
        if (!targetId) return;

        if (!currentUser) {
          localStorage.setItem("pending_chat_id", targetId);
          setShowAuthModal(true);
          return;
        }

        try {
          const existing = chats.find((c) => c.id === targetId || c.username === targetId || c.id === `chat-${targetId}`);
          if (existing) {
            setActiveChat(existing);
            setMobileView("chat");
          } else {
            const fetched = await api.getChatById(targetId, currentUser.id);
            if (fetched) {
              setChats((prev) => [fetched, ...prev.filter((c) => c.id !== fetched.id)]);
              setActiveChat(fetched);
              setMobileView("chat");
            }
          }
        } catch (err: any) {
          // Clean auto-redirect without blocking alert modal on invalid or forbidden chat rooms
          try {
            window.history.replaceState({}, "", "/");
          } catch (e) {}
          setMobileView("sidebar");
          if (chats.length > 0) {
            setActiveChat(chats[0]);
          } else {
            setActiveChat(null);
          }
        }
      }
    };

    handleUrlRoute();
    window.addEventListener("popstate", handleUrlRoute);
    return () => window.removeEventListener("popstate", handleUrlRoute);
  }, [currentUser, chats.length]);

  const sendMessage = async (
    data: { content: string; type?: MessageType; attachments?: any[]; replyToId?: string; forwardedFrom?: any; scheduledFor?: string },
    targetChatId?: string
  ) => {
    const targetChat = targetChatId ? chats.find((c) => c.id === targetChatId) : activeChat;
    if (!targetChat || !currentUser) return;
    
    const newMsg = await api.sendMessage(targetChat.id, {
      senderId: currentUser.id,
      content: data.content,
      type: data.type || "text",
      attachments: data.attachments || [],
      replyToMessageId: data.replyToId || (targetChat.id === activeChat?.id ? replyTo?.id : undefined),
      replyToMessage: (targetChat.id === activeChat?.id && replyTo)
        ? {
            id: replyTo.id,
            senderName: replyTo.senderId === currentUser.id ? "شما" : "کاربر",
            content: replyTo.content,
            type: replyTo.type,
          }
        : undefined,
      forwardedFrom: data.forwardedFrom,
      scheduledFor: data.scheduledFor,
    });

    if (targetChat.id === activeChat?.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setReplyTo(null);

      // Clear draft
      setDrafts((prev) => ({ ...prev, [targetChat.id]: "" }));
    } else {
      // Refresh chats if forwarded to another chat room
      refreshChats();
    }
  };

  const editMsg = async (messageId: string, content: string) => {
    const updated = await api.editMessage(messageId, content);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    setEditingMessage(null);
  };

  const deleteMsg = async (messageId: string) => {
    await api.deleteMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const updated = await api.toggleReaction(messageId, emoji, currentUser.id);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  };

  const togglePinMessage = async (messageId: string) => {
    const updated = await api.togglePin(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  };

  const sendTypingSignal = (isTyping: boolean) => {
    if (!activeChat || !currentUser) return;
    wsClient.send("typing", {
      chatId: activeChat.id,
      userName: currentUser.displayName,
      isTyping,
    });
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSystemSettings(updated.settings);
  };

  const setDraft = (chatId: string, text: string) => {
    setDrafts((prev) => ({ ...prev, [chatId]: text }));
  };

  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!activeChat || !currentUser || messageIds.length === 0) return;
    try {
      const res = await api.markMessagesAsRead(activeChat.id, currentUser.id, messageIds);
      if (res.unreadCount !== undefined) {
        setChats((prev) =>
          prev.map((c) => (c.id === activeChat.id ? { ...c, unreadCount: res.unreadCount } : c))
        );
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (messageIds.includes(m.id)) {
            const seenBy = m.seenBy || [];
            if (!seenBy.some((s) => s.userId === currentUser.id)) {
              return {
                ...m,
                status: "seen",
                seenBy: [...seenBy, { userId: currentUser.id, userDisplayName: currentUser.displayName, userAvatarUrl: currentUser.avatarUrl, seenAt: new Date().toISOString() }],
              };
            }
          }
          return m;
        })
      );
    } catch (e) {
      console.error("Error marking messages as read:", e);
    }
  }, [activeChat, currentUser]);

  const logout = () => {
    localStorage.removeItem("app_auth_token");
    localStorage.removeItem("app_token_timestamp");
    localStorage.removeItem("app_user_id");
    setCurrentUser(null);
    setChats([]);
    setActiveChat(null);
    setMessages([]);
    wsClient.disconnect();
    setShowAuthModal(true);
  };

  // Monitor Session Duration Expiry
  useEffect(() => {
    const checkSessionExpiry = () => {
      const savedTimestamp = localStorage.getItem("app_token_timestamp");
      if (currentUser && savedTimestamp) {
        const timeoutMins = systemSettings.sessionTimeoutMinutes || 1440;
        const elapsedMins = (Date.now() - Number(savedTimestamp)) / (1000 * 60);
        if (elapsedMins > timeoutMins) {
          logout();
          alert("زمان نشست کاری شما به پایان رسیده است. لطفاً مجدداً وارد شوید.");
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 30000);
    window.addEventListener("focus", checkSessionExpiry);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkSessionExpiry);
    };
  }, [currentUser, systemSettings.sessionTimeoutMinutes]);

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        sessions,
        setCurrentUser,
        systemSettings,
        chats,
        activeChat,
        messages,
        typingUsers,
        theme,
        themeMode: theme,
        toggleTheme,
        setTheme,
        isAppInitializing,
        isChatLoading,
        showAuthModal,
        setShowAuthModal,
        showAdminPanel,
        setShowAdminPanel,
        showNewChatModal,
        setShowNewChatModal,
        showProfileModal,
        setShowProfileModal,
        showGroupDrawer,
        setShowGroupDrawer,
        showPinnedModal,
        setShowPinnedModal,
        showSearchModal,
        setShowSearchModal,
        searchResults,
        isSearching,
        performSearch,
        jumpToMessage,
        mobileView,
        setMobileView,
        highlightedMessageId,
        setHighlightedMessageId,
        activeMediaUrl,
        setActiveMediaUrl,
        selectChat,
        sendMessage,
        editMessage: editMsg,
        deleteMessage: deleteMsg,
        toggleReaction,
        togglePinMessage,
        sendTypingSignal,
        updateSettings,
        logout,
        refreshChats,
        replyTo,
        setReplyTo,
        editingMessage,
        setEditingMessage,
        drafts,
        setDraft,
        searchQuery,
        setSearchQuery,
        markMessagesAsRead,
        hasMoreMessages,
        isLoadingMoreMessages,
        loadMoreMessages,
        hasMoreAfter,
        isLoadingNewerMessages,
        loadNewerMessages,
        firstUnreadMessageId,
        activeOpenMenuId,
        setActiveOpenMenuId,
        soundEnabled,
        setSoundEnabled,
        soundChoice,
        setSoundChoice,
        soundVolume,
        setSoundVolume,
        playNotificationSound,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
