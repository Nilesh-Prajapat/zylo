# Zylo — Security Audit & Threat Model

This document outlines the security architecture, threat model, authorization controls, and forensic security audit findings for the Zylo platform.

---

## 1. Authentication & Token Hardening

* **Password Storage**: Argon2id algorithm (65MB memory cost, 3 iterations, 4 parallelism). Resistant to GPU/ASIC brute-force attacks.
* **Access Tokens**: Short-lived JWTs (15-minute expiration) signed via `JWT_ACCESS_SECRET`.
* **Refresh Token Rotation**: Opaque 64-character UUID refresh tokens stored as SHA256 hashes in `refresh_tokens`. Uses token family tracking (`family` UUID) to detect reuse attacks. If an expired or re-used token is submitted, the entire token family is invalidated immediately.
* **Cookie Security**: Refresh tokens are delivered via HttpOnly, SameSite (`strict` in production, `lax` in development) cookies.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | `NORMAL_USER` | `CREATOR` | `ADMIN` |
| :--- | :---: | :---: | :---: |
| Register / Login / Refresh | Allowed | Allowed | Allowed |
| Switch Role (`NORMAL_USER` ↔ `CREATOR`) | Allowed | Allowed | **Blocked** (Forbidden via API) |
| Create Live Stream (`POST /api/v1/streams`) | Denied (403) | **Allowed** | Denied (403) |
| Start Stream (`POST /api/v1/streams/:id/start`) | Denied | **Owner Only** | Denied |
| Modify Stream Settings | Denied | **Owner Only** | **Allowed** |
| End Stream (`POST /api/v1/streams/:id/end`) | Denied | **Owner Only** | **Allowed** |
| Send Chat Message (`chat:send`) | Allowed | Allowed | Allowed |
| Moderation Mute / Ban / Remove | Denied | **Owner Only** | **Allowed** |
| Send Virtual Gift | Allowed | Allowed | Allowed |
| Admin Dashboard APIs (`/api/v1/admin/*`) | Denied (403) | Denied (403) | **Allowed** |

---

## 3. Forensic Security Vulnerability Audit

Findings are classified according to severity:

### 🚨 CRITICAL SEVERITY

#### Finding 1: Rate Limiting Middleware is Stubbed (No-Op)
* **Location**: `backend/src/common/middleware/index.ts` (lines 230-234)
* **Problem**: `rateLimitMiddleware` returns `(_req, _res, next) => next()` without executing any rate-limiting checks.
* **Impact**: Vulnerable to brute-force authentication attacks on `/api/v1/auth/login`, API flooding, and resource exhaustion.
* **Recommended Fix**: Implement actual `express-rate-limit` with Redis store (`rate-limit-redis`).

---

### ⚠️ HIGH SEVERITY

#### Finding 2: Unauthenticated Socket.IO Connection Catch-All
* **Location**: `backend/src/realtime/socket.ts` (lines 60-63)
* **Problem**: When JWT verification fails in Socket.IO handshake middleware, the error is swallowed and `socket.userId = undefined` is set instead of rejecting the handshake.
* **Impact**: Unauthenticated guests can establish websocket connections, join stream rooms, and consume memory.
* **Recommended Fix**: Reject unauthenticated websocket handshakes for protected events or restrict guest connections to read-only room subscription.

---

### 🟡 MEDIUM SEVERITY

#### Finding 3: Permissive CORS Regex Matching in Development/Staging
* **Location**: `backend/src/app/app.ts` (lines 43-51)
* **Problem**: CORS configuration allows any origin ending with `.vercel.app` or starting with `http://localhost:`.
* **Impact**: Potential cross-origin request forgery or unauthorized API consumption from untrusted Vercel deployments.
* **Recommended Fix**: Enforce strict domain whitelisting via `CORS_ORIGINS` environment variable in production environments.

---

### ℹ️ LOW / INFO SEVERITY

#### Finding 4: Inconsistent Exception Message Exposure in Non-Production
* **Location**: `backend/src/common/middleware/index.ts` (line 210)
* **Problem**: Unhandled 500 errors output raw error message strings when `NODE_ENV !== 'production'`.
* **Impact**: Risk of stack trace or internal database column leakage in development environments.
* **Recommended Fix**: Standardize generic error responses even in non-production test runs.
