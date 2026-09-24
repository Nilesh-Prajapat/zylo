# Zylo — End-to-End Data Flows & Traceability

This document traces step-by-step technical data flows across the UI, API client, router, middleware, controller, service, database, Redis, and real-time socket layer for 13 critical platform operations.

---

## Flow 1: User Registration

```text
Client UI (app/(auth)/register/page.tsx)
  ↓ Submit form data { email, username, password, displayName }
API Client (lib/api/index.ts -> authApi.register)
  ↓ POST /api/v1/auth/register
Express Router (modules/auth/auth.routes.ts)
  ↓ Middleware: validate(registerSchema) [Zod validation]
Auth Service (modules/auth/auth.service.ts)
  ↓ 1. Check duplicate email & username (authRepository)
  ↓ 2. Hash password with argon2id (memoryCost: 65MB)
  ↓ 3. Create User in PostgreSQL (users table)
  ↓ 4. Generate JWT Access Token (15m) & Refresh Token UUID
  ↓ 5. Store RefreshToken hash & family UUID in DB
Express Response
  ↓ Set-Cookie: refreshToken (HttpOnly); Body: { user, accessToken } (201 Created)
Client Auth Context (lib/auth.tsx)
  ↓ Stores user state & accessToken in memory -> Redirect to platform
```

---

## Flow 2: User Login

```text
Client UI (app/(auth)/login/page.tsx)
  ↓ Submit credentials { email, password }
API Client (lib/api/index.ts -> authApi.login)
  ↓ POST /api/v1/auth/login
Express Router (modules/auth/auth.routes.ts)
  ↓ Middleware: validate(loginSchema)
Auth Service (modules/auth/auth.service.ts)
  ↓ 1. Find user by email in PostgreSQL
  ↓ 2. Verify user.status === ACTIVE
  ↓ 3. Verify password with argon2.verify()
  ↓ 4. Generate Access Token & Refresh Token
  ↓ 5. Store RefreshToken hash in DB
Express Response
  ↓ Set-Cookie: refreshToken (HttpOnly); Body: { user, accessToken } (200 OK)
```

---

## Flow 3: Start Live Stream (Creator)

```text
Client UI (app/(platform)/studio/page.tsx)
  ↓ Click "Start Live Stream"
API Client (lib/api/index.ts -> streamsApi.startStream)
  ↓ POST /api/v1/streams/:id/start (Header: Authorization: Bearer <accessToken>)
Express Router (modules/streams/streams.routes.ts)
  ↓ Middleware: requireAuth, verify broadcasterId === req.user.id
Streams Service / Route Handler
  ↓ 1. Verify stream status is SCHEDULED
  ↓ 2. Update Stream in DB: status = LIVE, startedAt = NOW()
  ↓ 3. Invalidate Redis caches (liveStreams, upcomingStreams, discover)
  ↓ 4. Socket.IO: emitToStream(streamId, 'stream:status_changed', { status: 'LIVE' })
  ↓ 5. Async Notification: Send STREAM_LIVE notifications to all followers
Express Response
  ↓ Return { stream: updatedStream } (200 OK)
LiveKit WebRTC Component (@livekit/components-react)
  ↓ Connects publisher track to LiveKit SFU room
```

---

## Flow 4: Viewer Joins Live Stream

```text
Client UI (app/(platform)/stream/[id]/page.tsx)
  ↓ User opens stream page
API Client (lib/api/index.ts -> streamsApi.getStreamById & getViewerToken)
  ↓ GET /api/v1/streams/:id & GET /api/v1/streams/:id/token
Express Router & LiveKit Provider
  ↓ Returns stream metadata & generates LiveKit viewer JWT token
Socket.IO Client (lib/socket/index.ts)
  ↓ Emits 'stream:join' { streamId }
Socket.IO Server (realtime/socket.ts)
  ↓ 1. Verifies user is not banned in stream_moderations
  ↓ 2. Adds viewer to Redis Set: sadd stream:<id>:viewers <viewerId>
  ↓ 3. Maps socket ID in Redis Hash: hset stream:<id>:connections <socketId> <viewerId>
  ↓ 4. Calculates viewer count: scard stream:<id>:viewers
  ↓ 5. Broadcasts 'stream:viewer_count' to room stream:<id>
Live Player Component
  ↓ Connects to LiveKit SFU WebRTC room in subscriber-only mode
```

---

## Flow 5: Send Real-Time Chat Message

```text
Client UI (components/stream/StreamChat.tsx)
  ↓ User types message & hits Enter
Socket.IO Client (lib/socket/index.ts)
  ↓ Emits 'chat:send' { streamId, message }
Socket.IO Server (realtime/socket.ts)
  ↓ 1. Trims & validates length (1-500 chars)
  ↓ 2. Rate Limiting: Redis incr chat:rate:<userId> (Max 5 msgs / 3s)
  ↓ 3. Check StreamModeration table for active MUTE or BAN
  ↓ 4. Calculate streamOffsetSeconds relative to startedAt
  ↓ 5. Insert ChatMessage in PostgreSQL
  ↓ 6. Broadcast 'chat:message' payload to room stream:<id>
Client Stream Chat Component
  ↓ Appends message to chat box UI
```

