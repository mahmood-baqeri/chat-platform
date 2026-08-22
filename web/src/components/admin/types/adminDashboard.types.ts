import type { User } from "../../../types";
export type ActiveTab = "overview"|"toggles"|"users"|"groups"|"channels"|"forbiddenWords"|"permissions"|"messages"|"files"|"logs"|"database"|"smsSettings"|"pushNotification";
export type DatabaseSslMode = "disabled"|"required"|"preferred"|"verify-ca";
export type PushPolicy = "always"|"offline_only"|"mentions_only"|"direct_only"|"disabled";
export interface AdminStats { totalUsers:number; onlineCount:number; activeChats:number; groupsCount:number; channelsCount:number; totalMessages:number; deletedMessagesCount:number; totalStorageMB:number|string; totalFiles:number; wsConnectedCount:number; }
export interface AdminUser extends User { groupsCount?:number; messagesCount?:number; }
export interface PushSubscriptionAdmin { id:string; userId:string|number; createdAt:string; endpoint?:string; [key:string]:unknown; }
