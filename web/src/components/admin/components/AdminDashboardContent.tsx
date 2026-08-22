import {
  OverviewTab,
  UsersTab,
  RoomsTab,
  ForbiddenWordsTab,
  PermissionsTab,
  MessagesTab,
  FilesTab,
  SmsSettingsTab,
  PushNotificationTab,
  SystemTogglesTab,
  LogsTab,
  DatabaseSettingsTab
} from "./tabs";
export const AdminDashboardContent=()=> <>
    <OverviewTab />
    <UsersTab />
    <RoomsTab />
    <ForbiddenWordsTab />
    <PermissionsTab />
    <MessagesTab />
    <FilesTab />
    <SmsSettingsTab />
    <PushNotificationTab />
    <SystemTogglesTab />
    <LogsTab />
    <DatabaseSettingsTab />
  </>;

