/**
 * Core Data Models & System Types for Chat Platform
 */

export type UserRole = 'super_admin' | 'owner' | 'admin' | 'moderator' | 'room_admin' | 'channel_admin' | 'trusted_user' | 'user' | 'guest';
export type UserStatus = 'online' | 'offline' | 'away';
export type ChatType = 'direct' | 'group' | 'channel';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'gif' | 'system';
export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'seen';
export type WordCategory = 'political' | 'insult' | 'ads' | 'spam' | 'custom';

export interface ForbiddenWord {
  id: number | string;
  word: string;
  category: WordCategory;
  isEnabled: boolean;
  createdAt: string;
}

export interface RolePermission {
  role: UserRole;
  roleNameFa: string;
  permissions: {
    createGroup: boolean;
    createChannel: boolean;
    deleteGroup: boolean;
    deleteChannel: boolean;
    addMember: boolean;
    removeMember: boolean;
    editGroupSettings: boolean;
    sendMessage: boolean;
    uploadFiles: boolean;
    accessAdminPanel: boolean;
  };
}

export interface User {
  id: number | string;
  phone: string;
  nationalCode: string;
  personCode?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  status: UserStatus;
  lastSeen: string;
  role: UserRole;
  isBanned: boolean;
  isMuted: boolean;
  createdAt: string;
}

export interface UserSession {
  id: number | string;
  userId: number | string;
  deviceName: string;
  ipAddress: string;
  browser: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface SystemSettings {
  registrationEnabled: boolean;
  loginEnabled: boolean;
  otpEnabled: boolean;
  sessionTimeoutMinutes: number;
  channelsEnabled: boolean;
  groupsEnabled: boolean;
  callsEnabled: boolean;
  editMessageEnabled: boolean;
  deleteMessageEnabled: boolean;
  replyEnabled: boolean;
  forwardEnabled: boolean;
  mentionEnabled: boolean;
  pinEnabled: boolean;
  allowFileUpload: boolean;
  allowImages: boolean;
  allowVideos: boolean;
  allowAudio: boolean;
  allowDocuments: boolean;
  allowStickers: boolean;
  allowEmojis: boolean;
  onlineStatusEnabled: boolean;
  lastSeenEnabled: boolean;
  typingIndicatorEnabled: boolean;
  readReceiptEnabled: boolean;
  notificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  darkModeDefault: boolean;
  loggingEnabled: boolean;
  maxFileSizeMB: number;
  maxGroupMembers: number;
  maxChannelsPerUser: number;
  allowedFileExtensions: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: (number | string)[]; // User IDs
}

export interface Attachment {
  id: string;
  name: string;
  type: MessageType;
  url: string;
  size: number;
  mimeType: string;
  duration?: number; // for audio/video in seconds
  thumbnailUrl?: string;
  chatId?: string;
  senderId?: number | string;
  createdAt?: string;
}

export interface EditHistoryItem {
  content: string;
  editedAt: string;
}

export interface MessageSeenInfo {
  userId: number | string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  seenAt: string;
}

export interface Message {
  id: number | string;
  chatId: string;
  senderId: number | string;
  senderName?: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  status: DeliveryStatus;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  editHistory?: EditHistoryItem[];
  isPinned?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: number | string;
  replyToMessageId?: number | string;
  replyToMessage?: {
    id: number | string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  forwardedFrom?: {
    id: number | string;
    name: string;
    chatType: ChatType;
  };
  reactions: MessageReaction[];
  mentions?: string[]; // user IDs or usernames
  scheduledFor?: string;
  isScheduled?: boolean;
  seenBy?: MessageSeenInfo[];
}

export interface ChatMember {
  userId: number | string;
  role: UserRole;
  joinedAt: string;
  isMuted: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  description?: string;
  avatarUrl?: string;
  username?: string; // For public groups / channels
  isPrivate?: boolean;
  ownerId?: number | string;
  members: ChatMember[];
  memberCount: number;
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  inviteLink?: string;
  createdAt: string;
  draftText?: string;
}

export interface SystemAuditLog {
  id: number | string;
  actorName: string;
  action: string;
  details: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

export interface WebSocketEvent {
  event: string;
  data: any;
}


export const BaseDomain = "";
export const AvatarPhoto = "/uploads/000_avatar.png?w=150";
export const FaviconPhoto = "/uploads/000_favicon.png";
export const LogoPhoto = "/uploads/000_logo.png";
export const NonePhoto = "/uploads/000_none.png?w=150";