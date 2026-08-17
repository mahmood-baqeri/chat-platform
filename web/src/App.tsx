// web/src/App.tsx

import React, { useEffect } from "react";
import { ChatProvider, useChat } from "./store/chatContext";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPane } from "./components/chat/ChatPage";
import { GroupInfoDrawer } from "./components/chat/GroupInfoDrawer";
import { NewChatModal } from "./components/modals/NewChatModal";
import { AuthModal } from "./components/modals/AuthModal";
import { ProfileSettingsModal } from "./components/modals/ProfileSettingsModal";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { MediaViewerModal } from "./components/media/MediaViewerModal";
import { PinnedMessagesModal } from "./components/modals/PinnedMessagesModal";
import { SearchModal } from "./components/chat/SearchModal";
import { ForwardModal } from "./components/modals/ForwardModal";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { SplashLoader } from "./components/common/SplashLoader";

function AppContent() {
  const {
    isAppInitializing,
    currentUser,
    isAuthReady,
    forwardingMessage,
    setForwardingMessage,
    selectChat, // ✅ اضافه کنید
  } = useChat();

  // ✅ گوش دادن به رویداد باز کردن چت از Service Worker
  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { chatId } = customEvent.detail || {};

      if (chatId && currentUser) {
        console.log('📨 Opening chat from notification:', chatId);
        selectChat(chatId);
      }
    };

    // اضافه کردن listener برای رویداد custom
    window.addEventListener('sw-open-chat', handleOpenChat);

    return () => {
      window.removeEventListener('sw-open-chat', handleOpenChat);
    };
  }, [currentUser, selectChat]);

  // ✅ مدیریت بک مرورگر برای کاربر لاگین شده
  useEffect(() => {
    if (!currentUser || isAppInitializing || !isAuthReady) return;

    const handlePopState = (e: PopStateEvent) => {
      if (window.location.pathname === "/login") {
        e.preventDefault();
        window.history.pushState(null, "", "/");
        window.history.pushState(null, "", "/");
      }
    };

    const preventBack = () => {
      if (window.location.pathname === "/login") {
        window.history.pushState(null, "", "/");
      }
    };

    window.history.pushState(null, "", window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("popstate", preventBack);
    };
  }, [currentUser, isAppInitializing, isAuthReady]);

  // ✅ ریدایرکت از /login به / وقتی کاربر لاگین هست
  useEffect(() => {
    if (currentUser && !isAppInitializing && isAuthReady) {
      if (window.location.pathname === "/login") {
        window.history.replaceState(null, "", "/");
      }
    }
  }, [currentUser, isAppInitializing, isAuthReady]);

  // اگر هنوز initialization کامل نشده یا auth آماده نیست، لودر نشون بده
  if (isAppInitializing || !isAuthReady) {
    return <SplashLoader isLoading={true} />;
  }

  // اگر کاربر لاگین نیست، AuthModal رو نشون بده
  if (!currentUser) {
    return (
      <div dir="rtl" className="h-screen w-screen bg-[var(--main-color-bg)] text-[var(--text-primary)] flex items-center justify-center font-sans overflow-hidden select-none">
        <AuthModal />
      </div>
    );
  }

  // کاربر لاگین هست - صفحه کامل رو نشون بده
  return (
    <div dir="rtl" className="h-screen w-screen bg-[var(--main-color-bg)] text-[var(--text-primary)] flex flex-col font-sans overflow-x-hidden overflow-y-hidden select-none transition-colors duration-200">
      <SplashLoader isLoading={false} />

      <ErrorBoundary fallbackTitle="خطا در هدر اصلی">
        <Header />
      </ErrorBoundary>

      <div className="flex-1 flex overflow-hidden relative">
        <ErrorBoundary fallbackTitle="خطا در منوی گفتگوها">
          <Sidebar />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="خطا در صفحه چت">
          <ChatPane />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="خطا در پنل اطلاعات گروه">
          <GroupInfoDrawer />
        </ErrorBoundary>
      </div>

      <ErrorBoundary fallbackTitle="خطا در پنجره جدید">
        <NewChatModal />
        <ProfileSettingsModal />
        <AdminDashboard />
        <MediaViewerModal />
        <PinnedMessagesModal />
        <SearchModal />
        <ForwardModal isOpen={!!forwardingMessage} message={forwardingMessage} onClose={() => setForwardingMessage(null)} />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}