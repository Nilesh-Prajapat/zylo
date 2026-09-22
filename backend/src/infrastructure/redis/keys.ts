/**
 * Centralized Redis key strategy.
 * All Redis keys used in the application MUST be defined here.
 */
export const RedisKeys = {
  // Online presence
  userPresence: (userId: string) => `presence:user:${userId}`,
  streamPresence: (streamId: string) => `presence:stream:${streamId}`,

  // Stream viewers (Redis Set of user IDs)
  streamViewers: (streamId: string) => `stream:${streamId}:viewers`,
  // Socket-to-user mapping for a stream
  streamConnections: (streamId: string) => `stream:${streamId}:connections`,

  // Cache keys
  liveStreams: () => 'streams:live',
  activeStreams: () => 'streams:active',
  upcomingStreams: () => 'streams:upcoming',
  profileCache: (userId: string) => `profile:${userId}`,
  streamCache: (streamId: string) => `stream:${streamId}`,
  giftsCatalog: () => 'gifts:catalog',

  // Rate limiting
  rateLimit: (type: string, identifier: string) => `rate:${type}:${identifier}`,
  chatRate: (userId: string) => `rate:chat:${userId}`,
  giftRate: (userId: string, streamId: string) => `rate:gift:${userId}:${streamId}`,
  authRate: (type: string, ip: string) => `rate:auth:${type}:${ip}`,

  // Viewer count peak tracking
  streamPeakViewers: (streamId: string) => `stream:${streamId}:peak`,
} as const;

// TTLs (in seconds)
export const RedisTTL = {
  USER_PRESENCE: 45,
  PRESENCE_HEARTBEAT_INTERVAL: 15,
  LIVE_STREAMS_CACHE: 10,
  UPCOMING_STREAMS_CACHE: 30,
  PROFILE_CACHE: 300, // 5 minutes
  STREAM_CACHE: 15,
  GIFT_CATALOG_CACHE: 3600, // 1 hour
  CHAT_RATE_WINDOW: 10,
  CHAT_RATE_MAX: 8,
} as const;
