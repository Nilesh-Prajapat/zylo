# Zylo — REST API Specifications

The Zylo Backend API is accessible at `/api/v1` and documented interactively via Swagger UI at `/api/v1/docs`.

---

## Master API Endpoint Inventory

| Method | Endpoint | Module | Auth Guard | Role Required | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Core | Public | None | System health check (DB + Redis) |
| `POST` | `/api/v1/auth/register` | Auth | Public | None | Register new user account |
| `POST` | `/api/v1/auth/login` | Auth | Public | None | Authenticate user & issue JWT |
| `POST` | `/api/v1/auth/refresh` | Auth | Public | None | Rotate refresh token & return access token |
| `POST` | `/api/v1/auth/logout` | Auth | Public | None | Revoke refresh token family & clear cookie |
| `GET` | `/api/v1/auth/me` | Auth | Required | Any | Fetch current logged-in user profile |
| `GET` | `/api/v1/users/me` | Users | Required | Any | Fetch active user profile & wallet stats |
| `POST` | `/api/v1/users/me/role/switch` | Users | Required | Any | Switch role between `NORMAL_USER` and `CREATOR` |
| `GET` | `/api/v1/users/trending` | Users | Optional | Any | Fetch trending creators sorted by followers |
| `GET` | `/api/v1/users/:id` | Users | Optional | Any | Fetch public profile by ID or username |
| `PATCH` | `/api/v1/users/me` | Users | Required | Any | Update user profile fields |
| `PUT` | `/api/v1/users/me` | Users | Required | Any | Alias to update user profile |
| `POST` | `/api/v1/users/:id/follow` | Users | Required | Any | Follow a target user |
| `DELETE` | `/api/v1/users/:id/follow` | Users | Required | Any | Unfollow a target user |
| `GET` | `/api/v1/users/:id/followers` | Users | Optional | Any | Paginated list of followers |
| `GET` | `/api/v1/users/:id/following` | Users | Optional | Any | Paginated list of following users |
| `POST` | `/api/v1/streams` | Streams | Required | `CREATOR` | Create a new stream in `SCHEDULED` status |
| `POST` | `/api/v1/streams/:id/start` | Streams | Required | `CREATOR` | Start a scheduled stream (transition to `LIVE`) |
| `GET` | `/api/v1/streams/mine/active` | Streams | Required | `CREATOR` | Fetch active live stream of broadcaster |
| `GET` | `/api/v1/streams/mine` | Streams | Required | `CREATOR` | Paginated streams owned by broadcaster |
| `GET` | `/api/v1/streams/mine/stats` | Streams | Required | `CREATOR` | Lifetime analytics stats for broadcaster |
| `PATCH` | `/api/v1/streams/:id/publication` | Streams | Required | Owner / Admin | Modify publication status (`PUBLISHED`/`HIDDEN`) |
| `GET` | `/api/v1/streams/reminders/mine` | Streams | Required | Any | Get user's stream reminder IDs |
| `POST` | `/api/v1/streams/:id/remind` | Streams | Required | Any | Toggle reminder for an upcoming stream |
| `GET` | `/api/v1/streams/live` | Streams | Optional | Any | List active live streams |
| `GET` | `/api/v1/streams/upcoming` | Streams | Public | None | List upcoming scheduled streams |
| `GET` | `/api/v1/streams/discover` | Streams | Optional | Any | Discovery payload (live + upcoming streams) |
| `GET` | `/api/v1/streams/:id/token` | Streams | Required | Any | Generate LiveKit viewer/publisher token |
| `GET` | `/api/v1/streams/:id/chat` | Streams | Optional | Any | Fetch chat history for stream |
| `GET` | `/api/v1/streams/:id` | Streams | Optional | Any | Fetch stream details by ID or public ID |
| `PATCH` | `/api/v1/streams/:id` | Streams | Required | Owner / Admin | Update stream title, description, settings |
| `POST` | `/api/v1/streams/:id/end` | Streams | Required | Owner / Admin | End stream (transition `LIVE` to `ENDED`) |
| `POST` | `/api/v1/streams/:id/join` | Streams | Required | Any | Register viewer join event in Redis |
| `POST` | `/api/v1/streams/:id/leave` | Streams | Required | Any | Register viewer leave event in Redis |
| `GET` | `/api/v1/streams` | Streams | Optional | Any | Paginated streams query |
| `POST` | `/api/v1/streams/:id/moderation/mute` | Moderation | Required | Owner / Admin | Mute user on live stream |
| `POST` | `/api/v1/streams/:id/moderation/ban` | Moderation | Required | Owner / Admin | Ban user from live stream |
| `POST` | `/api/v1/streams/:id/moderation/unban` | Moderation | Required | Owner / Admin | Revoke mute/ban restriction |
| `POST` | `/api/v1/streams/:id/moderation/remove` | Moderation | Required | Owner / Admin | Forcefully disconnect user from stream |
| `GET` | `/api/v1/streams/:id/moderation` | Moderation | Required | Owner / Admin | List active moderation restrictions |
| `GET` | `/api/v1/categories` | Categories | Public | None | List all streaming categories |
| `GET` | `/api/v1/categories/:slug` | Categories | Public | None | Get category details and live streams |
| `POST` | `/api/v1/categories` | Categories | Required | `ADMIN` | Create new stream category |
| `GET` | `/api/v1/wallet` | Wallet | Required | Any | Get wallet balances & recent transactions |
| `GET` | `/api/v1/wallet/transactions` | Wallet | Required | Any | Paginated wallet transaction history |
| `POST` | `/api/v1/wallet/topup/order` | Wallet | Required | Any | Generate server-side Razorpay payment order |
| `POST` | `/api/v1/wallet/topup/verify` | Wallet | Required | Any | Verify Razorpay HMAC signature & credit wallet |
| `POST` | `/api/v1/wallet/redeem` | Wallet | Required | Any | Redeem creator earnings for rewards coupon |
| `GET` | `/api/v1/wallet/redemptions` | Wallet | Required | Any | List creator earnings redemption history |
| `GET` | `/api/v1/gifts` | Gifts | Public | None | List active virtual gift catalog |
| `POST` | `/api/v1/gifts/streams/:id` | Gifts | Required | Any | Send virtual gift to broadcaster on live stream |
| `GET` | `/api/v1/admin/users` | Admin | Required | `ADMIN` | Admin query user accounts |
| `PATCH` | `/api/v1/admin/users/:id/status` | Admin | Required | `ADMIN` | Update user account status (`ACTIVE`/`SUSPENDED`/`BANNED`) |
| `GET` | `/api/v1/admin/streams` | Admin | Required | `ADMIN` | Admin query streams |
| `POST` | `/api/v1/admin/streams/:id/end` | Admin | Required | `ADMIN` | Admin terminate active stream |
| `GET` | `/api/v1/admin/reports` | Admin | Required | `ADMIN` | List platform violation reports |
| `PATCH` | `/api/v1/admin/reports/:id` | Admin | Required | `ADMIN` | Update report resolution status |
| `POST` | `/api/v1/reports` | Reports | Required | Any | Submit violation report |
| `POST` | `/api/v1/media/upload` | Media | Required | Any | Direct server-side upload to Cloudinary |
| `POST` | `/api/v1/media/cloudinary/signature` | Media | Required | Any | Generate client-side Cloudinary upload signature |
| `POST` | `/api/v1/media/complete` | Media | Required | Any | Complete MediaAsset record |
| `DELETE` | `/api/v1/media/:id` | Media | Required | Owner | Delete MediaAsset |
| `GET` | `/api/v1/notifications` | Notifications | Required | Any | List user notifications |
| `GET` | `/api/v1/notifications/unread-count` | Notifications | Required | Any | Get unread notification count |
| `PATCH` | `/api/v1/notifications/:id/read` | Notifications | Required | Any | Mark notification as read |
| `POST` | `/api/v1/notifications/read-all` | Notifications | Required | Any | Mark all notifications as read |
| `POST` | `/api/v1/webhooks/livekit` | Webhooks | Public / Webhook | Webhook | LiveKit egress completion webhook listener |

