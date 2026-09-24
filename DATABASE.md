# Zylo — Database & Schema Specifications

Zylo uses PostgreSQL as its primary relational database management system, managed via Prisma ORM v5.19 (`backend/prisma/schema.prisma`).

---

## 1. Relational Database Schema Table Inventory

| Table Name | Description | Primary Key | Key Foreign Keys | Unique Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `users` | User accounts & status | `id` (cuid) | None | `email`, `username` |
| `profiles` | User profile metadata | `id` (cuid) | `userId` ➔ `users.id` | `userId` |
| `categories` | Stream categories | `id` (cuid) | None | `name`, `slug` |
| `refresh_tokens` | Opaque auth refresh tokens | `id` (cuid) | `userId` ➔ `users.id` | None |
| `follows` | User follow social graph | `id` (cuid) | `followerId`, `followingId` | `[followerId, followingId]` |
| `streams` | Live & scheduled streams | `id` (cuid) | `broadcasterId`, `categoryId` | `publicId`, `streamKey`, `livekitRoomName` |
| `chat_messages` | Stream chat history | `id` (cuid) | `streamId`, `userId` | None |
| `stream_moderations` | Mutes & stream bans | `id` (cuid) | `streamId`, `userId`, `moderatorId` | None |
| `wallets` | Virtual balances | `id` (cuid) | `userId` ➔ `users.id` | `userId` |
| `wallet_transactions` | Ledger transaction logs | `id` (cuid) | `userId` ➔ `users.id` | None |
| `coupon_redemptions` | Creator earnings redemptions | `id` (cuid) | `userId` ➔ `users.id` | `couponCode` |
| `notifications` | User notifications | `id` (cuid) | `userId` ➔ `users.id` | None |
| `gifts` | Virtual gift catalog | `id` (cuid) | None | `name` |
| `gift_transactions` | Stream gift audit log | `id` (cuid) | `senderId`, `recipientId`, `giftId`, `streamId` | `[senderId, idempotencyKey]` |
| `reports` | Moderation reports | `id` (cuid) | `reporterId`, `resolvedById` | None |
| `media_assets` | Cloudinary uploaded assets | `id` (cuid) | `ownerId` ➔ `users.id` | None |
| `stream_recordings` | Egress recording metadata | `id` (cuid) | `streamId` ➔ `streams.id` | `streamId` |
| `vods` | VOD metadata | `id` (cuid) | `streamId`, `userId` | `streamId` |
| `wallet_topups` | Razorpay top-up transactions | `id` (cuid) | `userId` ➔ `users.id` | `razorpayOrderId`, `razorpayPaymentId` |
| `stream_reminders` | User stream reminders | `id` (cuid) | `userId`, `streamId` | `[userId, streamId]` |

---

## 2. Table Column Specifications & Data Types

### `users`
* `id` (`String`, PK, default: `cuid()`)
* `email` (`String`, Unique)
* `username` (`String`, Unique)
* `displayName` (`String`)
* `passwordHash` (`String`, Argon2id hash)
* `role` (`UserRole` Enum: `NORMAL_USER`, `CREATOR`, `ADMIN`, default: `NORMAL_USER`)
* `status` (`UserStatus` Enum: `ACTIVE`, `SUSPENDED`, `BANNED`, default: `ACTIVE`)
* `avatarUrl` (`String?`, Nullable)
* `createdAt` (`DateTime`, default: `now()`)
* `updatedAt` (`DateTime`, `@updatedAt`)

### `wallets`
* `id` (`String`, PK, default: `cuid()`)
* `userId` (`String`, Unique, FK ➔ `users.id` ON DELETE Cascade)
* `purchasedCoins` (`Int`, default: `0`)
* `creatorEarnings` (`Int`, default: `0`)
* `createdAt` (`DateTime`, default: `now()`)
* `updatedAt` (`DateTime`, `@updatedAt`)

### `gift_transactions`
* `id` (`String`, PK, default: `cuid()`)
* `senderId` (`String`, FK ➔ `users.id`)
* `recipientId` (`String`, FK ➔ `users.id`)
* `giftId` (`String`, FK ➔ `gifts.id`)
* `streamId` (`String`, FK ➔ `streams.id`)
* `quantity` (`Int`, default: `1`)
* `totalPrice` (`Int`)
* `idempotencyKey` (`String`)
* `createdAt` (`DateTime`, default: `now()`)

---

## 3. Database Concurrency & Row-Level Locking Analysis

### Gift Sending Atomic Transaction (`POST /api/v1/gifts/streams/:id`)

To prevent double-spending and race conditions during coin transactions, Zylo executes a Prisma interactive transaction (`prisma.$transaction`) with explicit PostgreSQL row-level locks:

```sql
-- Lock sender wallet row exclusively
SELECT id, "purchasedCoins", "creatorEarnings"
FROM wallets
WHERE "userId" = $1
FOR UPDATE;
```

1. **Locking**: Row-level `FOR UPDATE` lock prevents concurrent transactions from mutating the sender's wallet balance simultaneously.
2. **Idempotency**: `@@unique([senderId, idempotencyKey])` on `gift_transactions` enforces exactly-once transaction processing.
3. **Atomic Ledgering**: Debits sender wallet, credits recipient `creatorEarnings`, inserts `gift_transactions` record, and inserts dual `wallet_transactions` debit/credit entries in a single commit block.

---

## 4. Indexing & Query Efficiency

### Database Index Inventory
* `refresh_tokens`: `@@index([userId])`, `@@index([family])`
* `follows`: `@@index([followerId])`, `@@index([followingId])`
* `streams`: `@@index([status, scheduledAt])`, `@@index([status, startedAt])`, `@@index([broadcasterId, status])`, `@@index([createdAt])`
* `chat_messages`: `@@index([streamId, createdAt])`, `@@index([streamId, streamOffsetSeconds])`
* `stream_moderations`: `@@index([streamId, userId, revokedAt])`, `@@index([expiresAt])`
* `wallet_transactions`: `@@index([userId, createdAt])`, `@@index([type])`
* `notifications`: `@@index([userId, read])`, `@@index([userId, createdAt])`
* `gift_transactions`: `@@index([streamId])`, `@@index([recipientId])`
* `reports`: `@@index([status])`, `@@index([targetType, targetId])`
* `wallet_topups`: `@@index([userId, createdAt])`, `@@index([razorpayOrderId])`
