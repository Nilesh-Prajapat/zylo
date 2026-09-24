# Zylo — Socket.IO Real-Time Protocol Specification

This document details the Socket.IO real-time communication events, connection lifecycle, authentication handshake, rate limiting, and room architecture implemented in the Zylo live streaming platform.

---

## 1. Connection & Authentication Handshake

* **Endpoint**: `/socket.io/`
* **Transport**: WebSocket primary with HTTP long-polling fallback.
* **Handshake Authentication**:
  - The client provides a JWT access token via `socket.handshake.auth.token` or the `Authorization: Bearer <token>` header.
  - Handshake middleware verifies the token using `JWT_ACCESS_SECRET` and queries the database for user status (`ACTIVE`).
  - If valid: `socket.userId`, `socket.username`, `socket.displayName`, and `socket.avatarUrl` are attached to the socket instance.
  - If invalid or unauthenticated: The socket connects as an anonymous guest (`socket.userId = undefined`).

---

## 2. Room Architecture

| Room Name | Scope | Description |
| :--- | :--- | :--- |
| `stream:<streamId>` | Public Stream | Created when viewers/broadcaster call `stream:join`. Broadcasts chat messages, viewer counts, gift events, and moderation actions. |
| `user:<userId>` | Private User | Created on connection for authenticated users. Broadcasts targeted notifications, private wallet updates, and personal moderation alerts. |

---

## 3. Master WebSocket Event Inventory

| Event Name | Direction | Payload Schema | Auth Required | Scope / Room | Action / Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `stream:join` | Client ➔ Server | `{ streamId: string }` | Optional | `stream:<id>` | Join stream chat & presence room. Increments viewer set in Redis. |
| `stream:joined` | Server ➔ Client | `{ streamId: string, viewerCount: number }` | Optional | Socket | Acknowledges stream join to requester. |
| `stream:leave` | Client ➔ Server | `{ streamId: string }` | Optional | `stream:<id>` | Leaves stream chat room. Decrements viewer count in Redis. |
| `stream:viewer_count` | Server ➔ Client | `{ streamId: string, viewerCount: number }` | Optional | `stream:<id>` | Broadcasts updated live viewer count to stream room. |
| `chat:send` | Client ➔ Server | `{ streamId: string, message: string }` | **Required** | `stream:<id>` | Sends chat message to room. Validated (max 500 chars) & rate limited. |
| `chat:message` | Server ➔ Client | `{ id, streamId, user, message, streamOffsetSeconds, createdAt }` | Public | `stream:<id>` | Broadcasts new chat message to all viewers. |
| `chat:delete` | Client ➔ Server | `{ streamId: string, messageId: string }` | **Required** (Owner/Admin) | `stream:<id>` | Deletes chat message from database and broadcasts deletion event. |
| `chat:deleted` | Server ➔ Client | `{ streamId: string, messageId: string }` | Public | `stream:<id>` | Notifies clients to remove deleted chat message. |
| `chat:error` | Server ➔ Client | `{ code: string, message: string }` | Optional | Socket | Emits chat failure error (e.g. `RATE_LIMITED`, `USER_MUTED`). |
| `stream:error` | Server ➔ Client | `{ code: string, message: string }` | Optional | Socket | Emits stream join failure (e.g. `BANNED`). |
| `stream:status_changed`| Server ➔ Client | `{ streamId: string, status: string, startedAt/endedAt }` | Public | `stream:<id>` | Broadcasts stream lifecycle transitions (`LIVE`, `ENDED`). |
| `stream:started` | Server ➔ Client | `{ streamId: string, status: 'LIVE', startedAt: string }` | Public | `stream:<id>` | Signals stream start. |
| `gift:sent` | Server ➔ Client | `{ id, gift, sender, receiverId, quantity, totalPrice, createdAt }` | Public | `stream:<id>` | Broadcasts real-time gift animation trigger to stream room. |
| `gift:received` | Server ➔ Client | `{ id, gift, sender, receiverId, quantity, totalPrice, createdAt }` | **Required** | `user:<creatorId>` | Private real-time alert sent to creator's personal socket. |
| `moderation:muted` | Server ➔ Client | `{ streamId, durationMinutes, expiresAt, reason }` | **Required** | `user:<targetId>` | Private notification to muted user. |
| `moderation:banned` | Server ➔ Client | `{ streamId, type, expiresAt, reason }` | **Required** | `user:<targetId>` | Private notification to banned user. |
| `moderation:unbanned` | Server ➔ Client | `{ streamId }` | **Required** | `user:<targetId>` | Private notification to unbanned user. |
| `moderation:removed` | Server ➔ Client | `{ streamId, reason }` | **Required** | `user:<targetId>` | Private notification to kicked user. |
| `moderation:user_updated`| Server ➔ Client | `{ streamId, userId, username, type, expiresAt }` | Public | `stream:<id>` | Broadcasts moderation state update to stream moderators/room. |
| `wallet:balance_updated`| Server ➔ Client | `{ wallet, transaction }` | **Required** | `user:<userId>` | Emits real-time wallet balance update after top-up or redemption. |
| `presence:heartbeat` | Client ➔ Server | `void` | **Required** | Server | Refreshes user presence key in Redis (`TTL: 60s`). |

---

## 4. Chat Rate Limiting & Validation

* **Validation**: Trimmed messages must be between 1 and 500 characters.
* **Rate Limiting Engine**:
  - Redis Key: `chat:rate:<userId>`
  - Max Messages: 5 messages per 3-second window (`CHAT_RATE_MAX = 5`, `CHAT_RATE_WINDOW = 3`).
  - If exceeded, server emits `chat:error` with code `RATE_LIMITED`.
* **Moderation Check**: Before persisting or broadcasting chat messages, the handler checks `StreamModeration` table for active `MUTE` or `BAN` records (`revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW())`).

---

## 5. Reconnection & Cleanup Lifecycle

1. **Client Disconnect**: Upon client disconnect (`disconnect` event), the socket server loops over all joined rooms matching `stream:<streamId>`.
2. **Connection Cleanup**: Removes `socket.id` mapping from Redis Hash `stream:<streamId>:connections`.
3. **Multi-Tab Presence Check**: Checks if `socket.userId` still has active connections in `stream:<streamId>:connections`. If no active connections remain, removes user from Redis Set `stream:<streamId>:viewers` and broadcasts updated `stream:viewer_count`.
