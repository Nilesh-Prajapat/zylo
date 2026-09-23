# ZYLO — Full API, Data & Caching Architecture Specification

## 1. Executive Summary & Core Principles
The Zylo platform enforces a strict 4-tier data architecture to guarantee high performance, minimum payload size, data isolation, and strong transactional integrity:

1. **PostgreSQL (Persistent Source of Truth)**: Wallet balances, transactions, user accounts, stream history, report records, moderation history.
2. **Redis (Ephemeral & Fast Read Cache Layer)**: Viewer presence, peak viewer counts, active live stream catalogs, category definitions, gifts catalog, rate limits, session tokens.
3. **Socket.IO (Realtime Application State)**: Chat messages, real-time gift animations, viewer count updates, stream status changes, live moderation events.
4. **LiveKit (Media Transport)**: WebRTC audio & video streaming only (no application metadata).

---

## 2. Data Classification System

| Category | Description | Storage Source | Cache Strategy & TTL | Invalidation Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Static Data** | Gifts catalog, categories, global app configs | PostgreSQL + Redis | Long TTL (1 hour / 3600s) | Admin mutation / manual flush |
| **Semi-Static Data** | User public profile, creator stats, upcoming streams | PostgreSQL + Redis | Short TTL (60s – 300s) | User profile update, follow toggle |
| **Highly Dynamic Data** | Viewer count, online presence, live stream status | Redis / Socket.IO | Realtime / In-Memory (No DB polling) | Socket join/leave, presence heartbeat |
| **Transactional Data** | Wallet balances, coin top-ups, gift transactions | PostgreSQL ($transaction) | Strongly consistent DB reads (No stale Redis cache) | Immediate DB commit + socket notification |

---

## 3. Complete API Inventory & DTO Specifications

### A. Auth Module (`/api/v1/auth`)

#### `POST /auth/login` & `POST /auth/register`
- **Consumer**: Auth Modal / Public Visitors
- **DB Query**: `prisma.user.findUnique({ where: { email } })` (Indexed)
- **Response Payload (DTO)**:
  ```json
  {
    "user": { "id": "...", "username": "...", "displayName": "...", "email": "...", "avatarUrl": "...", "role": "..." },
    "tokens": { "accessToken": "...", "expiresIn": 900 }
  }
  ```
- **Caching**: None (Private / Security sensitive)

#### `GET /auth/me`
- **Consumer**: App Root Initialization / Header
- **DB Query**: `prisma.user.findUnique({ where: { id: sub }, select: { id, username, displayName, email, avatarUrl, role, status } })`
- **Caching**: Client-side state (Loaded ONCE at app boot via AuthProvider context)

---

### B. Users & Profiles Module (`/api/v1/users`)

#### `GET /users/me`
- **Consumer**: User Profile / Settings Page
- **DTO (UserPrivateDTO)**:
  ```json
  {
    "user": {
      "id": "...", "username": "...", "displayName": "...", "email": "...",
      "avatarUrl": "...", "role": "...", "status": "...",
      "profile": { "bio": "...", "coverImageUrl": "...", "location": "...", "website": "..." },
      "wallet": { "purchasedCoins": 500, "creatorEarnings": 120 }
    }
  }
  ```

#### `GET /users/:id`
- **Consumer**: Public Creator / User Profile Page (`/profile/:id`)
- **Redis Cache Key**: `zylo:user:{id}:profile` (TTL: 300s)
- **DTO (UserProfileDTO)**:
  ```json
  {
    "user": {
      "id": "...", "username": "...", "displayName": "...", "avatarUrl": "...", "role": "...",
      "profile": { "bio": "...", "coverImageUrl": "...", "location": "...", "website": "..." },
      "stats": { "followerCount": 120, "followingCount": 45, "totalStreams": 12 }
    },
    "isFollowing": false
  }
  ```
- **Invalidation**: Invalidated on `PUT /users/me`, `POST /users/:id/follow`, `DELETE /users/:id/follow`.

#### `GET /users/trending`
- **Consumer**: Home Sidebar / Recommended Creators
- **Redis Cache Key**: `zylo:users:trending` (TTL: 180s)
- **DTO (UserMiniDTO[])**: Array of `{ id, username, displayName, avatarUrl, followerCount }`

