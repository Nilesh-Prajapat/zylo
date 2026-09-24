# Zylo — Comprehensive Repository & Project Structure

This document provides a directory-by-directory and file-by-file mapping of responsibilities across the entire monorepo codebase.

---

## 1. Root Repository Structure

```text
zylo/
├── .github/                  # GitHub Actions CI/CD workflows
├── backend/                  # Node.js & Express TypeScript Backend Service
├── client/                   # Next.js 13 Web Frontend Application
├── docs/                     # Product PRDs, Specs, and UI/UX documentation
├── .gitignore                # Root Git ignore declarations
├── API_ARCHITECTURE.md       # API architecture summary
├── vercel.json               # Root Vercel routing deployment configuration
├── README.md                 # Primary platform overview
├── ARCHITECTURE.md           # System architecture specification
├── API.md                    # REST API inventory & endpoint specs
├── WEBSOCKET.md              # Real-time Socket.IO event specifications
├── DATABASE.md               # PostgreSQL schema & transaction documentation
├── SECURITY.md               # Threat model & security audit findings
├── TESTING.md                # Test suite audit & requirement matrix
├── DEPLOYMENT.md             # Docker & production deployment guide
├── PROJECT_STRUCTURE.md      # This file mapping guide
├── TECHNICAL_DECISIONS.md    # Architectural Decision Records (ADRs)
├── DATA_FLOWS.md             # End-to-end data flow traceability
├── OPERATIONS.md             # Operational runbook & maintenance guide
└── PROJECT_AUDIT.md          # Forensic technical audit & gap analysis report
```

---

## 2. Backend Module & File Responsibilities (`/backend`)

