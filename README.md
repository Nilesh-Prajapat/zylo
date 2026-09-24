# Zylo — Live Bolder (Live Streaming & Creator Platform)

Zylo is a modern, high-performance live streaming platform built with Next.js 13, Express, TypeScript, LiveKit Cloud WebRTC, Socket.IO, Neon PostgreSQL (Prisma), Redis, Razorpay, and Cloudflare R2 / AWS S3 storage.

---

## 🚀 Key Features

* **Live Streaming & Realtime WebRTC**: Broadcaster studio powered by LiveKit Cloud for low-latency sub-second streaming and high-definition video publishing.
* **Production Infrastructure**:
  * **Frontend**: Next.js App Router deployed on **Vercel**.
  * **Backend**: Express API & Socket.IO server hosted on **AWS EC2 (Ubuntu 26.04 LTS)** behind an **Nginx** reverse proxy with SSL.
  * **Database**: Serverless **Neon PostgreSQL** with Prisma ORM.
  * **Media Storage**: Cloudflare R2 / AWS S3 for stream recordings and Cloudinary for image asset uploads.
* **Realtime Chat & Moderation**: Low-latency Socket.IO chat rooms with live viewer counting, chat rate limiting, mutes, temporary bans, and permanent bans.
* **Virtual Gift Economy & Dual-Wallet System**: Atomic coin transactions supporting both **Purchased Coins** and **Creator Earnings** with row-level database locking (`SELECT ... FOR UPDATE`), idempotency keys, and real-time gift animations.
* **Razorpay Top-Up Integration**: Automated INR-to-coin top-up order generation and HMAC SHA256 signature verification.
* **Social Graph & Discovery**: Follow/unfollow system, creator profile customization, category browsing, and live stream discovery feeds.
* **Cloud Egress & VOD Replay**: LiveKit Cloud egress webhooks for automated recording processing and delivery via Cloudflare R2 / S3 bucket.
* **Admin Dashboard & RBAC**: Dedicated administrative control panel to manage users, suspend/ban accounts, review user reports, and forcefully terminate live streams.
* **Swagger API Documentation**: Interactive OpenAPI 3.0 specifications served at `/api/v1/docs`.

---

## 🛠 Technology Stack & Infrastructure

### Frontend (`/client`) — Deployed on **Vercel**
* **Framework**: Next.js 13.5 (App Router with `(auth)`, `(platform)`, and `admin` route groups)
* **UI & Styling**: React 18, Tailwind CSS 3.3, Radix UI Primitives, Lucide Icons, Recharts, Sonner Toasts
* **State & Data Fetching**: TanStack React Query v5, Axios API Client
* **Real-time & Media**: Socket.IO Client 4.8, `@livekit/components-react` 2.9, LiveKit Client SDK

### Backend (`/backend`) — Hosted on **AWS EC2 (Ubuntu 26.04 LTS) + Nginx**
* **Runtime & API Framework**: Node.js, Express v4.19, TypeScript 5.5, PM2 Process Manager
* **Database & ORM**: Neon PostgreSQL (Serverless), Prisma ORM v5.19
* **Authentication & Hashing**: JWT (Access Tokens + Refresh Token Family Rotation), Argon2id password hashing
* **Real-time Layer**: Socket.IO v4.7 (Redis adapter compatible)
* **Caching & Presence**: Redis (ioredis v5.4)
* **Media & Cloud Providers**: **LiveKit Cloud** (WebRTC SFU), Cloudflare R2 / AWS S3 (`@aws-sdk/client-s3`), Cloudinary SDK v2.4, Razorpay Payments SDK

---

## 📁 Repository Directory Structure

