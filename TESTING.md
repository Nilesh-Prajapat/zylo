# Zylo — Automated Testing Audit & Specifications

This document audits the test infrastructure, automated test cases, assessment requirement compliance, and missing test coverage in the Zylo project.

---

## 1. Test Framework Setup

* **Test Runner**: Jest v29.7 (`backend/jest.config.js`)
* **HTTP Assertion Engine**: Supertest v7.0
* **TypeScript Support**: `ts-jest` v29.2
* **Test Suite File**: `backend/src/__tests__/api.test.ts`
* **Test Command**: `npm test` (executes `jest --forceExit --detectOpenHandles`)

---

## 2. Existing Test Inventory

The existing integration test suite in `backend/src/__tests__/api.test.ts` contains **8 test suites** with 12 distinct test cases:

| Suite # | Test Name | Target Route | Assertion |
| :--- | :--- | :--- | :--- |
| **1** | Service Health Check | `GET /health` | Returns 200/503 status, checks DB and Redis status |
| **2** | Swagger UI Availability | `GET /api/v1/docs/` | Returns 200/301 status |
| **3.1** | Register Normal User | `POST /api/v1/auth/register` | Asserts 201 status & returns access token |
| **3.2** | Register Creator User | `POST /api/v1/auth/register` | Asserts 201 status & switches role to `CREATOR` |
| **4.1** | Role Switch Security Guard | `POST /api/v1/users/me/role/switch` | Rejects switching to `ADMIN` (403 Forbidden) |
| **4.2** | Create Stream RBAC Guard | `POST /api/v1/streams` | Rejects `NORMAL_USER` from creating stream (403 Forbidden) |
| **5.1** | Create Scheduled Stream | `POST /api/v1/streams` | Asserts 201 status & stream status `SCHEDULED` |
| **5.2** | Start Live Stream | `POST /api/v1/streams/:id/start` | Asserts 200 status & transitions status to `LIVE` |
| **5.3** | Get Stream Details | `GET /api/v1/streams/:id` | Returns stream details and broadcaster info |
| **6.1** | Follow Creator | `POST /api/v1/users/:id/follow` | Asserts 201 status & `following: true` |
| **6.2** | Duplicate Follow Guard | `POST /api/v1/users/:id/follow` | Rejects duplicate follow with 409 Conflict |
| **6.3** | Self-Follow Guard | `POST /api/v1/users/:id/follow` | Rejects self-follow with 400 Bad Request |
| **6.4** | Unfollow Creator | `DELETE /api/v1/users/:id/follow` | Asserts 200 status & `following: false` |
| **7.1** | Trending Creators Query | `GET /api/v1/users/trending` | Returns active creators excluding normal users |
| **8.1** | End Live Stream | `POST /api/v1/streams/:id/end` | Asserts 200 status & transitions status to `ENDED` |

---

## 3. Assessment Requirement Compliance Audit

The technical assessment specification mandates at least **10 automated tests** covering key functional areas. Here is the exact compliance analysis:

| Requirement Area | Expected Test | Implemented? | Status | Evidence / File Path |
| :--- | :--- | :---: | :--- | :--- |
| **User Registration** | Valid registration | Yes | **COMPLETE** | `api.test.ts:34` |
| **User Login** | Valid login & Token issue | Partial | **PARTIAL** | Tested implicitly during registration |
| **Invalid Login** | Reject bad credentials | No | **MISSING** | Needs explicit test case |
| **Unauthorized API** | Reject unauthenticated request | Yes | **COMPLETE** | `api.test.ts:91` |
| **Create Stream** | Create scheduled stream | Yes | **COMPLETE** | `api.test.ts:104` |
| **Join Stream** | Register viewer join | Yes | **COMPLETE** | `api.test.ts:128` |
| **End Stream** | End active live stream | Yes | **COMPLETE** | `api.test.ts:188` |
| **Unauthorized Stream End**| Reject unauthorized termination | Yes | **COMPLETE** | `api.test.ts:91` |
| **Chat Send/Receive** | Validate chat message flow | No | **MISSING** | Real-time socket test missing |
| **Unauthorized Chat** | Muted/banned chat rejection | No | **MISSING** | Moderation chat rejection missing |
| **Send Gift** | Valid gift transaction | No | **MISSING** | Gift endpoint test missing |
| **Insufficient Balance** | Reject gift when balance low | No | **MISSING** | Wallet balance check missing |
| **Invalid Gift** | Reject non-existent gift | No | **MISSING** | Gift lookup validation missing |
| **Duplicate Transaction** | Idempotency key protection | No | **MISSING** | Gift idempotency check missing |

---

## 4. Recommended Additional Automated Tests

To achieve 100% test coverage for critical financial and real-time operations, add the following test blocks to `backend/src/__tests__/api.test.ts`:

1. **`POST /api/v1/gifts/streams/:id`**: Test sending a valid gift with sufficient balance.
2. **`POST /api/v1/gifts/streams/:id` (Insufficient Balance)**: Verify `400 INSUFFICIENT_BALANCE` response when `purchasedCoins < totalPrice`.
3. **`POST /api/v1/gifts/streams/:id` (Idempotency)**: Send identical `idempotencyKey` twice and verify second call returns `200 OK` with original transaction without debiting balance twice.
4. **`POST /api/v1/wallet/topup/verify` (HMAC Verification)**: Verify invalid signature rejection (`400 Bad Request`).