---

## Endpoint Deep-Dives & Schemas

### 1. Authentication

#### `POST /api/v1/auth/register`
* **Auth**: Public
* **Request Body**:
```json
{
  "email": "creator@zylo.test",
  "username": "creator123",
  "password": "Password123!",
  "displayName": "Creator One"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cld1234567890",
      "email": "creator@zylo.test",
      "username": "creator123",
      "displayName": "Creator One",
      "role": "NORMAL_USER",
      "status": "ACTIVE",
      "avatarUrl": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
* **Error Responses**: `400 Validation Error`, `409 Email/Username Taken`.

#### `POST /api/v1/auth/login`
* **Auth**: Public
* **Request Body**:
```json
{
  "email": "creator@zylo.test",
  "password": "Password123!"
}
```
* **Success Response (200 OK)**: Sets `refreshToken` HttpOnly cookie.
```json
{
  "success": true,
  "data": {
    "user": { "id": "cld1234567890", "username": "creator123", "role": "CREATOR" },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Live Streams

#### `POST /api/v1/streams`
* **Auth**: Required (`CREATOR` role)
* **Request Body**:
```json
{
  "title": "Valorant Ranked Grind to Radiant",
  "description": "Playing competitive matches!",
  "categoryId": "cat_gaming_123",
  "visibility": "PUBLIC",
  "language": "English",
  "saveRecording": true
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream_98765",
      "publicId": "pub_98765",
      "broadcasterId": "user_123",
      "status": "SCHEDULED",
      "title": "Valorant Ranked Grind to Radiant",
      "livekitRoomName": "zylo-room-pub_98765"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "livekitUrl": "wss://zylo-livekit.example.com"
  }
}
```

#### `POST /api/v1/streams/:id/start`
* **Auth**: Required (`CREATOR` owner)
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream_98765",
      "status": "LIVE",
      "startedAt": "2026-09-24T08:00:00.000Z"
    }
  }
}
```

---

### 3. Virtual Wallet & Gifts

#### `POST /api/v1/gifts/streams/:id`
* **Auth**: Required
* **Request Body**:
```json
{
  "giftId": "gift_superstar_1",
  "quantity": 2,
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "balanceSource": "PERSONAL_COINS"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "gtx_12345",
      "senderId": "user_viewer",
      "recipientId": "user_creator",
      "giftId": "gift_superstar_1",
      "streamId": "stream_98765",
      "quantity": 2,
      "totalPrice": 1000,
      "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "createdAt": "2026-09-24T08:30:00.000Z"
    }
  }
}
```
* **Error Responses**: `400 Insufficient Balance`, `400 Stream Not Live`, `404 Gift Not Found`.
