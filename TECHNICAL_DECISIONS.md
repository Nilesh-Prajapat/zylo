# Zylo — Architectural Decision Records (ADRs)

This document records the major technology, infrastructure, and design decisions made in the Zylo platform architecture.

---

## ADR 001: Selection of Neon PostgreSQL & Prisma ORM

* **Status**: Accepted
* **Context**: Need a scalable, serverless-compatible relational database layer capable of enforcing strict schema constraints, foreign key relationships, transactional integrity for financial operations, and supporting Neon PostgreSQL serverless pooling.
* **Decision**: Use Neon PostgreSQL with Prisma ORM v5.19 (`@prisma/client`, `@prisma/adapter-pg`, `@neon/config`, `@neon/env`).
* **Consequences**:
  - Positive: Type-safe database queries synchronized with TypeScript interfaces. Serverless branching and auto-scaling database connections. Native support for raw SQL transactions (`$queryRawUnsafe`) for `FOR UPDATE` row locking.
  - Trade-off: Schema changes require running `prisma generate` and migration scripts.

---

## ADR 002: Managed LiveKit Cloud for WebRTC Live Streaming & Egress Recording

* **Status**: Accepted
* **Context**: Low-latency sub-second live streaming requires a high-performance SFU (Selective Forwarding Unit) WebRTC architecture rather than HLS/RTMP latency (which typically introduces 5-15s delay). Managing self-hosted WebRTC servers across global regions creates significant operational overhead.
* **Decision**: Integrate **LiveKit Cloud** (`livekit-server-sdk`) for managed WebRTC video/audio routing and automated egress recording to Cloudflare R2 / AWS S3.
* **Consequences**:
  - Positive: Sub-second global WebRTC latency without managing TURN/STUN infrastructure. Native browser publisher/subscriber React hooks (`@livekit/components-react`). Automated egress recording webhooks directly to Cloudflare R2.
  - Trade-off: Pay-as-you-go usage model based on bandwidth and egress hours.

---

## ADR 003: Frontend Deployment on Vercel & Backend Hosting on AWS EC2 + Nginx

* **Status**: Accepted
* **Context**: The client application is built on Next.js 13 App Router requiring server-side rendering (SSR) and global edge CDN caching. The Express & Socket.IO backend requires a persistent server instance with custom Nginx reverse proxy configuration for WebSockets and SSL termination.
* **Decision**: Deploy Next.js frontend to **Vercel** edge network and host Express API + Socket.IO server on an **AWS EC2** instance running PM2 cluster mode behind an **Nginx** reverse proxy.
* **Consequences**:
  - Positive: Vercel provides instant global deployment and edge rendering for Next.js. AWS EC2 with Nginx guarantees persistent, low-latency WebSocket connections for Socket.IO without serverless WebSocket timeout restrictions.

---

## ADR 004: Socket.IO for Real-Time Chat & State Synchronisation

* **Status**: Accepted
* **Context**: Real-time stream chat, live viewer counting, gift animations, and moderation mutes/bans require bidirectional event-driven communication with fallback support.
* **Decision**: Use Socket.IO v4.7 on Node.js HTTP server.
* **Consequences**:
  - Positive: Automatic reconnects, fallback to HTTP long-polling, built-in room topic management (`stream:<id>`, `user:<id>`), easy multi-node scaling via Redis Adapter (`@socket.io/redis-adapter`).

---

## ADR 005: Dual-Balance Virtual Wallet with Row-Level `FOR UPDATE` Locking

* **Status**: Accepted
* **Context**: The platform features a virtual gift economy where users buy coins and creators earn revenue. Race conditions (e.g. rapid double-clicking gift button) could cause negative wallet balances or double-crediting.
* **Decision**: Implement a two-balance model (`purchasedCoins` + `creatorEarnings`) in the `wallets` table. Execute gift transactions inside interactive Prisma transactions (`prisma.$transaction`) with explicit `SELECT ... FOR UPDATE` row locks and mandatory `idempotencyKey` uniqueness.
* **Consequences**:
  - Positive: Guarantees 100% atomic transaction safety. Prevents race conditions and double-spending. Supports audit logging via `wallet_transactions` and `gift_transactions`.

---

## ADR 006: Argon2id Password Hashing & Refresh Token Family Rotation

* **Status**: Accepted
* **Context**: Need secure user authentication resistant to GPU cracking and token theft.
* **Decision**: Hash passwords using Argon2id (`argon2` package, memoryCost: 65MB). Issue 15-minute JWT access tokens and 7-day UUID refresh tokens stored as SHA256 hashes in PostgreSQL with family tracking (`family` UUID).
* **Consequences**:
  - Positive: Meets state-of-the-art cryptographic standards. Token family tracking detects token theft or reuse attacks and automatically revokes all active sessions for that user family.
