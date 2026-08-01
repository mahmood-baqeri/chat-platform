import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { SystemAuditLog, User, Chat, Message, Attachment, ForbiddenWord, RolePermission, UserRole, WordCategory } from "../../types";
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal";
import {
  X,
  Shield,
  Users,
  MessageSquare,
  FileText,
  Activity,
  ToggleLeft,
  ToggleRight,
  Ban,
  UserCheck,
  Check,
  RotateCcw,
  Sparkles,
  Server,
  Folder,
  Radio,
  Search,
  Trash2,
  Bell,
  HardDrive,
  RefreshCw,
  Plus,
  Key,
  Edit,
  Copy,
  Lock,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Volume2,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { showAdminPanel, setShowAdminPanel, systemSettings, updateSettings, currentUser } = useChat();

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
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
  const [pushSubs, setPushSubs] = useState<any[]>([]);

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
  const [pushSaving, setPushSaving] = useState(false);
  const [pushSaveResult, setPushSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showVapidSecret, setShowVapidSecret] = useState(false);

  // Send Test Push Modal State
  const [showTestPushModal, setShowTestPushModal] = useState(false);
  const [testPushForm, setTestPushForm] = useState({
    title: "اعلان عمومی پلتفرم چت",
    message: "این یک پیام Push تستی واقعی ارسال‌شده به مرورگر شما می‌باشد.",
    iconUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    imageUrl: "",
    targetUser: "all",
    link: "/",
  });
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
    onConfirm: () => {},
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
    api.getAdminStats().then(setStats).catch(() => {});
    api.getAdminUsers().then(setUsersList).catch(() => {});
    api.getAdminGroups().then(setGroupsList).catch(() => {});
    api.getAdminChannels().then(setChannelsList).catch(() => {});
    api.getAdminMessages().then(setMessagesData).catch(() => {});
    api.getAdminFiles().then(setFilesData).catch(() => {});
    api.getAdminLogs().then(setLogs).catch(() => {});
    api.getAdminPushSubscriptions().then(setPushSubs).catch(() => {});
    api.getForbiddenWords().then(setForbiddenWordsList).catch(() => {});
    api.getRolePermissions().then(setRolePermissionsList).catch(() => {});
  };

  const fetchDbSettings = async () => {
    try {
      const cfg = await api.getDatabaseSettings();
      if (cfg) setDbConfig(cfg);
    } catch (e) {
      console.error("Failed to load db settings:", e);
    }
  };

  const handleTestDbConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await api.testDatabaseConnection(dbConfig);
      setDbTestResult({
        success: true,
        message: res.message || "اتصال به دیتابیس MySQL با موفقیت برقرار شد.",
      });
    } catch (err: any) {
      setDbTestResult({
        success: false,
        message: err.message || "خطا در اتصال به دیتابیس MySQL.",
      });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSaveDbSettings = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setDbSaveResult({
        success: false,
        message: err.message || "خطا در ذخیره تنظیمات دیتابیس.",
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

  const handleTestSmsConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsTesting(true);
    setSmsTestResult(null);
    try {
      const res = await api.testSmsConnection(smsConfig);
      setSmsTestResult({
        success: true,
        message: res.message || "اتصال به سامانه پیامک با موفقیت انجام شد.",
      });
    } catch (err: any) {
      setSmsTestResult({
        success: false,
        message: err.message || "خطا در برقراری ارتباط با پنل پیامک.",
      });
    } finally {
      setSmsTesting(false);
    }
  };

  const handleSaveSmsSettings = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setSmsSaveResult({
        success: false,
        message: err.message || "خطا در ذخیره تنظیمات پنل پیامک.",
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

  const handleSendTestSms = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setTestSmsResult({
        success: false,
        message: err.message || "خطا در ارسال پیامک تست.",
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
    } catch (e) {
      console.error("Failed to load Push settings:", e);
    }
  };

  const handleSavePushSettings = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setPushSaveResult({
        success: false,
        message: err.message || "خطا در ذخیره تنظیمات Push Notification.",
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
    } catch (err: any) {
      setPushSaveResult({
        success: false,
        message: err.message || "خطا در تولید کلید VAPID",
      });
    }
  };

  const handleSendTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestPushSending(true);
    setTestPushResult(null);
    try {
      const res = await api.sendTestPush(testPushForm);
      setTestPushResult({
        success: true,
        message: res.message || "اعلان Push تستی با موفقیت ارسال شد.",
      });
    } catch (err: any) {
      setTestPushResult({
        success: false,
        message: err.message || "خطا در ارسال اعلان Push.",
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
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (!pushConfig.vapidPublicKey) {
          alert("ابتدا باید کلید VAPID Public Key در پنل تنظیم و ذخیره شده باشد.");
          return;
        }

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
          applicationServerKey: urlBase64ToUint8Array(pushConfig.vapidPublicKey),
        });
      }

      await api.subscribePush(sub, currentUser?.id || "admin");
      await fetchPushSettings();
      alert("اشتراک Push مرورگر شما با موفقیت در سیستم ثبت شد.");
    } catch (err: any) {
      console.error("Error subscribing to Push:", err);
      alert("خطا در ثبت اشتراک Push: " + (err.message || err));
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

  useEffect(() => {
    if (showAdminPanel) {
      loadData();
      fetchDbSettings();
      fetchSmsSettings();
      fetchPushSettings();
      setLocalSettings(systemSettings);
    }
  }, [showAdminPanel, systemSettings]);

  if (!showAdminPanel) return null;

  if (currentUser && currentUser.role !== "owner" && currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#1A1D2B] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md text-center text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-2">دسترسی غیرمجاز (Access Denied)</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            شما سطح دسترسی مدیر (Admin) را برای ورود به این پنل ندارید.
          </p>
          <button
            onClick={() => setShowAdminPanel(false)}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createAdminUser(newUserForm);
      setUsersList((prev) => [...prev, created]);
      setShowCreateUserModal(false);
      setNewUserForm({ phone: "", username: "", firstName: "", lastName: "", displayName: "", role: "user", bio: "" });
    } catch (err: any) {
      alert(err.message || "خطا در ایجاد کاربر");
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await api.updateUserAdmin(editingUser.id, editingUser);
      setUsersList((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || "خطا در بروزرسانی کاربر");
    }
  };

  // Room Actions
  const handleCreateRoom = async (e: React.FormEvent) => {
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
      setNewRoomForm({ type: "group", title: "", description: "", avatarUrl: "", username: "", isPrivate: false, ownerId: currentUser?.id || "user-1" });
    } catch (err: any) {
      alert(err.message || "خطا در ساخت گفت‌وگو");
    }
  };

  const handleSaveRoomEdit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      alert(err.message || "خطا در ویرایش گفتگو");
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
    } catch (err: any) {
      alert(err.message || "خطا در افزودن عضو");
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
      } catch (err: any) {
        alert(err.message || "خطا در حذف عضو");
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
    } catch (err: any) {
      alert(err.message || "خطا در تغییر نقش عضو");
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
      } catch (err: any) {
        alert(err.message || "خطا در انتقال مالکیت");
      }
    }, "آیا از انتقال مالکیت اطمینان دارید؟", "این عملیات قابل بازگشت نیست.");
  };

  // Forbidden Words Actions
  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordText.trim()) return;
    try {
      const created = await api.createForbiddenWord({ word: newWordText.trim(), category: newWordCategory, isEnabled: true });
      setForbiddenWordsList((prev) => [created, ...prev]);
      setShowAddWordModal(false);
      setNewWordText("");
    } catch (err: any) {
      alert(err.message || "خطا در افزودن کلمه ممنوعه");
    }
  };

  const handleToggleWordStatus = async (wordItem: ForbiddenWord) => {
    try {
      const updated = await api.updateForbiddenWord(wordItem.id, { isEnabled: !wordItem.isEnabled });
      setForbiddenWordsList((prev) => prev.map((w) => (w.id === wordItem.id ? updated : w)));
    } catch (err: any) {
      alert(err.message || "خطا در تغییر وضعیت کلمه ممنوعه");
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
    setRolePermissionsList((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[roleIndex].permissions[permKey] = !copy[roleIndex].permissions[permKey];
      return copy;
    });
  };

  const handleSavePermissions = async () => {
    await api.updateRolePermissions(rolePermissionsList);
    setPermSaveSuccess(true);
    setTimeout(() => setPermSaveSuccess(false), 3000);
  };

  // Message ID Actions
  const handleSaveMsgId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMsgModal || !newMsgIdValue.trim()) return;
    try {
      const updated = await api.updateAdminMessageId(editingMsgModal.id, newMsgIdValue.trim(), newMsgContentValue);
      setMessagesData((prev) => ({
        ...prev,
        activeMessages: prev.activeMessages.map((m) => (m.id === editingMsgModal.id ? updated : m)),
      }));
      setEditingMsgModal(null);
    } catch (err: any) {
      alert(err.message || "خطا در بروزرسانی شناسه پیام");
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
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.phone.includes(userSearchQuery) ||
        u.id.toLowerCase().includes(userSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (userSortBy === "name") return a.displayName.localeCompare(b.displayName);
      if (userSortBy === "role") return a.role.localeCompare(b.role);
      if (userSortBy === "messages") return ((b as any).messagesCount || 0) - ((a as any).messagesCount || 0);
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

  const filteredActiveMessages = messagesData.activeMessages.filter((m) => m.id.toLowerCase().includes(msgSearchQuery.toLowerCase()) || m.content.toLowerCase().includes(msgSearchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#121420] border border-white/10 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* HEADER BAR */}
        <div className="px-6 py-4 bg-[#181B28] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                پنل مدیریت سیستم (Admin Control Panel)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Sprint 2
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">مدیریت کاربران، گفت‌وگوها، کلمات ممنوعه، دسترسی‌ها و شناسه پیام‌ها</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="بروزرسانی اطلاعات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdminPanel(false)}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 pt-3 bg-[#181B28]/50 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: "overview", label: "آمار کلی", icon: Activity },
            { id: "users", label: "مدیریت کاربران", icon: Users, badge: usersList.length },
            { id: "groups", label: "مدیریت گروه‌ها", icon: Folder, badge: groupsList.length },
            { id: "channels", label: "مدیریت کانال‌ها", icon: Radio, badge: channelsList.length },
            { id: "forbiddenWords", label: "کلمات ممنوعه", icon: Ban, badge: forbiddenWordsList.length },
            { id: "permissions", label: "نقش‌ها و دسترسی‌ها", icon: Key },
            { id: "messages", label: "پیام‌ها & Message ID", icon: MessageSquare, badge: messagesData.activeMessages.length },
            { id: "files", label: "مدیریت فایل‌ها", icon: HardDrive, badge: filesData.totalCount },
            { id: "database", label: "تنظیمات دیتابیس", icon: Database },
            { id: "smsSettings", label: "تنظیمات پنل پیامک", icon: Bell },
            { id: "pushNotification", label: "تنظیمات Push Notification", icon: Sparkles, badge: pushSubs.length },
            { id: "toggles", label: "تنظیمات سیستم", icon: ToggleLeft },
            { id: "logs", label: "گزارشات لاگ", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 rounded-t-2xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#121420] text-blue-400 border-t-2 border-blue-500 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#121420]">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 space-y-1">
                  <span className="text-xs text-blue-300/80">کل کاربران سیستم</span>
                  <p className="text-2xl font-bold font-mono">{stats.totalUsers}</p>
                  <span className="text-[10px] text-blue-300">({stats.onlineCount} آنلاین)</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                  <span className="text-xs text-emerald-300/80">گفت‌وگوهای فعال</span>
                  <p className="text-2xl font-bold font-mono">{stats.activeChats}</p>
                  <span className="text-[10px] text-emerald-300">({stats.groupsCount} گروه / {stats.channelsCount} کانال)</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 space-y-1">
                  <span className="text-xs text-amber-300/80">کل پیام‌های مبادله‌شده</span>
                  <p className="text-2xl font-bold font-mono">{stats.totalMessages}</p>
                  <span className="text-[10px] text-amber-300">({stats.deletedMessagesCount} حذف‌شده)</span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 space-y-1">
                  <span className="text-xs text-indigo-300/80">حجم ذخیره‌سازی فایل‌ها</span>
                  <p className="text-2xl font-bold font-mono">{stats.totalStorageMB} MB</p>
                  <span className="text-[10px] text-indigo-300">({stats.totalFiles} فایل)</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>وضعیت سرور و اتصال WebSocket</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">کلاینت‌های متصل به WS:</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{stats.wsConnectedCount} سوکت فعال</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">کلمات ممنوعه فعال:</span>
                    <span className="font-bold text-rose-400 font-mono text-sm">{forbiddenWordsList.filter(w=>w.isEnabled).length} کلمه</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">نقش‌های تعریف‌شده:</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">{rolePermissionsList.length} نقش</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* SEARCH & ACTION BAR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => { setUserSearchQuery(e.target.value); setUserCurrentPage(1); }}
                    placeholder="جستجو بر اساس نام، نام کاربری، شماره موبایل یا شناسه کاربر..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="name">مرتب‌سازی: نام</option>
                    <option value="createdAt">مرتب‌سازی: تاریخ عضویت</option>
                    <option value="role">مرتب‌سازی: نقش</option>
                    <option value="messages">مرتب‌سازی: تعداد پیام‌ها</option>
                  </select>

                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>ایجاد کاربر جدید</span>
                  </button>
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3">کاربر</th>
                        <th className="px-4 py-3">شماره موبایل</th>
                        <th className="px-4 py-3">شناسه (User ID)</th>
                        <th className="px-4 py-3">نقش کاربری</th>
                        <th className="px-4 py-3">وضعیت اکانت</th>
                        <th className="px-4 py-3 text-center">آمار فعال</th>
                        <th className="px-4 py-3 text-left">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            کاربری یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">
                              <div className="flex items-center gap-2.5">
                                <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" />
                                <div>
                                  <p className="font-bold text-slate-100">{u.displayName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-300">{u.phone}</td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{u.id}</td>
                            <td className="px-4 py-3">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-300 focus:outline-none"
                              >
                                <option value="super_admin">مدیر ارشد (Super Admin)</option>
                                <option value="owner">مالک (Owner)</option>
                                <option value="admin">مدیر (Admin)</option>
                                <option value="moderator">ناظر (Moderator)</option>
                                <option value="room_admin">مدیر روم (Room Admin)</option>
                                <option value="channel_admin">مدیر کانال (Channel Admin)</option>
                                <option value="trusted_user">کاربر معتبر (Trusted)</option>
                                <option value="user">کاربر عادی (User)</option>
                                <option value="guest">مهمان (Guest)</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleBan(u.id)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                                    u.isBanned
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  }`}
                                >
                                  {u.isBanned ? "مسدودشده (Banned)" : "فعال (Active)"}
                                </button>
                                <button
                                  onClick={() => handleToggleMute(u.id)}
                                  className={`p-1 rounded-md text-[10px] border transition-all ${
                                    u.isMuted
                                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                  }`}
                                  title={u.isMuted ? "سکوت فعالم است" : "بی‌صدا کردن"}
                                >
                                  {u.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-mono text-slate-400">
                                {(u as any).groupsCount || 0} گروه • {(u as any).messagesCount || 0} پیام
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                  title="ویرایش کاربر"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleTerminateSessions(u.id)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                  title="بستن نشست‌ها"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                  title="حذف کاربر"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                <div className="p-3 bg-slate-900 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    نمایش صفحه {userCurrentPage} از {totalUserPages} ({filteredUsers.length} کاربر یافت شد)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={userCurrentPage === 1}
                      onClick={() => setUserCurrentPage((p) => p - 1)}
                      className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      disabled={userCurrentPage === totalUserPages}
                      onClick={() => setUserCurrentPage((p) => p + 1)}
                      className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 & 4: GROUPS & CHANNELS MANAGEMENT */}
          {(activeTab === "groups" || activeTab === "channels") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    placeholder={`جستجو در ${activeTab === "groups" ? "گروه‌ها" : "کانال‌ها"}...`}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setNewRoomForm({ type: activeTab === "groups" ? "group" : "channel", title: "", description: "", avatarUrl: "", username: "", isPrivate: false, ownerId: currentUser?.id || "user-1" });
                    setShowCreateRoomModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>ایجاد {activeTab === "groups" ? "گروه جدید" : "کانال جدید"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeTab === "groups" ? filteredGroups : filteredChannels).map((room) => (
                  <div key={room.id} className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 space-y-3 flex flex-col justify-between hover:border-blue-500/30 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <img src={room.avatarUrl} alt={room.title} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-100 truncate">{room.title}</h4>
                          <p className="text-[10px] text-slate-400 font-mono truncate">@{room.username || room.id}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{room.description || "بدون توضیحات"}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                          {room.members ? room.members.length : (room.memberCount || 0)} عضو
                        </span>
                        {room.isPrivate && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            خصوصی
                          </span>
                        )}
                        {room.isArchived && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                            آرشیو
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setManagingRoomMembers(room)}
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                          title="مدیریت اعضا"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                          title="ویرایش"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => activeTab === "groups" ? handleDeleteGroup(room.id) : handleDeleteChannel(room.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FORBIDDEN WORDS */}
          {activeTab === "forbiddenWords" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={fwSearchQuery}
                      onChange={(e) => setFwSearchQuery(e.target.value)}
                      placeholder="جستجو در لیست کلمات ممنوعه..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={fwCategoryFilter}
                    onChange={(e) => setFwCategoryFilter(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">همه دسته‌ها</option>
                    <option value="political">سیاسی</option>
                    <option value="insult">توهین/ناسزا</option>
                    <option value="ads">تبلیغات</option>
                    <option value="spam">اسپم</option>
                    <option value="custom">سفارشی</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAddWordModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن کلمه ممنوعه</span>
                </button>
              </div>

              <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3">کلمه ممنوعه</th>
                      <th className="px-4 py-3">دسته‌بندی</th>
                      <th className="px-4 py-3">وضعیت فیلتر</th>
                      <th className="px-4 py-3">تاریخ ثبت</th>
                      <th className="px-4 py-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredWords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500">
                          کلمه ممنوعه‌ای یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredWords.map((fw) => (
                        <tr key={fw.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-bold text-rose-300">{fw.word}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                              {fw.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleWordStatus(fw)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                fw.isEnabled
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-slate-800 text-slate-500 border-slate-700"
                              }`}
                            >
                              {fw.isEnabled ? "فعال (مسدودکننده)" : "غیرفعال"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                            {new Date(fw.createdAt).toLocaleDateString("fa-IR")}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <button
                              onClick={() => handleDeleteWord(fw.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PERMISSIONS (RBAC MATRIX) */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">ماتریس سطح دسترسی نقش‌ها (RBAC Matrix)</h3>
                  <p className="text-xs text-slate-400">تنظیم دقیق مجوزهای دسترسی سیستم بر اساس 9 نقش تعریف‌شده (بدون کدنویسی سخت)</p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره تغییرات ماتریس</span>
                </button>
              </div>

              {permSaveSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold text-center">
                  ماتریس دسترسی‌ها با موفقیت در پایگاه‌داده ذخیره شد.
                </div>
              )}

              <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-center text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-300 text-[11px] border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-right">نقش کاربری</th>
                      <th className="px-2 py-3">ایجاد گروه</th>
                      <th className="px-2 py-3">ایجاد کانال</th>
                      <th className="px-2 py-3">حذف گروه</th>
                      <th className="px-2 py-3">حذف کانال</th>
                      <th className="px-2 py-3">افزودن عضو</th>
                      <th className="px-2 py-3">اخراج عضو</th>
                      <th className="px-2 py-3">ارسال پیام</th>
                      <th className="px-2 py-3">آپلود فایل</th>
                      <th className="px-2 py-3">پنل مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rolePermissionsList.map((rp, idx) => (
                      <tr key={rp.role} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-right text-slate-100">{rp.roleNameFa}</td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.createGroup} onChange={() => handleTogglePermission(idx, "createGroup")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.createChannel} onChange={() => handleTogglePermission(idx, "createChannel")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.deleteGroup} onChange={() => handleTogglePermission(idx, "deleteGroup")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.deleteChannel} onChange={() => handleTogglePermission(idx, "deleteChannel")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.addMember} onChange={() => handleTogglePermission(idx, "addMember")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.removeMember} onChange={() => handleTogglePermission(idx, "removeMember")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.sendMessage} onChange={() => handleTogglePermission(idx, "sendMessage")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.uploadFiles} onChange={() => handleTogglePermission(idx, "uploadFiles")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <input type="checkbox" checked={rp.permissions.accessAdminPanel} onChange={() => handleTogglePermission(idx, "accessAdminPanel")} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: MESSAGES & MESSAGE ID */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="bg-[#1A1D2B] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    placeholder="جستجو بر اساس متن پیام یا شناسه اختصاصی Message ID (UUID v4)..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#1A1D2B] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 text-[11px] uppercase border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3">شناسه پیام (Message ID - UUID v4)</th>
                      <th className="px-4 py-3">محتوای پیام</th>
                      <th className="px-4 py-3">شناسه فرستنده</th>
                      <th className="px-4 py-3">تاریخ ثبت</th>
                      <th className="px-4 py-3 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {filteredActiveMessages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500 font-sans">
                          پیامی یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredActiveMessages.map((m) => (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-blue-400 font-bold">
                            <div className="flex items-center gap-2">
                              <span>{m.id}</span>
                              <button
                                onClick={() => handleCopyId(m.id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="کپی شناسه"
                              >
                                {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-sans max-w-xs truncate text-slate-100">{m.content || "[فایل ضمیمه]"}</td>
                          <td className="px-4 py-3 text-slate-400">{m.senderId}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(m.createdAt).toLocaleTimeString("fa-IR")}</td>
                          <td className="px-4 py-3 text-left">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingMsgModal(m);
                                  setNewMsgIdValue(m.id);
                                  setNewMsgContentValue(m.content);
                                }}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-sans text-xs cursor-pointer"
                              >
                                ویرایش شناسه
                              </button>
                              <button
                                onClick={() => handleDeleteMessageAdmin(m.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-sans text-xs flex items-center gap-1 cursor-pointer"
                                title="حذف پیام از سیستم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: FILES MANAGEMENT */}
          {activeTab === "files" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
                <span>تعداد کل فایل‌های آپلودشده: <strong className="text-blue-400 font-mono">{filesData.totalCount}</strong></span>
                <span>حجم کل: <strong className="text-emerald-400 font-mono">{filesData.totalSizeMB} MB</strong></span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filesData.files.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-cyan-400" />
                      <div>
                        <p className="font-bold text-slate-200">{f.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {((f.size || 0) / 1024).toFixed(1)} KB • {f.mimeType}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SMS SETTINGS */}
          {activeTab === "smsSettings" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">پیکربندی پنل پیامک (SMS Provider Settings)</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">تنظیمات درگاه ارسال پیامک جهت اعتبارسنجی OTP و نوتیفیکیشن‌ها</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold">
                    SMS API Ready
                  </span>
                </div>

                {/* Notifications & Result Banners */}
                {smsTestResult && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                    smsTestResult.success 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    {smsTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{smsTestResult.success ? "نتیجه تست ارتباط:" : "خطا در برقراری ارتباط:"}</p>
                      <p className="leading-relaxed opacity-90">{smsTestResult.message}</p>
                    </div>
                  </div>
                )}

                {smsSaveResult && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                    smsSaveResult.success
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{smsSaveResult.message}</span>
                  </div>
                )}

                <form className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        سامانه پیامک (SMS Provider) <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={smsConfig.provider}
                        onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value })}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      >
                        <option value="smsir">SMS.ir (سامانه پیامکی رسمی SMS.ir - REST API v1)</option>
                        <option value="kavenegar">کاوه نگار (Kavenegar)</option>
                        <option value="ghasedak">قاصدک (Ghasedak)</option>
                        <option value="farazsms">فراز اس‌ام‌اس (FarazSMS / IPPanel)</option>
                        <option value="melipayamak">ملی پیامک (MeliPayamak)</option>
                        <option value="custom">درگاه اختصاصی (Custom Webhook API)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        کلید API (API Key) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={smsConfig.apiKey}
                        onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                        placeholder="مشخصات API Key..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        کلید محرمانه (Secret Key)
                      </label>
                      <input
                        type="password"
                        value={smsConfig.secretKey}
                        onChange={(e) => setSmsConfig({ ...smsConfig, secretKey: e.target.value })}
                        placeholder="Secret Key (در صورت نیاز)..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        شماره فرستنده / خط (Sender / Line Number) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={smsConfig.senderNumber}
                        onChange={(e) => setSmsConfig({ ...smsConfig, senderNumber: e.target.value })}
                        placeholder="مثال: 30000000"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        شناسه قالب الگوی OTP / سریع (Template ID)
                      </label>
                      <input
                        type="text"
                        value={smsConfig.templateId}
                        onChange={(e) => setSmsConfig({ ...smsConfig, templateId: e.target.value })}
                        placeholder="شناسه پترن / الگوی OTP..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        مهلت زمان‌پاسخ دهی (Timeout ثانیه)
                      </label>
                      <input
                        type="number"
                        value={smsConfig.timeout}
                        onChange={(e) => setSmsConfig({ ...smsConfig, timeout: parseInt(e.target.value) || 10 })}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        نام کاربری سامانه (Username)
                      </label>
                      <input
                        type="text"
                        value={smsConfig.username}
                        onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
                        placeholder="نام کاربری ورودی پنل..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        رمز عبور (Password)
                      </label>
                      <input
                        type="password"
                        value={smsConfig.password}
                        onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSmsConfig({ ...smsConfig, isActive: !smsConfig.isActive })}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${smsConfig.isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {smsConfig.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                      <span className="text-slate-200 font-bold">سرویس ارسال پیامک فعال باشد</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleResetSmsSettings}
                      className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>بازنشانی به پیش‌فرض</span>
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowSendSmsModal(true)}
                        className="px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>ارسال پیامک تست</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestSmsConnection}
                        disabled={smsTesting}
                        className="px-4 py-2.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {smsTesting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>در حال تست...</span>
                          </>
                        ) : (
                          <>
                            <Radio className="w-4 h-4" />
                            <span>بررسی اتصال</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveSmsSettings}
                        disabled={smsSaving}
                        className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {smsSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>در حال ذخیره...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>ذخیره تنظیمات</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: PUSH NOTIFICATION SETTINGS */}
          {activeTab === "pushNotification" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">پیکربندی اعلان‌های Push (Web Push Settings)</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">زیرساخت VAPID Keys و سرویس‌ورکر جهت ارسال اعلان‌های Push مرورگری</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold">
                      {pushConfig.subscriptionCount} اشتراک فعال
                    </span>
                  </div>
                </div>

                {/* Status Banners */}
                {pushSaveResult && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                    pushSaveResult.success
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{pushSaveResult.message}</span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">ثبت دستگاه مرورگر شما در سرویس Push:</span>
                    <button
                      onClick={handleSubscribeCurrentBrowser}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                    >
                      فعال‌سازی Push روی این مرورگر
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    با کلیک روی این دکمه، مرورگر شما مجوز Push را دریافت کرده و یک Subscription واقعی برای تست ارسال اعلان ایجاد می‌کند.
                  </p>
                </div>

                <form onSubmit={handleSavePushSettings} className="space-y-5">
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-300 font-semibold">
                          کلید عمومی (VAPID Public Key) <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateVapidKeys}
                          className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>تولید کلیدهای جدید VAPID</span>
                        </button>
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={pushConfig.vapidPublicKey}
                        onChange={(e) => setPushConfig({ ...pushConfig, vapidPublicKey: e.target.value })}
                        placeholder="Public Key..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-[11px] focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-300 font-semibold">
                          کلید خصوصی (VAPID Private Key) <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowVapidSecret(!showVapidSecret)}
                          className="text-slate-400 hover:text-slate-200 text-[11px]"
                        >
                          {showVapidSecret ? "مخفی کردن" : "نمایش کلید"}
                        </button>
                      </div>
                      <input
                        type={showVapidSecret ? "text" : "password"}
                        required
                        value={pushConfig.vapidPrivateKey}
                        onChange={(e) => setPushConfig({ ...pushConfig, vapidPrivateKey: e.target.value })}
                        placeholder="Private Key..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setPushConfig({ ...pushConfig, isActive: !pushConfig.isActive })}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${pushConfig.isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {pushConfig.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                      <span className="text-slate-200 font-bold">سرویس ارسال Push فعال باشد</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowTestPushModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>ارسال Push واقعی به کاربران / تست</span>
                    </button>

                    <button
                      type="submit"
                      disabled={pushSaving}
                      className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {pushSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>در حال ذخیره...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ذخیره تنظیمات Push</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Subscriptions Table */}
              <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-4">
                <h4 className="font-bold text-xs text-slate-200 flex items-center justify-between">
                  <span>لیست مرورگرهای مشترک شده ({pushSubs.length} دستگاه)</span>
                  <button onClick={fetchPushSettings} className="p-1 text-slate-400 hover:text-white">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </h4>

                {pushSubs.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">هیچ اشتراک درگاه Push فعالی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                    {pushSubs.map((sub, i) => (
                      <div key={sub.id || i} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-purple-300 font-mono block">شناسه: {sub.id}</span>
                          <span className="text-[10px] text-slate-400">کاربر: {sub.userId} | زمان ثبت: {new Date(sub.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                        <button
                          onClick={() => {
                            setTestPushForm(prev => ({ ...prev, targetUser: sub.id }));
                            setShowTestPushModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-[11px] font-bold cursor-pointer"
                        >
                          تست ارسال به این دستگاه
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: SYSTEM TOGGLES */}
          {activeTab === "toggles" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">تنظیمات کلیدی پلتفرم</h3>
                  <p className="text-xs text-slate-400">غیرفعال‌سازی یا فعال‌سازی آنی فیچرهای اصلی</p>
                </div>
                <button
                  onClick={handleSaveToggles}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  ذخیره تنظیمات
                </button>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold text-center">
                  تنظیمات با موفقیت ذخیره شد.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "registrationEnabled", label: "عضویت کاربران جدید" },
                  { key: "loginEnabled", label: "ورود کاربران" },
                  { key: "groupsEnabled", label: "قابلیت ساخت گروه" },
                  { key: "channelsEnabled", label: "قابلیت ساخت کانال" },
                  { key: "allowFileUpload", label: "آپلود فایل" },
                  { key: "allowImages", label: "ارسال تصویر" },
                  { key: "allowAudio", label: "ارسال صوت & وویس" },
                  { key: "editMessageEnabled", label: "ویرایش پیام" },
                  { key: "deleteMessageEnabled", label: "حذف پیام" },
                ].map((item) => {
                  const val = (localSettings as any)[item.key];
                  return (
                    <div key={item.key} className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{item.label}</span>
                      <button
                        onClick={() => toggleFeature(item.key as any)}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${val ? 'text-emerald-400' : 'text-slate-600'}`}
                      >
                        {val ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 10: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>تعداد اشتراک‌های فعال Push Notification:</span>
                </span>
                <span className="font-bold text-amber-400 font-mono">{pushSubs.length} دستگاه</span>
              </div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-cyan-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString("fa-IR")}</span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DATABASE SETTINGS */}
          {activeTab === "database" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">پیکربندی دیتابیس MySQL (Database Settings)</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">مشخصات اتصال به پایگاه داده MySQL جهت ذخیره‌سازی پیام‌ها و فایل‌ها</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
                    MySQL Ready
                  </span>
                </div>

                {/* Notifications & Result Banners */}
                {dbTestResult && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                    dbTestResult.success 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    {dbTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{dbTestResult.success ? "نتیجه تست اتصال:" : "خطا در برقراری ارتباط:"}</p>
                      <p className="leading-relaxed opacity-90">{dbTestResult.message}</p>
                    </div>
                  </div>
                )}

                {dbSaveResult && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                    dbSaveResult.success
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{dbSaveResult.message}</span>
                  </div>
                )}

                <form className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        آدرس سرور دیتابیس (Host / IP) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={dbConfig.host}
                        onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                        placeholder="localhost یا 127.0.0.1"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        پورت اتصال (Port) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={dbConfig.port}
                        onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value, 10) || 3306 })}
                        placeholder="3306"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        نام پایگاه داده (Database Name) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={dbConfig.database}
                        onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                        placeholder="chat_db"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        نام کاربری (Username) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={dbConfig.username}
                        onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                        placeholder="root"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        رمز عبور (Password)
                      </label>
                      <input
                        type="password"
                        value={dbConfig.password}
                        onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        مجموعه کاراکتر (Charset)
                      </label>
                      <input
                        type="text"
                        value={dbConfig.charset}
                        onChange={(e) => setDbConfig({ ...dbConfig, charset: e.target.value })}
                        placeholder="utf8mb4"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        منطقه زمانی (Timezone)
                      </label>
                      <input
                        type="text"
                        value={dbConfig.timezone}
                        onChange={(e) => setDbConfig({ ...dbConfig, timezone: e.target.value })}
                        placeholder="+03:30"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1.5">
                        حالت SSL (SSL Mode)
                      </label>
                      <select
                        value={dbConfig.sslMode}
                        onChange={(e) => setDbConfig({ ...dbConfig, sslMode: e.target.value as any })}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      >
                        <option value="disabled">غیرفعال (Disabled)</option>
                        <option value="preferred">ترجیحی (Preferred)</option>
                        <option value="required">الزامی (Required)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleTestDbConnection}
                      disabled={dbTesting}
                      className="px-5 py-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {dbTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>در حال اتصال...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          <span>تست اتصال به دیتابیس</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDbSettings}
                      disabled={dbSaving}
                      className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {dbSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>در حال ذخیره‌سازی...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ذخیره تنظیمات</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Documentation Helper Box */}
              <div className="p-5 rounded-3xl bg-[#1A1D2B]/60 border border-white/5 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Server className="w-4 h-4" />
                  <span>راهنمای راه‌اندازی و انتقال داده‌ها (DATABASE_SETUP.md)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  فایل مستندات کاملی به نام <code className="text-amber-300 font-mono">DATABASE_SETUP.md</code> در ریشه پروژه قرار گرفته است که شامل کوئری‌های SQL لازم برای ساخت جداول، ایندکس‌ها، فورن‌کی‌ها، اسکریپت Migration و نحوه تنظیم متغیرهای محیطی در سرور تولید می‌باشد.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ایجاد کاربر جدید</h3>
              <button type="button" onClick={() => setShowCreateUserModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" required value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} placeholder="شماره موبایل (مثلا 09121111111)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" required value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} placeholder="نام کاربری (مثلا user_1)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" value={newUserForm.displayName} onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })} placeholder="نام نمایشی" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white">
                <option value="user">کاربر عادی (User)</option>
                <option value="trusted_user">کاربر معتبر (Trusted User)</option>
                <option value="admin">مدیر (Admin)</option>
                <option value="super_admin">مدیر ارشد (Super Admin)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">ثبت کاربر</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveUserEdit} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ویرایش کاربر: {editingUser.displayName}</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">نام نمایشی:</label>
                <input type="text" value={editingUser.displayName} onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">شماره موبایل:</label>
                <input type="text" value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">بیوگرافی:</label>
                <textarea value={editingUser.bio || ""} onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">ذخیره ویرایش</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD FORBIDDEN WORD */}
      {showAddWordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddWord} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">افزودن کلمه ممنوعه جدید</h3>
              <button type="button" onClick={() => setShowAddWordModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" required value={newWordText} onChange={(e) => setNewWordText(e.target.value)} placeholder="عبارت یا کلمه ممنوعه..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <select value={newWordCategory} onChange={(e) => setNewWordCategory(e.target.value as WordCategory)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white">
                <option value="custom">سفارشی (Custom)</option>
                <option value="political">سیاسی (Political)</option>
                <option value="insult">توهین/ناسزا (Insult)</option>
                <option value="ads">تبلیغات (Ads)</option>
                <option value="spam">اسپم (Spam)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddWordModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">افزودن به لیست</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT MESSAGE ID */}
      {editingMsgModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveMsgId} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ویرایش شناسه اختصاصی پیام (Message ID)</h3>
              <button type="button" onClick={() => setEditingMsgModal(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">شناسه یکتا (Message ID - UUID v4):</label>
                <input type="text" required value={newMsgIdValue} onChange={(e) => setNewMsgIdValue(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 font-mono text-blue-400" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">متن پیام:</label>
                <textarea value={newMsgContentValue} onChange={(e) => setNewMsgContentValue(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingMsgModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">بروزرسانی شناسه</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANAGE ROOM MEMBERS */}
      {managingRoomMembers && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">مدیریت اعضای {managingRoomMembers.title}</h3>
              <button onClick={() => setManagingRoomMembers(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white">
                  <option value="">انتخاب کاربر جهت افزودن...</option>
                  {usersList.filter((u) => !managingRoomMembers.members.some((m) => m.userId === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} (@{u.username})</option>
                  ))}
                </select>
                <button onClick={handleAddMemberToRoom} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0">افزودن</button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                {managingRoomMembers.members.map((m) => {
                  const u = usersList.find((usr) => usr.id === m.userId);
                  const isOwner = managingRoomMembers.ownerId === m.userId;
                  return (
                    <div key={m.userId} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={u?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-slate-200">{u?.displayName || m.userId}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{isOwner ? "مالک روم (Owner)" : m.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isOwner && (
                          <>
                            <button onClick={() => handleTransferOwnership(m.userId)} className="p-1.5 rounded bg-amber-500/10 text-amber-400 text-[10px]" title="انتقال مالکیت">
                              انتقال مالکیت
                            </button>
                            <button onClick={() => handleRemoveMemberFromRoom(m.userId)} className="p-1.5 rounded bg-rose-500/10 text-rose-400 text-[10px]">
                              اخراج
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ROOM */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateRoom} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ساخت {newRoomForm.type === "group" ? "گروه" : "کانال"} جدید</h3>
              <button type="button" onClick={() => setShowCreateRoomModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <input type="text" required value={newRoomForm.title} onChange={(e) => setNewRoomForm({ ...newRoomForm, title: e.target.value })} placeholder="عنوان یا نام..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <input type="text" value={newRoomForm.username} onChange={(e) => setNewRoomForm({ ...newRoomForm, username: e.target.value })} placeholder="نام کاربری عمومی (مثلا my_group)" className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              <textarea value={newRoomForm.description} onChange={(e) => setNewRoomForm({ ...newRoomForm, description: e.target.value })} placeholder="توضیحات..." className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateRoomModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">ایجاد</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT ROOM */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveRoomEdit} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">ویرایش {editingRoom.title}</h3>
              <button type="button" onClick={() => setEditingRoom(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">عنوان:</label>
                <input type="text" value={editingRoom.title} onChange={(e) => setEditingRoom({ ...editingRoom, title: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">توضیحات:</label>
                <textarea value={editingRoom.description || ""} onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingRoom.isPrivate} onChange={(e) => setEditingRoom({ ...editingRoom, isPrivate: e.target.checked })} className="accent-blue-500" />
                  <span>خصوصی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingRoom.isArchived || false} onChange={(e) => setEditingRoom({ ...editingRoom, isArchived: e.target.checked })} className="accent-blue-500" />
                  <span>آرشیو شده</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">ذخیره تغییرات</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SEND TEST SMS */}
      {showSendSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendTestSms} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>ارسال پیامک تست ({smsConfig.provider})</span>
              </h3>
              <button type="button" onClick={() => setShowSendSmsModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {testSmsResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testSmsResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}>
                {testSmsResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{testSmsResult.message}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">شماره گیرنده (Mobile Number):</label>
                <input
                  type="text"
                  required
                  value={testSmsMobile}
                  onChange={(e) => setTestSmsMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">متن پیامک (Message Text):</label>
                <textarea
                  rows={3}
                  required
                  value={testSmsMessage}
                  onChange={(e) => setTestSmsMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSendSmsModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" disabled={testSmsSending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {testSmsSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                <span>ارسال پیامک</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SEND TEST PUSH */}
      {showTestPushModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendTestPush} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>ارسال اعلان Push واقعی به مرورگر</span>
              </h3>
              <button type="button" onClick={() => setShowTestPushModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {testPushResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testPushResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}>
                {testPushResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{testPushResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">عنوان اعلان (Title):</label>
                <input
                  type="text"
                  required
                  value={testPushForm.title}
                  onChange={(e) => setTestPushForm({ ...testPushForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">متن پیام (Body):</label>
                <textarea
                  rows={2}
                  required
                  value={testPushForm.message}
                  onChange={(e) => setTestPushForm({ ...testPushForm, message: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">گیرنده (Target):</label>
                <select
                  value={testPushForm.targetUser}
                  onChange={(e) => setTestPushForm({ ...testPushForm, targetUser: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                >
                  <option value="all">همه کاربران و مرورگرها (Broadcast)</option>
                  {pushSubs.map(s => (
                    <option key={s.id} value={s.id}>دستگاه: {s.id} (کاربر: {s.userId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">آدرس آیکون (Icon URL):</label>
                <input
                  type="text"
                  value={testPushForm.iconUrl}
                  onChange={(e) => setTestPushForm({ ...testPushForm, iconUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-[11px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">لینک هدایت پس از کلیک (Target Link):</label>
                <input
                  type="text"
                  value={testPushForm.link}
                  onChange={(e) => setTestPushForm({ ...testPushForm, link: e.target.value })}
                  placeholder="/"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowTestPushModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" disabled={testPushSending} className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {testPushSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>ارسال Push به مرورگر</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteState.isOpen}
        onClose={() => setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteState.onConfirm}
        title={confirmDeleteState.title}
        description={confirmDeleteState.description}
      />

    </div>
  );
};
