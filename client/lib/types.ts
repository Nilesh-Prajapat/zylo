export type UserRole = 'NORMAL_USER' | 'CREATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
export type ReportTargetType = 'USER' | 'STREAM' | 'CHAT_MESSAGE';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  streamCount?: number;
}

export interface Wallet {
  purchasedCoins: number;
  creatorEarnings: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
    bio?: string | null;
    coverImageUrl?: string | null;
    location?: string | null;
    website?: string | null;
  };
  wallet?: Wallet;
  _count?: {
    followers?: number;
    following?: number;
    streams?: number;
  };
}

export interface Stream {
  id: string;
  publicId?: string;
  broadcasterId: string;
  broadcaster: UserProfile;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: StreamStatus;
  viewerCount: number;
  peakViewerCount?: number;
  replayViews?: number;
  duration?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  publicationStatus?: 'PUBLISHED' | 'HIDDEN' | string;
  vibe?: string | null;
  mediaPath?: string | null;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' | string;
  allowReplay?: boolean;
  replayUrl?: string | null;
  recordingStatus?: 'NOT_STARTED' | 'RECORDING' | 'PROCESSING' | 'READY' | 'FAILED' | string;
  recordingStorageKey?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  message: string;
  streamOffsetSeconds?: number | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface GiftTransaction {
  id: string;
  senderId: string;
  recipientId: string;
  giftId: string;
  streamId: string;
  quantity: number;
  totalPrice: number;
  createdAt: string;
  sender?: UserProfile;
  recipient?: UserProfile;
  gift?: Gift;
}

export type WalletTransactionType =
  | 'TOP_UP'
  | 'GIFT_SENT'
  | 'GIFT_RECEIVED'
  | 'REDEMPTION'
  | 'REFUND'
  | 'ADJUSTMENT';

export type WalletBalanceType = 'PERSONAL_COINS' | 'CREATOR_EARNINGS';
export type TransactionDirection = 'CREDIT' | 'DEBIT';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  balanceType: WalletBalanceType;
  direction: TransactionDirection;
  amount: number;
  currency?: string | null;
  amountUsd?: number | null;
  referenceId?: string | null;
  description?: string | null;
  status: string;
  createdAt: string;
  metadata?: any;
}

export interface CouponRedemption {
  id: string;
  userId: string;
  couponCode: string;
  couponTitle: string;
  earningsDeducted: number;
  usdValue: number;
  status: string;
  createdAt: string;
}

export type NotificationType =
  | 'GIFT_RECEIVED'
  | 'FOLLOW'
  | 'STREAM_LIVE'
  | 'STREAM_ENDED'
  | 'TOP_UP_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'REDEMPTION_SUCCESS'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  _count?: {
    reports?: number;
    streams?: number;
  };
}

export interface AdminStream {
  id: string;
  broadcaster: {
    displayName: string;
    username: string;
  };
  title: string;
  viewerCount: number;
  status: StreamStatus;
  startedAt?: string;
}

export interface AdminReport {
  id: string;
  reporter: {
    displayName: string;
    username: string;
  };
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}
