const authFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem("app_auth_token");
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(input, { ...init, headers });
};

import { SystemSettings, User, UserSession, Chat, Message, Attachment, SystemAuditLog, ForbiddenWord, WordCategory, RolePermission } from "../types";

const API_BASE = "/api";

export const api = {
  // Auth
  sendOtp: async (phone: string) => {
    const res = await authFetch(`${API_BASE}/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ارسال کد تأیید");
    }
    return res.json();
  },

  verifyOtp: async (phone: string, code: string) => {
    const res = await authFetch(`${API_BASE}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "کد وارد شده اشتباه است");
    }
    return res.json();
  },

  getMe: async (token?: string) => {
    const authToken = token || localStorage.getItem("app_auth_token");
    const res = await authFetch(`${API_BASE}/auth/me`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error("خطا در دریافت اطلاعات کاربر");
    return res.json() as Promise<{ user: User; sessions: UserSession[] }>;
  },

  updateProfile: async (data: Partial<User> & { userId: string }) => {
    const res = await authFetch(`${API_BASE}/auth/profile/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  terminateOtherSessions: async (userId: string, currentSessionId: string) => {
    const res = await authFetch(`${API_BASE}/auth/sessions/terminate-others`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, currentSessionId }),
    });
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await authFetch(`${API_BASE}/settings`);
    return res.json() as Promise<SystemSettings>;
  },

  updateSettings: async (settings: Partial<SystemSettings>) => {
    const res = await authFetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // Chats
  getChats: async (userId: number | string) => {
    const res = await authFetch(`${API_BASE}/chats?userId=${userId}`);
    return res.json() as Promise<Chat[]>;
  },

  getChatById: async (chatId: number | string, userId?: number | string) => {
    let url = `${API_BASE}/chats/${chatId}`;
    if (userId) url += `?userId=${userId}`;
    const res = await authFetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "خطا در دریافت گفتگو" }));
      const error: any = new Error(err.error || "خطا در دریافت گفتگو");
      error.status = res.status;
      throw error;
    }
    return res.json() as Promise<Chat>;
  },

  createChat: async (chatData: Partial<Chat>) => {
    const res = await authFetch(`${API_BASE}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ساخت گفت‌وگو");
    }
    return res.json() as Promise<Chat>;
  },

  // Messages
  getMessages: async (
    chatId: number | string,
    opts?: number | { limit?: number; beforeId?: number | string; afterId?: number | string; aroundId?: number | string; userId?: number | string },
    beforeIdParam?: number | string
  ) => {
    let limit = 20;
    let beforeId: string | undefined = beforeIdParam !== undefined ? String(beforeIdParam) : undefined;
    let afterId: string | undefined;
    let aroundId: string | undefined;
    let userId: string | undefined;

    if (typeof opts === "number") {
      limit = opts;
    } else if (opts) {
      if (opts.limit) limit = opts.limit;
      if (opts.beforeId !== undefined) beforeId = String(opts.beforeId);
      if (opts.afterId !== undefined) afterId = String(opts.afterId);
      if (opts.aroundId !== undefined) aroundId = String(opts.aroundId);
      if (opts.userId !== undefined) userId = String(opts.userId);
    }

    let url = `${API_BASE}/chats/${chatId}/messages?limit=${limit}`;
    if (beforeId) url += `&beforeId=${encodeURIComponent(beforeId)}`;
    if (afterId) url += `&afterId=${encodeURIComponent(afterId)}`;
    if (aroundId) url += `&aroundId=${encodeURIComponent(aroundId)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;

    const res = await authFetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "خطا در دریافت پیام‌ها" }));
      const error: any = new Error(err.error || "خطا در دریافت پیام‌ها");
      error.status = res.status;
      throw error;
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return { messages: data, hasMore: false, hasMoreBefore: false, hasMoreAfter: false, firstUnreadMessageId: null, total: data.length };
    }
    return data as { messages: Message[]; hasMore?: boolean; hasMoreBefore?: boolean; hasMoreAfter?: boolean; firstUnreadMessageId?: string | null; total: number };
  },

  searchChatMessages: async (chatId: number | string, params: { q?: string; type?: string; senderId?: number | string; date?: string }) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.type) query.set("type", params.type);
    if (params.senderId !== undefined) query.set("senderId", String(params.senderId));
    if (params.date) query.set("date", params.date);

    const res = await authFetch(`${API_BASE}/chats/${chatId}/search?${query.toString()}`);
    return res.json() as Promise<Message[]>;
  },

  markAsRead: async (chatId: number | string, userId: number | string) => {
    const res = await authFetch(`${API_BASE}/chats/${chatId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  markMessagesAsRead: async (chatId: number | string, userId: number | string, messageIds: (number | string)[]) => {
    const res = await authFetch(`${API_BASE}/chats/${chatId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, messageIds }),
    });
    return res.json();
  },

  getUnreadSummary: async (userId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/unread-summary?userId=${encodeURIComponent(String(userId))}`);
    return res.json() as Promise<{ totalUnread: number; chatsUnread: Record<string, number> }>;
  },

  sendMessage: async (chatId: number | string, messageData: Partial<Message>) => {
    const res = await authFetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ارسال پیام");
    }
    return res.json() as Promise<Message>;
  },

  editMessage: async (messageId: number | string, content: string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ویرایش پیام");
    }
    return res.json();
  },

  deleteMessage: async (messageId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در حذف پیام");
    }
    return res.json();
  },

  toggleReaction: async (messageId: number | string, emoji: string, userId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji, userId }),
    });
    return res.json();
  },

  getMessageReactions: async (messageId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}/reactions`);
    return res.json();
  },

  getMessageSeens: async (messageId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}/seens`);
    return res.json();
  },

  // Contacts
  getContacts: async (userId: number | string = 1) => {
    const res = await authFetch(`${API_BASE}/contacts?userId=${userId}`);
    return res.json();
  },

  addContact: async (userId: number | string, contactUserId: number | string, customName?: string) => {
    const res = await authFetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, contactUserId, customName }),
    });
    return res.json();
  },

  deleteContact: async (id: number | string) => {
    const res = await authFetch(`${API_BASE}/contacts/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  togglePin: async (messageId: number | string) => {
    const res = await authFetch(`${API_BASE}/messages/${messageId}/pin`, {
      method: "POST",
    });
    return res.json();
  },

  // Upload with real-time XHR progress & cancellation
  uploadFileWithProgress: (
    file: File,
    duration?: number,
    onProgress?: (progress: {
      percent: number;
      uploadedBytes: number;
      totalBytes: number;
      speedBps: number;
      etaSeconds: number;
    }) => void
  ): { promise: Promise<Attachment>; cancel: () => void } => {
    let xhr: XMLHttpRequest | null = null;

    const promise = new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const payload = JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          dataUrl: reader.result,
          duration: duration || undefined,
        });

        xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/upload`, true);
        xhr.setRequestHeader("Content-Type", "application/json");

        const startTime = Date.now();

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.1);
              const speedBps = event.loaded / elapsedSec;
              const remainingBytes = event.total - event.loaded;
              const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;
              const percent = Math.min(Math.round((event.loaded / event.total) * 100), 99);

              onProgress({
                percent,
                uploadedBytes: event.loaded,
                totalBytes: event.total,
                speedBps,
                etaSeconds,
              });
            }
          };
        }

        xhr.onload = () => {
          if (xhr!.status >= 200 && xhr!.status < 300) {
            try {
              const data = JSON.parse(xhr!.responseText);
              if (onProgress) {
                onProgress({
                  percent: 100,
                  uploadedBytes: file.size,
                  totalBytes: file.size,
                  speedBps: 0,
                  etaSeconds: 0,
                });
              }
              resolve(data);
            } catch (err) {
              reject(err);
            }
          } else {
            try {
              const errData = JSON.parse(xhr!.responseText);
              reject(new Error(errData.error || "خطا در آپلود فایل"));
            } catch {
              reject(new Error("خطا در آپلود فایل"));
            }
          }
        };

        xhr.onerror = () => reject(new Error("خطای ارتباط با سرور در هنگام آپلود"));
        xhr.onabort = () => reject(new Error("آپلود لغو شد"));

        xhr.send(payload);
      };

      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    return {
      promise,
      cancel: () => {
        if (xhr) xhr.abort();
      },
    };
  },

  uploadFile: async (file: File, duration?: number) => {
    const { promise } = api.uploadFileWithProgress(file, duration);
    return promise;
  },

  // Admin
  getAdminStats: async () => {
    const res = await authFetch(`${API_BASE}/admin/stats`);
    return res.json();
  },

  getAdminUsers: async () => {
    const res = await authFetch(`${API_BASE}/admin/users`);
    return res.json() as Promise<User[]>;
  },

  updateUserAdmin: async (userId: string, data: Partial<User>) => {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<User>;
  },

  deleteUserAdmin: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
    });
    return res.json();
  },

  toggleBanUser: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}/ban`, {
      method: "POST",
    });
    return res.json();
  },

  getUserSessionsAdmin: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}/sessions`);
    return res.json() as Promise<UserSession[]>;
  },

  terminateUserSessionsAdmin: async (userId: string) => {
    const res = await authFetch(`${API_BASE}/admin/users/${userId}/terminate-sessions`, {
      method: "POST",
    });
    return res.json();
  },

  getAdminGroups: async () => {
    const res = await authFetch(`${API_BASE}/admin/groups`);
    return res.json() as Promise<Chat[]>;
  },

  createAdminGroup: async (data: Partial<Chat>) => {
    const res = await authFetch(`${API_BASE}/admin/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<Chat>;
  },

  updateAdminGroup: async (groupId: string, data: Partial<Chat>) => {
    const res = await authFetch(`${API_BASE}/admin/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<Chat>;
  },

  deleteAdminGroup: async (groupId: string) => {
    const res = await authFetch(`${API_BASE}/admin/groups/${groupId}`, {
      method: "DELETE",
    });
    return res.json();
  },

  getAdminChannels: async () => {
    const res = await authFetch(`${API_BASE}/admin/channels`);
    return res.json() as Promise<Chat[]>;
  },

  createAdminChannel: async (data: Partial<Chat>) => {
    const res = await authFetch(`${API_BASE}/admin/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<Chat>;
  },

  updateAdminChannel: async (channelId: string, data: Partial<Chat>) => {
    const res = await authFetch(`${API_BASE}/admin/channels/${channelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<Chat>;
  },

  deleteAdminChannel: async (channelId: string) => {
    const res = await authFetch(`${API_BASE}/admin/channels/${channelId}`, {
      method: "DELETE",
    });
    return res.json();
  },

  getAdminMessages: async () => {
    const res = await authFetch(`${API_BASE}/admin/messages`);
    return res.json() as Promise<{ activeMessages: Message[]; deletedMessages: Message[] }>;
  },

  restoreAdminMessage: async (messageId: string) => {
    const res = await authFetch(`${API_BASE}/admin/messages/${messageId}/restore`, {
      method: "POST",
    });
    return res.json();
  },

  getAdminFiles: async () => {
    const res = await authFetch(`${API_BASE}/admin/files`);
    return res.json() as Promise<{ files: Attachment[]; totalCount: number; totalSizeBytes: number; totalSizeMB: string }>;
  },

  deleteAdminFile: async (fileId: string) => {
    const res = await authFetch(`${API_BASE}/admin/files/${fileId}`, {
      method: "DELETE",
    });
    return res.json();
  },

  getAdminLogs: async () => {
    const res = await authFetch(`${API_BASE}/admin/logs`);
    return res.json() as Promise<SystemAuditLog[]>;
  },

  subscribePushNotification: async (subscription: any, userId?: string) => {
    const res = await authFetch(`${API_BASE}/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, userId }),
    });
    return res.json();
  },

  getAdminPushSubscriptions: async () => {
    const res = await authFetch(`${API_BASE}/admin/push-subscriptions`);
    return res.json();
  },

  // Forbidden Words
  getForbiddenWords: async () => {
    const res = await authFetch(`${API_BASE}/admin/forbidden-words`);
    return res.json() as Promise<ForbiddenWord[]>;
  },

  createForbiddenWord: async (data: { word: string; category?: WordCategory; isEnabled?: boolean }) => {
    const res = await authFetch(`${API_BASE}/admin/forbidden-words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ایجاد کلمه ممنوعه");
    }
    return res.json() as Promise<ForbiddenWord>;
  },

  updateForbiddenWord: async (id: string, data: Partial<ForbiddenWord>) => {
    const res = await authFetch(`${API_BASE}/admin/forbidden-words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ویرایش کلمه ممنوعه");
    }
    return res.json() as Promise<ForbiddenWord>;
  },

  deleteForbiddenWord: async (id: string) => {
    const res = await authFetch(`${API_BASE}/admin/forbidden-words/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },

  // Role Permissions
  getRolePermissions: async () => {
    const res = await authFetch(`${API_BASE}/admin/permissions`);
    return res.json() as Promise<RolePermission[]>;
  },

  updateRolePermissions: async (permissions: RolePermission[]) => {
    const res = await authFetch(`${API_BASE}/admin/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    return res.json();
  },

  // User Admin Operations
  createAdminUser: async (data: Partial<User>) => {
    const res = await authFetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ایجاد کاربر");
    }
    return res.json() as Promise<User>;
  },

  // Room Members & Ownership Admin Operations
  addRoomMemberAdmin: async (chatId: string, userId: string, role: string = "user") => {
    const res = await authFetch(`${API_BASE}/admin/rooms/${chatId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در افزودن عضو");
    }
    return res.json() as Promise<Chat>;
  },

  removeRoomMemberAdmin: async (chatId: string, userId: string) => {
    const res = await authFetch(`${API_BASE}/admin/rooms/${chatId}/members/${userId}`, {
      method: "DELETE",
    });
    return res.json() as Promise<Chat>;
  },

  updateRoomMemberRoleAdmin: async (chatId: string, userId: string, role: string) => {
    const res = await authFetch(`${API_BASE}/admin/rooms/${chatId}/members/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    return res.json() as Promise<Chat>;
  },

  transferRoomOwnerAdmin: async (chatId: string, newOwnerId: string) => {
    const res = await authFetch(`${API_BASE}/admin/rooms/${chatId}/transfer-owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOwnerId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در انتقال مالکیت");
    }
    return res.json() as Promise<Chat>;
  },

  // Message ID update (with unique check)
  updateAdminMessageId: async (messageId: string, newId: string, content?: string) => {
    const res = await authFetch(`${API_BASE}/admin/messages/${messageId}/id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newId, content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در بروزرسانی شناسه پیام");
    }
    return res.json() as Promise<Message>;
  },

  search: async (q: string) => {
    const res = await authFetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    return res.json() as Promise<{ users: User[]; chats: Chat[]; messages: Message[] }>;
  },

  // Database Settings Admin APIs
  getDatabaseSettings: async () => {
    const res = await authFetch(`${API_BASE}/admin/db-settings`);
    return res.json();
  },

  saveDatabaseSettings: async (config: any) => {
    const res = await authFetch(`${API_BASE}/admin/db-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ذخیره تنظیمات دیتابیس");
    }
    return res.json();
  },

  testDatabaseConnection: async (config: any) => {
    const res = await authFetch(`${API_BASE}/admin/db-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || "تست اتصال به دیتابیس ناموفق بود");
    }
    return data;
  },

  // SMS Panel Settings Admin APIs
  getSmsSettings: async () => {
    const res = await authFetch(`${API_BASE}/admin/sms-settings`);
    return res.json();
  },

  saveSmsSettings: async (config: any) => {
    const res = await authFetch(`${API_BASE}/admin/sms-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ذخیره تنظیمات پنل پیامک");
    }
    return res.json();
  },

  testSmsConnection: async (config: any) => {
    const res = await authFetch(`${API_BASE}/admin/sms-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || "تست اتصال به سامانه پیامک ناموفق بود");
    }
    return data;
  },

  sendTestSms: async (data: { mobile: string; message: string; provider?: string; apiKey?: string; senderNumber?: string; templateId?: string }) => {
    const res = await authFetch(`${API_BASE}/admin/sms-send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.message || resData.error || "ارسال پیامک تستی با خطا مواجه شد");
    }
    return resData;
  },

  // Push Notification Admin & Client APIs
  getPushSettings: async () => {
    const res = await authFetch(`${API_BASE}/admin/push-settings`);
    return res.json();
  },

  savePushSettings: async (config: any) => {
    const res = await authFetch(`${API_BASE}/admin/push-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در ذخیره تنظیمات نوتیفیکیشن");
    }
    return res.json();
  },

  generateVapidKeys: async () => {
    const res = await authFetch(`${API_BASE}/admin/push-generate-vapid`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "خطا در تولید کلید VAPID");
    }
    return data;
  },

  subscribePush: async (subscription: any, userId?: string) => {
    const res = await authFetch(`${API_BASE}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, userId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "خطا در ثبت اشتراک نوتیفیکیشن");
    }
    return data;
  },

  unsubscribePush: async (endpoint: string) => {
    const res = await authFetch(`${API_BASE}/subscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return res.json();
  },

  sendTestPush: async (data: { title: string; message: string; iconUrl?: string; imageUrl?: string; targetUser?: string; link?: string }) => {
    const res = await authFetch(`${API_BASE}/admin/push-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.error || resData.message || "ارسال Push تستی با خطا مواجه شد");
    }
    return resData;
  },

  getPushPolicy: async () => {
    const res = await authFetch(`${API_BASE}/admin/push-policy`);
    return res.json() as Promise<{ policy: "always" | "offline_only" | "mentions_only" | "direct_only" | "disabled" }>;
  },

  updatePushPolicy: async (policy: string) => {
    const res = await authFetch(`${API_BASE}/admin/push-policy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy }),
    });
    return res.json();
  },

  sendAdminPush: async (data: {
    targetType: "all" | "user" | "room";
    targetId?: string;
    title: string;
    message: string;
    link?: string;
    iconUrl?: string;
    imageUrl?: string;
  }) => {
    const res = await authFetch(`${API_BASE}/admin/push-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      throw new Error(resData.error || resData.message || "ارسال نوتیفیکیشن با خطا مواجه شد");
    }
    return resData;
  },
};
