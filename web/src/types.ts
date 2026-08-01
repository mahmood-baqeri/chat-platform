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
  id: string;
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
  id: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  status: UserStatus;
  lastSeen: string;
  role: UserRole;
  isBanned: boolean;
  isMuted: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
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
  users: string[]; // User IDs
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
  senderId?: string;
  createdAt?: string;
}

export interface EditHistoryItem {
  content: string;
  editedAt: string;
}

export interface MessageSeenInfo {
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  seenAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
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
  deletedBy?: string;
  replyToMessageId?: string;
  replyToMessage?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  forwardedFrom?: {
    id: string;
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
  userId: string;
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
  ownerId?: string;
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
  id: string;
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