```text
zylo/
├── backend/                  # Node.js & Express TypeScript API Server (AWS EC2 + Nginx)
│   ├── prisma/               # Prisma Database Schema & Seed Scripts
│   │   ├── schema.prisma     # Neon PostgreSQL database schema
│   │   └── seed.ts           # Realistic creator and stream seed script
│   ├── src/
│   │   ├── app/              # Express app setup, router registry, Swagger specs
│   │   ├── common/           # Middleware, AppError class, Winston logger
│   │   ├── config/           # Environment variable validation (Zod)
│   │   ├── infrastructure/   # Database (Neon), Redis, S3/R2, Cloudinary, Razorpay, LiveKit Cloud
│   │   ├── modules/          # Auth, Users, Streams, Moderation, Wallet, Admin, etc.
│   │   ├── realtime/         # Socket.IO connection handlers & room state management
│   │   └── __tests__/        # Supertest & Jest integration test suite
│   ├── ecosystem.config.cjs   # PM2 Cluster Process Configuration for EC2
│   └── nginx.conf.template    # Nginx reverse proxy & SSL configuration template
├── client/                   # Next.js 13 Frontend Web Application (Vercel)
│   ├── app/                  # App Router pages ((auth), (platform), admin)
│   ├── components/           # Reusable UI components (stream, studio, wallet, admin)
│   ├── hooks/                # Custom React hooks (useAuth, useSocket, useStream)
│   └── lib/                  # Axios client, Socket.IO client singleton, type definitions
├── vercel.json               # Vercel deployment routing configuration
└── docs/                     # Product requirement documents & specifications
```

---

## 🔧 Prerequisites

* **Node.js**: `v18.x` or `v20.x`
* **Database**: Neon PostgreSQL instance (`DATABASE_URL` & `DIRECT_DATABASE_URL`)
* **Redis**: `v6+` (Redis Cloud / Upstash / AWS ElastiCache)
* **LiveKit**: LiveKit Cloud project credentials (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`)

---

## ⚡ Local & Production Development Setup

### 1. Backend Setup (AWS EC2 Target)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Push schema to Neon PostgreSQL
npm run db:push

# Seed database with initial creators, gifts, and streams
npm run db:seed

# Start backend development server
npm run dev
```

The API server will run locally at `http://localhost:4000` (or `http://localhost:5000` based on `PORT`).
Interactive Swagger API documentation is available at `http://localhost:4000/api/v1/docs`.

### 2. Frontend Setup (Vercel Target)

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend will run locally at `http://localhost:3000`.

---

## 🧪 Testing

To execute the backend integration test suite:

```bash
cd backend
npm test
```

---

## 🌐 Documentation Suite

For detailed engineering specifications, refer to the following documentation files in the project root:

* 📐 [ARCHITECTURE.md](file:///g:/zylo/ARCHITECTURE.md) — System Architecture, Request Flows & LiveKit Cloud Pipeline
* 🔌 [API.md](file:///g:/zylo/API.md) — Complete REST API Inventory & Specifications
* ⚡ [WEBSOCKET.md](file:///g:/zylo/WEBSOCKET.md) — Socket.IO Real-time Events Specification
* 🗄️ [DATABASE.md](file:///g:/zylo/DATABASE.md) — Neon Database Schema, ER Diagram & Transaction Model
* 🔒 [SECURITY.md](file:///g:/zylo/SECURITY.md) — Threat Model & Security Audit Findings
* 🧪 [TESTING.md](file:///g:/zylo/TESTING.md) — Test Suite Audit & Gap Analysis
* 🚀 [DEPLOYMENT.md](file:///g:/zylo/DEPLOYMENT.md) — Vercel, AWS EC2, Nginx & LiveKit Cloud Deployment Guide
* 📁 [PROJECT_STRUCTURE.md](file:///g:/zylo/PROJECT_STRUCTURE.md) — Directory & File Mapping Guide
* 🧠 [TECHNICAL_DECISIONS.md](file:///g:/zylo/TECHNICAL_DECISIONS.md) — Architectural Decision Records (ADRs)
* 🔄 [DATA_FLOWS.md](file:///g:/zylo/DATA_FLOWS.md) — End-to-End Request Traceability Guide
* 🛠️ [OPERATIONS.md](file:///g:/zylo/OPERATIONS.md) — Operational Runbook & Maintenance Guide
* 📊 [PROJECT_AUDIT.md](file:///g:/zylo/PROJECT_AUDIT.md) — Forensic Audit & Compliance Report
