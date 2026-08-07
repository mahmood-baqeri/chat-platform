export * from "../../src/types.js";

export interface ContactRecord {
  id: string;
  userId: string;
  contactUserId: string;
  customName?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: number | string;
  actorName: string;
  action: string;
  details: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

export interface PushSubItem {
  id: number | string;
  userId: number | string;
  subscription: any;
  createdAt: string;
}

export type PushSubscriptionItem = PushSubItem;

export interface PushConfig {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  fcmApiKey?: string;
  isActive?: boolean;
}

export interface MessageSeenRecord {
  messageId: number | string;
  userId: number | string;
  seen_at?: string;
  seenAt?: string;
}