#### `GET /users/:id/followers` & `GET /users/:id/following`
- **Consumer**: Profile Followers/Following Modal
- **Pagination**: Cursor-based (`?cursor=<id>&limit=20`)
- **Query Optimization**: Strict `select: { follower: { select: UserMiniDTO } }`

---

### C. Live Streaming Module (`/api/v1/streams`)

#### `GET /streams/live`
- **Consumer**: Home Page Viewport / Discover Grid
- **Redis Cache Key**: `zylo:streams:live` (TTL: 15s)
- **DTO (StreamListItemDTO[])**:
  ```json
  [{
    "id": "...", "publicId": "...", "title": "...", "thumbnailUrl": "...",
    "category": { "id": "...", "name": "...", "slug": "..." },
    "broadcaster": { "id": "...", "username": "...", "displayName": "...", "avatarUrl": "..." },
    "status": "LIVE", "viewerCount": 1420, "startedAt": "..."
  }]
  ```

#### `GET /streams/upcoming`
- **Consumer**: Home Page Schedule Section
- **Redis Cache Key**: `zylo:streams:upcoming` (TTL: 60s)
- **DTO (StreamScheduledDTO[])**: Selects minimal thumbnail, title, broadcaster, and `scheduledAt`.

#### `GET /streams/:id`
- **Consumer**: Viewer Stream Page (`/stream/:id`)
- **Redis Cache Key**: `zylo:stream:{id}:meta` (TTL: 30s)
- **DTO (StreamDetailDTO)**:
  ```json
  {
    "stream": {
      "id": "...", "publicId": "...", "title": "...", "description": "...",
      "thumbnailUrl": "...", "status": "LIVE", "scheduledAt": "...", "startedAt": "...",
      "enableChat": true, "enableGifts": true, "saveRecording": true,
      "broadcaster": { "id": "...", "username": "...", "displayName": "...", "avatarUrl": "..." }
    },
    "isFollowing": false
  }
  ```

#### `POST /streams` (Create Stream)
- **Behavior**: Always creates stream in `SCHEDULED` status. Broadcaster must click `START LIVE` inside Stream Studio to transition to `LIVE`.

#### `POST /streams/:id/start` (Idempotent Start)
- **Behavior**: Idempotent. Checks if stream is already `LIVE`. Transitions status from `SCHEDULED` → `LIVE`, initializes Redis viewer count, sets `startedAt`, emits `stream:status_changed` to `stream:${id}`, and invalidates `zylo:streams:live`.

#### `POST /streams/:id/end` (End Live Stream)
- **Behavior**: Transitions status from `LIVE` → `ENDED`, records duration & peak viewer count, sets `endedAt`, emits `stream:status_changed` to `stream:${id}`, and invalidates `zylo:streams:live`.

---

### D. Wallet & Gift Module (`/api/v1/wallet` & `/api/v1/gifts`)

#### `GET /gifts` (Catalog)
- **Consumer**: Gift Modal
- **Redis Cache Key**: `zylo:gifts:catalog` (TTL: 3600s)
- **DTO**: Array of `{ id, name, emoji, price, sortOrder }`

#### `POST /gifts/streams/:id` (Transactional Gift Transfer)
- **Auth**: Required
- **Flow**:
  1. Authenticate & verify stream status `LIVE`.
  2. Perform DB `$transaction`:
     - Deduct coins from sender wallet (`purchasedCoins` or `creatorEarnings`).
     - Credit `creatorEarnings` to broadcaster wallet.
     - Insert `GiftTransaction` record.
     - Insert dual `WalletTransaction` records (DEBIT & CREDIT).
  3. **COMMIT**.
  4. Emit `gift:received` and `gift:sent` to Socket room `stream:${streamId}`.

---

### E. Moderation Module (`/api/v1/streams/:id/moderation`)

#### Actions: Mute, Ban, Unban, Remove
- **Mute**: Persisted in `StreamModeration`. `chat:send` socket event rejects muted users.
- **Remove**: Emits `moderation:removed` to target socket and forces target socket out of `stream:${streamId}` room. User may rejoin.
- **Ban**: Persisted in `StreamModeration` (`PERMANENT_BAN`/`TEMPORARY_BAN`). Target socket evicted. `stream:join` checks active ban and rejects rejoin attempts.