### Core Setup (`/backend/src/app`)
* [app.ts](file:///g:/zylo/backend/src/app/app.ts): Express application factory `createApp()`. Configures Helmet, CORS, Cookie Parser, Winston request logger, rate limiting, health check, Swagger UI, API routes, 404 handler, and global error handler.
* [routes.ts](file:///g:/zylo/backend/src/app/routes.ts): Master API router mounting sub-routers onto `/api/v1` (`authRouter`, `usersRouter`, `streamsRouter`, `moderationRouter`, `categoriesRouter`, `walletRouter`, `giftsRouter`, `adminRouter`, `reportsRouter`, `mediaRouter`, `notificationsRouter`, `webhooksRouter`).
* [server.ts](file:///g:/zylo/backend/src/app/server.ts): Application entry point. Creates HTTP server, initializes Socket.IO via `setupSocketIO`, verifies DB/Redis connectivity, and begins listening on `PORT`.
* [swagger.ts](file:///g:/zylo/backend/src/app/swagger.ts): Swagger OpenAPI 3.0 specification definitions for automated API documentation.

### Modules (`/backend/src/modules`)
* **`auth/`**:
  - `auth.routes.ts`: Router endpoints for `/register`, `/login`, `/refresh`, `/logout`, `/me`.
  - `auth.service.ts`: Business logic for Argon2id password hashing, JWT generation, and refresh token family rotation.
  - `auth.repository.ts`: Data access layer for user and refresh token database queries.
  - `auth.validators.ts`: Zod schemas for registration and login payloads.
* **`users/`**:
  - `users.routes.ts`: Router endpoints for user profiles, role switching (`NORMAL_USER` ↔ `CREATOR`), trending creators, follow/unfollow social graph, and follower lists.
* **`streams/`**:
  - `streams.routes.ts`: Stream lifecycle router (`POST /`, `/start`, `/end`, `/live`, `/upcoming`, `/discover`, `/:id/token`, `/:id/chat`, `/:id/remind`).
  - `moderation.routes.ts`: Live stream moderation endpoints (`/mute`, `/ban`, `/unban`, `/remove`).
* **`wallet/`**:
  - `wallet.routes.ts`: Dual-wallet balances, Razorpay order creation & signature verification (`/topup/order`, `/topup/verify`), creator earnings coupon redemption (`/redeem`), and virtual gift processing (`POST /gifts/streams/:id`).
* **`admin/`**:
  - `admin.routes.ts`: RBAC admin routes for user status updates, stream termination, and report resolutions.
* **`categories/`**:
  - `categories.routes.ts`: Stream category listing and creation.
* **`media/`**:
  - `media.routes.ts`: Server-side Cloudinary upload and signed upload parameter generation.
* **`notifications/`**:
  - `notifications.routes.ts`: User notification listing, unread counts, and read status updates.
  - `notification.service.ts`: Helper service for creating in-app user notifications.
* **`reports/`**:
  - `reports.routes.ts`: User report submission endpoint.
* **`webhooks/`**:
  - `webhooks.routes.ts`: LiveKit egress completion webhook listener.

### Real-time & Infrastructure (`/backend/src`)
* [realtime/socket.ts](file:///g:/zylo/backend/src/realtime/socket.ts): Socket.IO server initialization, handshake JWT authentication, room joining/leaving, chat rate limiting, chat deletion, viewer counting, and socket cleanup.
* [common/middleware/index.ts](file:///g:/zylo/backend/src/common/middleware/index.ts): Middleware functions (`requireAuth`, `optionalAuth`, `requireRole`, `validate`, `requestIdMiddleware`, `errorHandler`).
* [infrastructure/database/prisma.ts](file:///g:/zylo/backend/src/infrastructure/database/prisma.ts): PrismaClient singleton instance.
* [infrastructure/redis/redis.ts](file:///g:/zylo/backend/src/infrastructure/redis/redis.ts): ioredis client singleton and ping methods.
* [infrastructure/redis/keys.ts](file:///g:/zylo/backend/src/infrastructure/redis/keys.ts): Redis key generators and TTL constants.
* [infrastructure/media/livekit.provider.ts](file:///g:/zylo/backend/src/infrastructure/media/livekit.provider.ts): LiveKit Server SDK wrapper for generating tokens, creating rooms, and closing rooms.
* [infrastructure/payment/razorpay.service.ts](file:///g:/zylo/backend/src/infrastructure/payment/razorpay.service.ts): Razorpay API order creation and HMAC SHA256 signature verification.
* [infrastructure/storage/r2.ts](file:///g:/zylo/backend/src/infrastructure/storage/r2.ts): Cloudflare R2 / AWS S3 client wrapper.

---

## 3. Frontend Directory & File Responsibilities (`/client`)

### App Router Routes (`/client/app`)
* **`(auth)/`**: `login/page.tsx`, `register/page.tsx`
* **`(platform)/`**:
  - `page.tsx`: Home discovery dashboard.
  - `stream/[id]/page.tsx`: Live stream viewing experience with video player, live chat, and gift modal.
  - `go-live/page.tsx`: Broadcaster setup page.
  - `studio/page.tsx`: Creator Live Studio control panel.
  - `explore/page.tsx`: Category and trending creator discovery.
  - `following/page.tsx`: Following creator stream feed.
  - `wallet/page.tsx`: User wallet balances, top-up modal, and redemption history.
  - `profile/[id]/page.tsx`: User profile page.
  - `notifications/page.tsx`: User notifications feed.
  - `settings/page.tsx`: Account settings page.
* **`admin/`**:
  - `admin/page.tsx`: Admin overview dashboard.
  - `admin/users/page.tsx`: Admin user management table.
  - `admin/streams/page.tsx`: Admin stream monitoring table.
  - `admin/reports/page.tsx`: Admin violation report review table.

### Libraries & Hooks (`/client/lib` & `/client/hooks`)
* [lib/api/axios-client.ts](file:///g:/zylo/client/lib/api/axios-client.ts): Axios instance configuration with automatic JWT header injection and cookie refresh interceptors.
* [lib/api/index.ts](file:///g:/zylo/client/lib/api/index.ts): Complete API client functions (`authApi`, `usersApi`, `streamsApi`, `walletApi`, `giftApi`, `adminApi`, `mediaApi`, `notificationsApi`).
* [lib/socket/index.ts](file:///g:/zylo/client/lib/socket/index.ts): RealtimeSocketClient singleton wrapping `socket.io-client`.
* [lib/types.ts](file:///g:/zylo/client/lib/types.ts): TypeScript interfaces for streams, users, chat messages, gifts, transactions, notifications, and admin data.
