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
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { SplashLoader } from "./components/common/SplashLoader";

function AppContent() {
  const { isAppInitializing } = useChat();

  return (
    <div dir="rtl" className="h-screen w-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col font-sans overflow-x-hidden overflow-y-hidden select-none transition-colors duration-200">
      {/* Splash Loading Overlay */}
      <SplashLoader isLoading={isAppInitializing} />

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
