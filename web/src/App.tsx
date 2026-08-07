import React from "react";
import { ChatProvider, useChat } from "./store/chatContext";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPane } from "./components/chat/ChatPane";
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
  const { isAppInitializing, currentUser, forwardingMessage, setForwardingMessage } = useChat();

  React.useEffect(() => {
    if (!isAppInitializing && !currentUser) {
      if (window.location.pathname !== "/login") {
        sessionStorage.setItem("redirect_after_login", window.location.pathname + window.location.search);
        try {
          window.history.replaceState({}, "", "/login");
        } catch (e) {}
      }
    }
  }, [isAppInitializing, currentUser]);

  if (isAppInitializing) {
    return <SplashLoader isLoading={true} />;
  }

  // Prevent unauthenticated access: render ONLY Login when not logged in
  if (!currentUser) {
    return (
      <div dir="rtl" className="h-screen w-screen bg-[#0F111A] text-slate-100 flex items-center justify-center font-sans overflow-hidden select-none">
        <AuthModal />
      </div>
    );
  }

  return (
    <div dir="rtl" className="h-screen w-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col font-sans overflow-x-hidden overflow-y-hidden select-none transition-colors duration-200">
      <SplashLoader isLoading={false} />

      {/* Navigation Header */}
      <ErrorBoundary fallbackTitle="خطا در هدر اصلی">
        <Header />
      </ErrorBoundary>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <ErrorBoundary fallbackTitle="خطا در منوی گفتگوها">
          <Sidebar />
        </ErrorBoundary>

        {/* Active Chat Pane */}
        <ErrorBoundary fallbackTitle="خطا در صفحه چت">
          <ChatPane />
        </ErrorBoundary>

        {/* Group / Channel Info Drawer */}
        <ErrorBoundary fallbackTitle="خطا در پنل اطلاعات گروه">
          <GroupInfoDrawer />
        </ErrorBoundary>
      </div>

      {/* Global Modals & Overlay Windows */}
      <ErrorBoundary fallbackTitle="خطا در پنجره جدید">
        <NewChatModal />
        <AuthModal />
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