---

## Flow 6: Send Virtual Gift

```text
Client UI (components/stream/GiftModal.tsx)
  ↓ User selects gift & clicks "Send Gift"
API Client (lib/api/index.ts -> giftApi.sendGift)
  ↓ Generates client idempotencyKey UUID
  ↓ POST /api/v1/gifts/streams/:id { giftId, quantity, idempotencyKey, balanceSource }
Express Router (modules/wallet/wallet.routes.ts)
  ↓ Middleware: requireAuth, validate(sendGiftSchema)
Wallet / Gift Handler
  ↓ 1. Check idempotency: SELECT gift_transactions WHERE senderId AND idempotencyKey
  ↓ 2. Verify stream.status === LIVE & gift.isActive === true
  ↓ 3. BEGIN TRANSACTION (Prisma)
  ↓ 4. Lock sender wallet: SELECT FOR UPDATE wallets WHERE userId = senderId
  ↓ 5. Verify sender balance >= totalPrice
  ↓ 6. Update sender wallet (decrement purchasedCoins or creatorEarnings)
  ↓ 7. Update broadcaster wallet (increment creatorEarnings += totalPrice)
  ↓ 8. Insert GiftTransaction & dual WalletTransaction ledger records
  ↓ 9. COMMIT TRANSACTION
  ↓ 10. createNotification for broadcaster (GIFT_RECEIVED)
  ↓ 11. emitToStream(streamId, 'gift:sent', giftPayload)
  ↓ 12. emitToUser(broadcasterId, 'gift:received', giftPayload)
Express Response
  ↓ Return { transaction } (201 Created)
Socket.IO Real-Time Clients
  ↓ Renders live gift banner overlay animation on stream player
```

---

## Flow 7: Razorpay Wallet Top-Up & Verification

```text
Client UI (app/(platform)/wallet/page.tsx)
  ↓ User selects top-up package (e.g. ₹500 = 5,000 credits)
API Client (walletApi.createTopupOrder)
  ↓ POST /api/v1/wallet/topup/order { amountInr: 500 }
Express Backend -> Razorpay API
  ↓ 1. Calls createRazorpayOrder() -> Creates order on Razorpay server
  ↓ 2. Inserts WalletTopup record in DB (status: CREATED)
  ↓ 3. Returns { orderId, keyId, amountInr, credits }
Client Browser (Razorpay Checkout SDK Modal)
  ↓ User completes payment -> Returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
API Client (walletApi.verifyTopup)
  ↓ POST /api/v1/wallet/topup/verify
Express Backend (modules/wallet/wallet.routes.ts)
  ↓ 1. Verifies HMAC SHA256 signature using RAZORPAY_KEY_SECRET
  ↓ 2. Finds WalletTopup record in DB
  ↓ 3. Check idempotency: if status === CREDITED, return success immediately
  ↓ 4. BEGIN TRANSACTION (Prisma)
  ↓ 5. Update WalletTopup: status = CREDITED, paymentId, signature
  ↓ 6. Update Wallet: purchasedCoins += credits
  ↓ 7. Insert WalletTransaction (type: TOP_UP, direction: CREDIT)
  ↓ 8. COMMIT TRANSACTION
  ↓ 9. emitToUser(userId, 'wallet:balance_updated', walletData)
Express Response
  ↓ Return { wallet, transaction } (200 OK)
```

---

## Flow 8: Stream End & Recording Finalization

```text
Broadcaster UI / Admin Panel
  ↓ Click "End Stream"
API Client (streamsApi.endStream / adminApi.endStream)
  ↓ POST /api/v1/streams/:id/end
Express Router (modules/streams/streams.routes.ts)
  ↓ 1. Updates Stream DB: status = ENDED, endedAt = NOW(), duration = delta, recordingStatus = PROCESSING
  ↓ 2. Calls LiveKit Provider -> endRoom(livekitRoomName)
  ↓ 3. Cleans up Redis viewer keys (stream:<id>:viewers)
  ↓ 4. Socket.IO: emitToStream(streamId, 'stream:status_changed', { status: 'ENDED' })
  ↓ 5. LiveKit Egress Service records MP4 file to Cloudflare R2 bucket
  ↓ 6. LiveKit Egress posts webhook -> POST /api/v1/webhooks/livekit
Express Webhook Receiver (modules/webhooks/webhooks.routes.ts)
  ↓ Verifies webhook payload -> Updates Stream: recordingStatus = READY, replayUrl = R2 CDN URL
  ↓ createNotification for creator (REPLAY_READY)
```