---

## 4. Redis Key Inventory

| Key Pattern | Purpose | TTL | Invalidation Trigger |
| :--- | :--- | :--- | :--- |
| `zylo:gifts:catalog` | Active gift items & prices | 3600s | Manual / Admin update |
| `zylo:categories:all` | Stream categories list | 3600s | Admin update |
| `zylo:streams:live` | Top live streams grid | 15s | Stream start / Stream end |
| `zylo:streams:upcoming` | Scheduled broadcasts | 60s | New stream creation / cancellation |
| `zylo:stream:{id}:meta` | Stream details DTO | 30s | Broadcaster patch update / status change |
| `zylo:stream:{id}:viewers` | Redis Set of active viewer IDs | Ephemeral | Viewer socket connect / disconnect |
| `zylo:stream:{id}:peak` | Peak viewer count integer | Ephemeral | Deleted on stream end |
| `zylo:user:{id}:profile` | Public user profile & stats | 300s | Profile update / follow toggle |
| `zylo:chat:rate:{userId}` | Chat rate-limiting counter | 5s | Auto-expire sliding window |

---

## 5. Realtime Socket.IO Event Map

| Event Name | Room Scope | Direction | Payload |
| :--- | :--- | :--- | :--- |
| `stream:join` | `stream:${id}` | Client → Server | `{ streamId }` |
| `stream:leave` | `stream:${id}` | Client → Server | `{ streamId }` |
| `stream:joined` | Single Socket | Server → Client | `{ streamId, viewerCount }` |
| `stream:viewer_count` | `stream:${id}` | Server → Clients | `{ streamId, viewerCount }` |
| `chat:send` | `stream:${id}` | Client → Server | `{ streamId, message }` |
| `chat:message` | `stream:${id}` | Server → Clients | `{ id, streamId, user: UserMiniDTO, message, createdAt }` |
| `chat:deleted` | `stream:${id}` | Server → Clients | `{ streamId, messageId }` |
| `gift:received` | `stream:${id}` | Server → Clients | `{ id, gift: GiftDTO, sender: UserMiniDTO, receiverId, quantity, totalPrice, createdAt }` |
| `moderation:muted` | `user:${userId}` | Server → Client | `{ streamId, durationMinutes, reason }` |
| `moderation:banned` | `user:${userId}` | Server → Client | `{ streamId, type, reason }` |
| `moderation:removed` | `user:${userId}` | Server → Client | `{ streamId, reason }` |
| `stream:status_changed` | `stream:${id}` | Server → Clients | `{ streamId, status }` |

---

## 6. Cache Invalidation Matrix

| User Action / API Call | Affected Redis Keys | Invalidation Action |
| :--- | :--- | :--- |
| `PUT /users/me` | `zylo:user:{userId}:profile` | `redis.del()` |
| `POST /users/:id/follow` | `zylo:user:{followerId}:profile`, `zylo:user:{targetId}:profile` | `redis.del()` both keys |
| `POST /streams/:id/start` | `zylo:streams:live`, `zylo:stream:{id}:meta` | `redis.del()` both keys |
| `POST /streams/:id/end` | `zylo:streams:live`, `zylo:stream:{id}:meta` | `redis.del()` both keys |
| `PATCH /streams/:id` | `zylo:stream:{id}:meta` | `redis.del()` |
| `POST /admin/gifts` | `zylo:gifts:catalog` | `redis.del()` |

---

## 7. Performance & Query Optimization Strategy
1. **No `SELECT *`**: All database queries explicitly define `select` fields to minimize memory & serialization overhead.
2. **Indexed Foreign Keys & Status Filters**: Composite database indexes on `(status, scheduledAt)`, `(status, startedAt)`, `(broadcasterId, status)`, `(streamId, createdAt)`, and `(streamId, userId, revokedAt)`.
3. **Request Deduplication**: Frontend query provider caches and deduplicates concurrent API requests for `/auth/me` and static catalogs.
4. **Idempotency**: Stream creation, stream starting, and gift sending enforce idempotency keys and state transition checks to prevent duplicate side effects.
