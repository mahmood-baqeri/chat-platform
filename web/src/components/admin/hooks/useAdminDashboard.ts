import { useEffect, useState, type FormEvent } from "react";
import { useChat } from "../../../store/chatContext";
import { api } from "../../../services/api";
import { type SystemAuditLog, type User, type Chat, type Message, type Attachment, type ForbiddenWord, type RolePermission, type UserRole, type WordCategory, LogoPhoto } from "../../../types";
import { getErrorMessage } from "../utils/errorMessage";
import type { AdminStats, AdminUser, PushSubscriptionAdmin, PushPolicy } from "../types/adminDashboard.types";

export const useAdminDashboard = () => {

  const { showAdminPanel, setShowAdminPanel, systemSettings, updateSettings, currentUser } = useChat();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [groupsList, setGroupsList] = useState<Chat[]>([]);
  const [channelsList, setChannelsList] = useState<Chat[]>([]);
  const [messagesData, setMessagesData] = useState<{ activeMessages: Message[]; deletedMessages: Message[] }>({
    activeMessages: [],
    deletedMessages: [],
  });
  const [filesData, setFilesData] = useState<{ files: Attachment[]; totalCount: number; totalSizeBytes: number; totalSizeMB: string }>({
    files: [],
    totalCount: 0,
    totalSizeBytes: 0,
    totalSizeMB: "0",
  });
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [pushSubs, setPushSubs] = useState<PushSubscriptionAdmin[]>([]);

  // Sprint 2 Data States
  const [forbiddenWordsList, setForbiddenWordsList] = useState<ForbiddenWord[]>([]);
  const [rolePermissionsList, setRolePermissionsList] = useState<RolePermission[]>([]);

  const [activeTab, setActiveTab] = useState<
    "overview" | "toggles" | "users" | "groups" | "channels" | "forbiddenWords" | "permissions" | "messages" | "files" | "logs" | "database" | "smsSettings" | "pushNotification"
  >("overview");

  // Database Settings State
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: 3306,
    database: "chat_db",
    username: "root",
    password: "",
    charset: "utf8mb4",
    timezone: "+03:30",
    sslMode: "disabled" as "disabled" | "required" | "preferred" | "verify-ca",
  });
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dbSaving, setDbSaving] = useState(false);
  const [dbSaveResult, setDbSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // SMS Settings State
  const [smsConfig, setSmsConfig] = useState({
    provider: "smsir",
    apiKey: "",
    secretKey: "",
    senderNumber: "30000000",
    templateId: "",
    timeout: 10,
    isActive: true,
    username: "",
    password: "",
  });
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSaveResult, setSmsSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Send Test SMS Modal State
  const [showSendSmsModal, setShowSendSmsModal] = useState(false);
  const [testSmsMobile, setTestSmsMobile] = useState("");
  const [testSmsMessage, setTestSmsMessage] = useState("پیامک تست از سامانه چت پلتفرم");
  const [testSmsSending, setTestSmsSending] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Push Notification Settings State
  const [pushConfig, setPushConfig] = useState({
    vapidPublicKey: "",
    vapidPrivateKey: "",
    isActive: true,
    subscriptionCount: 0,
  });
  const [pushPolicy, setPushPolicy] = useState<"always" | "offline_only" | "mentions_only" | "direct_only" | "disabled">("always");
  const [pushSaving, setPushSaving] = useState(false);
  const [pushSaveResult, setPushSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showVapidSecret, setShowVapidSecret] = useState(false);

  // Send Test Push Modal State
  const [showTestPushModal, setShowTestPushModal] = useState(false);
  const [testPushForm, setTestPushForm] = useState({
    title: "اعلان عمومی پلتفرم چت",
    message: "این یک پیام Push تستی واقعی ارسال‌شده به مرورگر شما می‌باشد.",
    iconUrl: LogoPhoto,
    imageUrl: "",
    targetUser: "all",
    link: "/",
  });
  const [pushTargetType, setPushTargetType] = useState<"all" | "user" | "room">("all");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [testPushSending, setTestPushSending] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ success: boolean; message: string } | null>(null);

  const [localSettings, setLocalSettings] = useState(systemSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [permSaveSuccess, setPermSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter & Search & Pagination States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSortBy, setUserSortBy] = useState<"name" | "createdAt" | "role" | "messages">("name");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [fwSearchQuery, setFwSearchQuery] = useState("");
  const [fwCategoryFilter, setFwCategoryFilter] = useState<string>("all");

  // Modals & Form States
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    phone: "",
    username: "",
    firstName: "",
    lastName: "",
    displayName: "",
    role: "user" as UserRole,
    bio: "",
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    type: "group" as "group" | "channel",
    title: "",
    description: "",
    avatarUrl: "",
    username: "",
    isPrivate: false,
    ownerId: "user-1",
  });

  const [editingRoom, setEditingRoom] = useState<Chat | null>(null);
  const [managingRoomMembers, setManagingRoomMembers] = useState<Chat | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("user");

  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [newWordText, setNewWordText] = useState("");
  const [newWordCategory, setNewWordCategory] = useState<WordCategory>("custom");
  const [editingWord, setEditingWord] = useState<ForbiddenWord | null>(null);

  const [editingMsgModal, setEditingMsgModal] = useState<Message | null>(null);
  const [newMsgIdValue, setNewMsgIdValue] = useState("");
  const [newMsgContentValue, setNewMsgContentValue] = useState("");

  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    isOpen: boolean;
    onConfirm: () => Promise<void> | void;
    title?: string;
    description?: string;
  }>({
    isOpen: false,
    onConfirm: () => { },
  });

  const triggerConfirm = (onConfirmAction: () => Promise<void> | void, title?: string, description?: string) => {
    setConfirmDeleteState({
      isOpen: true,
      onConfirm: async () => {
        await onConfirmAction();
        setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }));
      },
      title,
      description,
    });
  };

  const loadData = () => {
    api.getAdminStats().then(setStats).catch(() => { });
    api.getAdminUsers().then(setUsersList).catch(() => { });
    api.getAdminGroups().then(setGroupsList).catch(() => { });
    api.getAdminChannels().then(setChannelsList).catch(() => { });
    api.getAdminMessages().then(setMessagesData).catch(() => { });
    api.getAdminFiles().then(setFilesData).catch(() => { });
    api.getAdminLogs().then(setLogs).catch(() => { });
    api.getAdminPushSubscriptions().then(setPushSubs).catch(() => { });
    api.getForbiddenWords().then(setForbiddenWordsList).catch(() => { });
    api.getRolePermissions().then(setRolePermissionsList).catch(() => { });
  };

  const fetchDbSettings = async () => {
    try {
      const cfg = await api.getDatabaseSettings();
      if (cfg) setDbConfig(cfg);
    } catch (e) {
      console.error("Failed to load db settings:", e);
    }
  };

  const handleTestDbConnection = async (e: FormEvent) => {
    e.preventDefault();
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await api.testDatabaseConnection(dbConfig);
      setDbTestResult({
        success: true,
        message: res.message || "اتصال به دیتابیس MySQL با موفقیت برقرار شد.",
      });
    } catch (err: unknown) {
      setDbTestResult({
        success: false,
        message: getErrorMessage(err) || "خطا در اتصال به دیتابیس MySQL.",
      });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSaveDbSettings = async (e: FormEvent) => {
    e.preventDefault();
    setDbSaving(true);
    setDbSaveResult(null);
    try {
      const res = await api.saveDatabaseSettings(dbConfig);
      setDbSaveResult({
        success: true,
        message: res.message || "تنظیمات دیتابیس با موفقیت ذخیره شد.",
      });
      setTimeout(() => setDbSaveResult(null), 4000);
    } catch (err: unknown) {
      setDbSaveResult({
        success: false,
        message: getErrorMessage(err) || "خطا در ذخیره تنظیمات دیتابیس.",
      });
    } finally {
      setDbSaving(false);
    }
  };

  const fetchSmsSettings = async () => {
    try {
      const cfg = await api.getSmsSettings();
      if (cfg) setSmsConfig(cfg);
    } catch (e) {
      console.error("Failed to load SMS settings:", e);
    }
  };

  const handleTestSmsConnection = async (e: FormEvent) => {
    e.preventDefault();
    setSmsTesting(true);
    setSmsTestResult(null);
    try {
      const res = await api.testSmsConnection(smsConfig);
      setSmsTestResult({
        success: true,
        message: res.message || "اتصال به سامانه پیامک با موفقیت انجام شد.",
      });
    } catch (err: unknown) {
      setSmsTestResult({
        success: false,
        message: getErrorMessage(err) || "خطا در برقراری ارتباط با پنل پیامک.",
      });
    } finally {
      setSmsTesting(false);
    }
  };

  const handleSaveSmsSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSmsSaving(true);
    setSmsSaveResult(null);
    try {
      const res = await api.saveSmsSettings(smsConfig);
      setSmsSaveResult({
        success: true,
        message: res.message || "تنظیمات پنل پیامک با موفقیت ذخیره شد.",
      });
      setTimeout(() => setSmsSaveResult(null), 4000);
    } catch (err: unknown) {
      setSmsSaveResult({
        success: false,
        message: getErrorMessage(err) || "خطا در ذخیره تنظیمات پنل پیامک.",
      });
    } finally {
      setSmsSaving(false);
    }
  };

  const handleResetSmsSettings = () => {
    setSmsConfig({
      provider: "smsir",
      apiKey: "",
      secretKey: "",
      senderNumber: "30000000",
      templateId: "",
      timeout: 10,
      isActive: true,
      username: "",
      password: "",
    });
    setSmsTestResult(null);
    setSmsSaveResult(null);
  };

  const handleSendTestSms = async (e: FormEvent) => {
    e.preventDefault();
    if (!testSmsMobile) return;
    setTestSmsSending(true);
    setTestSmsResult(null);
    try {
      const res = await api.sendTestSms({
        mobile: testSmsMobile,
        message: testSmsMessage,
        ...smsConfig,
      });
      setTestSmsResult({
        success: true,
        message: res.message || "پیامک تست با موفقیت به گیرنده ارسال گردید.",
      });
    } catch (err: unknown) {
      setTestSmsResult({
        success: false,
        message: getErrorMessage(err) || "خطا در ارسال پیامک تست.",
      });
    } finally {
      setTestSmsSending(false);
    }
  };

  const fetchPushSettings = async () => {
    try {
      const data = await api.getPushSettings();
      if (data) {
        setPushConfig({
          vapidPublicKey: data.vapidPublicKey || "",
          vapidPrivateKey: data.vapidPrivateKey || "",
          isActive: data.isActive !== undefined ? data.isActive : true,
          subscriptionCount: data.subscriptionCount || 0,
        });
        if (data.subscriptions) {
          setPushSubs(data.subscriptions);
        }
      }
      const policyRes = await api.getPushPolicy();
      if (policyRes && policyRes.policy) {
        setPushPolicy(policyRes.policy as PushPolicy);
      }
    } catch (e) {
      console.error("Failed to load Push settings:", e);
    }
  };

  const handleSavePushPolicy = async (policyValue: typeof pushPolicy) => {
    setPushPolicy(policyValue);
    try {
      await api.updatePushPolicy(policyValue);
    } catch (e) {
      console.error("Failed to save push policy:", e);
    }
  };

  const handleSavePushSettings = async (e: FormEvent) => {
    e.preventDefault();
    setPushSaving(true);
    setPushSaveResult(null);
    try {
      const res = await api.savePushSettings(pushConfig);
      setPushSaveResult({
        success: true,
        message: res.message || "تنظیمات Push Notification با موفقیت ذخیره گردید.",
      });
      setTimeout(() => setPushSaveResult(null), 4000);
    } catch (err: unknown) {
      setPushSaveResult({
        success: false,
        message: getErrorMessage(err) || "خطا در ذخیره تنظیمات Push Notification.",
      });
    } finally {
      setPushSaving(false);
    }
  };

  const handleGenerateVapidKeys = async () => {
    try {
      const res = await api.generateVapidKeys();
      if (res.vapidPublicKey && res.vapidPrivateKey) {
        setPushConfig((prev) => ({
          ...prev,
          vapidPublicKey: res.vapidPublicKey,
          vapidPrivateKey: res.vapidPrivateKey,
        }));
        setPushSaveResult({
          success: true,
          message: "کلیدهای جدید VAPID با موفقیت تولید و جایگزین شدند.",
        });
        setTimeout(() => setPushSaveResult(null), 4000);
      }
    } catch (err: unknown) {
      setPushSaveResult({
        success: false,
        message: getErrorMessage(err) || "خطا در تولید کلید VAPID",
      });
    }
  };

  const handleSendTestPush = async (e: FormEvent) => {
    e.preventDefault();
    setTestPushSending(true);
    setTestPushResult(null);
    try {
      let res;
      if (pushTargetType === "all") {
        res = await api.sendTestPush({ ...testPushForm, targetUser: "all" });
      } else {
        res = await api.sendAdminPush({
          targetType: pushTargetType,
          targetId: selectedTargetId,
          title: testPushForm.title,
          message: testPushForm.message,
          link: testPushForm.link,
          iconUrl: testPushForm.iconUrl,
        });
      }
      setTestPushResult({
        success: true,
        message: res.message || "اعلان Push با موفقیت ارسال شد.",
      });
    } catch (err: unknown) {
      setTestPushResult({
        success: false,
        message: getErrorMessage(err) || "خطا در ارسال اعلان Push.",
      });
    } finally {
      setTestPushSending(false);
    }
  };

  const handleSubscribeCurrentBrowser = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("مرورگر شما از قابلیت Web Push پشتیبانی نمی‌کند.");
      return;
    }

    try {
      // 1. دریافت VAPID Public Key از سرور
      const response = await fetch('/api/push-public-key');
      if (!response.ok) {
        throw new Error("خطا در دریافت کلید VAPID از سرور");
      }
      const data = (await response.json()) as { vapidPublicKey?: string };
      const vapidPublicKey = data.vapidPublicKey;

      if (!vapidPublicKey) {
        alert("کلید VAPID Public Key در سیستم تنظیم نشده است.");
        return;
      }

      console.log("🔑 VAPID Public Key:", vapidPublicKey);

      // 2. ثبت Service Worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. دریافت یا ایجاد اشتراک
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // 4. ارسال اشتراک به سرور
      await api.subscribePush(sub, String(currentUser?.id || "admin"));

      // 5. بروزرسانی لیست
      await fetchPushSettings();
      alert("✅ اشتراک Push مرورگر شما با موفقیت در سیستم ثبت شد.");
    } catch (err: unknown) {
      console.error("Error subscribing to Push:", err);
      alert("❌ خطا در ثبت اشتراک Push: " + (getErrorMessage(err) || err));
    }
  };

  const handleDeleteMessageAdmin = async (messageId: string) => {
    triggerConfirm(async () => {
      await api.deleteMessage(messageId);
      setMessagesData((prev) => ({
        ...prev,
        activeMessages: prev.activeMessages.filter((m) => m.id !== messageId),
      }));
    }, "حذف دائم پیام از سیستم", "آیا از حذف این پیام از پایگاه داده و تمام چت‌روم‌ها اطمینان دارید؟");
  };

  const isAdminUser = currentUser && (currentUser.role === "admin" || currentUser.role === "owner" || currentUser.role === "super_admin");

  useEffect(() => {
    if (showAdminPanel && isAdminUser) {
      loadData();
      fetchDbSettings();
      fetchSmsSettings();
      fetchPushSettings();
      setLocalSettings(systemSettings);
    }
  }, [showAdminPanel, systemSettings, isAdminUser]);

  const toggleFeature = (key: keyof typeof systemSettings) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveToggles = async () => {
    await updateSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // User Actions
  const handleToggleBan = async (userId: string) => {
    const updated = await api.toggleBanUser(userId);
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const handleToggleMute = async (userId: string) => {
    const user = usersList.find((u) => u.id === userId);
    if (!user) return;
    const updated = await api.updateUserAdmin(userId, { isMuted: !user.isMuted });
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const updated = await api.updateUserAdmin(userId, { role: newRole });
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const handleTerminateSessions = async (userId: string) => {
    await api.terminateUserSessionsAdmin(userId);
    alert("تمام نشست‌های فعال کاربر با موفقیت بسته شد.");
  };

  const handleDeleteUser = async (userId: string) => {
    triggerConfirm(async () => {
      await api.deleteUserAdmin(userId);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
    }, "آیا از حذف این کاربر اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createAdminUser(newUserForm);
      setUsersList((prev) => [...prev, created]);
      setShowCreateUserModal(false);
      setNewUserForm({ phone: "", username: "", firstName: "", lastName: "", displayName: "", role: "user", bio: "" });
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در ایجاد کاربر");
    }
  };

  const handleSaveUserEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await api.updateUserAdmin(String(editingUser.id), editingUser);
      setUsersList((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditingUser(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در بروزرسانی کاربر");
    }
  };

  // Room Actions
  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (newRoomForm.type === "group") {
        const created = await api.createAdminGroup(newRoomForm);
        setGroupsList((prev) => [created, ...prev]);
      } else {
        const created = await api.createAdminChannel(newRoomForm);
        setChannelsList((prev) => [created, ...prev]);
      }
      setShowCreateRoomModal(false);
      setNewRoomForm({ type: "group", title: "", description: "", avatarUrl: "", username: "", isPrivate: false, ownerId: String(currentUser?.id || "user-1") });
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در ساخت گفت‌وگو");
    }
  };

  const handleSaveRoomEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      if (editingRoom.type === "group") {
        const updated = await api.updateAdminGroup(editingRoom.id, editingRoom);
        setGroupsList((prev) => prev.map((g) => (g.id === editingRoom.id ? updated : g)));
      } else {
        const updated = await api.updateAdminChannel(editingRoom.id, editingRoom);
        setChannelsList((prev) => prev.map((c) => (c.id === editingRoom.id ? updated : c)));
      }
      setEditingRoom(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در ویرایش گفتگو");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    triggerConfirm(async () => {
      await api.deleteAdminGroup(groupId);
      setGroupsList((prev) => prev.filter((g) => g.id !== groupId));
    }, "آیا از حذف این گروه اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  const handleDeleteChannel = async (channelId: string) => {
    triggerConfirm(async () => {
      await api.deleteAdminChannel(channelId);
      setChannelsList((prev) => prev.filter((c) => c.id !== channelId));
    }, "آیا از حذف این کانال اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  const handleAddMemberToRoom = async () => {
    if (!managingRoomMembers || !newMemberUserId) return;
    try {
      const updated = await api.addRoomMemberAdmin(managingRoomMembers.id, newMemberUserId, newMemberRole);
      setManagingRoomMembers(updated);
      if (updated.type === "group") setGroupsList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      else setChannelsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setNewMemberUserId("");
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در افزودن عضو");
    }
  };

  const handleRemoveMemberFromRoom = async (userId: string) => {
    if (!managingRoomMembers) return;
    triggerConfirm(async () => {
      try {
        const updated = await api.removeRoomMemberAdmin(managingRoomMembers.id, userId);
        setManagingRoomMembers(updated);
        if (updated.type === "group") setGroupsList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        else setChannelsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch (err: unknown) {
        alert(getErrorMessage(err) || "خطا در حذف عضو");
      }
    }, "آیا از اخراج این عضو اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  const handleUpdateMemberRoleInRoom = async (userId: string, role: string) => {
    if (!managingRoomMembers) return;
    try {
      const updated = await api.updateRoomMemberRoleAdmin(managingRoomMembers.id, userId, role);
      setManagingRoomMembers(updated);
      if (updated.type === "group") setGroupsList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      else setChannelsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در تغییر نقش عضو");
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!managingRoomMembers) return;
    triggerConfirm(async () => {
      try {
        const updated = await api.transferRoomOwnerAdmin(managingRoomMembers.id, newOwnerId);
        setManagingRoomMembers(updated);
        if (updated.type === "group") setGroupsList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        else setChannelsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } catch (err: unknown) {
        alert(getErrorMessage(err) || "خطا در انتقال مالکیت");
      }
    }, "آیا از انتقال مالکیت اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  // Forbidden Words Actions
  const handleAddWord = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWordText.trim()) return;
    try {
      const created = await api.createForbiddenWord({ word: newWordText.trim(), category: newWordCategory, isEnabled: true });
      setForbiddenWordsList((prev) => [created, ...prev]);
      setShowAddWordModal(false);
      setNewWordText("");
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در افزودن کلمه ممنوعه");
    }
  };

  const handleToggleWordStatus = async (wordItem: ForbiddenWord) => {
    try {
      const updated = await api.updateForbiddenWord(String(wordItem.id), { isEnabled: !wordItem.isEnabled });
      setForbiddenWordsList((prev) => prev.map((w) => (w.id === wordItem.id ? updated : w)));
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در تغییر وضعیت کلمه ممنوعه");
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    triggerConfirm(async () => {
      await api.deleteForbiddenWord(wordId);
      setForbiddenWordsList((prev) => prev.filter((w) => w.id !== wordId));
    }, "آیا از حذف این کلمه ممنوعه اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  // Role Permissions Actions
  const handleTogglePermission = (roleIndex: number, permKey: keyof RolePermission["permissions"]) => {
    setRolePermissionsList((prev) =>
      prev.map((rolePermission, index) =>
        index === roleIndex
          ? { ...rolePermission, permissions: { ...rolePermission.permissions, [permKey]: !rolePermission.permissions[permKey] } }
          : rolePermission
      )
    );
  };

  const handleSavePermissions = async () => {
    await api.updateRolePermissions(rolePermissionsList);
    setPermSaveSuccess(true);
    setTimeout(() => setPermSaveSuccess(false), 3000);
  };

  // Message ID Actions
  const handleSaveMsgId = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMsgModal || !newMsgIdValue.trim()) return;
    try {
      const updated = await api.updateAdminMessageId(String(editingMsgModal.id), newMsgIdValue.trim(), newMsgContentValue);
      setMessagesData((prev) => ({
        ...prev,
        activeMessages: prev.activeMessages.map((m) => (m.id === editingMsgModal.id ? updated : m)),
      }));
      setEditingMsgModal(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "خطا در بروزرسانی شناسه پیام");
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRestoreMessage = async (messageId: string) => {
    await api.restoreAdminMessage(messageId);
    loadData();
  };

  const handleDeleteFile = async (fileId: string) => {
    triggerConfirm(async () => {
      await api.deleteAdminFile(fileId);
      setFilesData((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== fileId),
      }));
    }, "آیا از حذف این فایل اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  // User Filtering & Sorting
  const filteredUsers = usersList
    .filter(
      (u) =>
        u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.phone.includes(userSearchQuery) ||
        String(u.id).toLowerCase().includes(userSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (userSortBy === "name") return a.displayName.localeCompare(b.displayName);
      if (userSortBy === "role") return a.role.localeCompare(b.role);
      if (userSortBy === "messages") return (b.messagesCount || 0) - (a.messagesCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userCurrentPage - 1) * usersPerPage, userCurrentPage * usersPerPage);

  const filteredGroups = groupsList.filter((g) => g.title.toLowerCase().includes(roomSearchQuery.toLowerCase()) || g.id.includes(roomSearchQuery));
  const filteredChannels = channelsList.filter((c) => c.title.toLowerCase().includes(roomSearchQuery.toLowerCase()) || c.id.includes(roomSearchQuery));

  const filteredWords = forbiddenWordsList.filter((w) => {
    const matchesSearch = w.word.toLowerCase().includes(fwSearchQuery.toLowerCase());
    const matchesCat = fwCategoryFilter === "all" || w.category === fwCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredActiveMessages = messagesData.activeMessages.filter((m) => String(m.id).toLowerCase().includes(msgSearchQuery.toLowerCase()) || m.content.toLowerCase().includes(msgSearchQuery.toLowerCase()));

  return {
    stats,
    setStats,
    usersList,
    setUsersList,
    groupsList,
    setGroupsList,
    channelsList,
    setChannelsList,
    messagesData,
    setMessagesData,
    filesData,
    setFilesData,
    logs,
    setLogs,
    pushSubs,
    setPushSubs,
    forbiddenWordsList,
    setForbiddenWordsList,
    rolePermissionsList,
    setRolePermissionsList,
    activeTab,
    setActiveTab,
    dbConfig,
    setDbConfig,
    dbTesting,
    setDbTesting,
    dbTestResult,
    setDbTestResult,
    dbSaving,
    setDbSaving,
    dbSaveResult,
    setDbSaveResult,
    smsConfig,
    setSmsConfig,
    smsTesting,
    setSmsTesting,
    smsTestResult,
    setSmsTestResult,
    smsSaving,
    setSmsSaving,
    smsSaveResult,
    setSmsSaveResult,
    showSendSmsModal,
    setShowSendSmsModal,
    testSmsMobile,
    setTestSmsMobile,
    testSmsMessage,
    setTestSmsMessage,
    testSmsSending,
    setTestSmsSending,
    testSmsResult,
    setTestSmsResult,
    pushConfig,
    setPushConfig,
    pushPolicy,
    setPushPolicy,
    pushSaving,
    setPushSaving,
    pushSaveResult,
    setPushSaveResult,
    showVapidSecret,
    setShowVapidSecret,
    showTestPushModal,
    setShowTestPushModal,
    testPushForm,
    setTestPushForm,
    pushTargetType,
    setPushTargetType,
    selectedTargetId,
    setSelectedTargetId,
    testPushSending,
    setTestPushSending,
    testPushResult,
    setTestPushResult,
    localSettings,
    setLocalSettings,
    saveSuccess,
    setSaveSuccess,
    permSaveSuccess,
    setPermSaveSuccess,
    copiedId,
    setCopiedId,
    userSearchQuery,
    setUserSearchQuery,
    userSortBy,
    setUserSortBy,
    userCurrentPage,
    setUserCurrentPage,
    usersPerPage,
    roomSearchQuery,
    setRoomSearchQuery,
    msgSearchQuery,
    setMsgSearchQuery,
    fwSearchQuery,
    setFwSearchQuery,
    fwCategoryFilter,
    setFwCategoryFilter,
    showCreateUserModal,
    setShowCreateUserModal,
    newUserForm,
    setNewUserForm,
    editingUser,
    setEditingUser,
    showCreateRoomModal,
    setShowCreateRoomModal,
    newRoomForm,
    setNewRoomForm,
    editingRoom,
    setEditingRoom,
    managingRoomMembers,
    setManagingRoomMembers,
    newMemberUserId,
    setNewMemberUserId,
    newMemberRole,
    setNewMemberRole,
    showAddWordModal,
    setShowAddWordModal,
    newWordText,
    setNewWordText,
    newWordCategory,
    setNewWordCategory,
    editingWord,
    setEditingWord,
    editingMsgModal,
    setEditingMsgModal,
    newMsgIdValue,
    setNewMsgIdValue,
    newMsgContentValue,
    setNewMsgContentValue,
    confirmDeleteState,
    setConfirmDeleteState,
    triggerConfirm,
    loadData,
    fetchDbSettings,
    handleTestDbConnection,
    handleSaveDbSettings,
    fetchSmsSettings,
    handleTestSmsConnection,
    handleSaveSmsSettings,
    handleResetSmsSettings,
    handleSendTestSms,
    fetchPushSettings,
    handleSavePushPolicy,
    handleSavePushSettings,
    handleGenerateVapidKeys,
    handleSendTestPush,
    handleSubscribeCurrentBrowser,
    handleDeleteMessageAdmin,
    isAdminUser,
    toggleFeature,
    handleSaveToggles,
    handleToggleBan,
    handleToggleMute,
    handleRoleChange,
    handleTerminateSessions,
    handleDeleteUser,
    handleCreateUser,
    handleSaveUserEdit,
    handleCreateRoom,
    handleSaveRoomEdit,
    handleDeleteGroup,
    handleDeleteChannel,
    handleAddMemberToRoom,
    handleRemoveMemberFromRoom,
    handleUpdateMemberRoleInRoom,
    handleTransferOwnership,
    handleAddWord,
    handleToggleWordStatus,
    handleDeleteWord,
    handleTogglePermission,
    handleSavePermissions,
    handleSaveMsgId,
    handleCopyId,
    handleRestoreMessage,
    handleDeleteFile,
    filteredUsers,
    totalUserPages,
    paginatedUsers,
    filteredGroups,
    filteredChannels,
    filteredWords,
    filteredActiveMessages,
    showAdminPanel,
    setShowAdminPanel,
    systemSettings,
    updateSettings,
    currentUser
  };
};
