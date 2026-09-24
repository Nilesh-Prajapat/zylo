# Zylo — Operational Runbook & Maintenance Guide

This runbook provides step-by-step instructions for starting, maintaining, troubleshooting, and recovering Zylo services in development and production.

---

## 1. Daily Operations & Service Commands

### Service Control Commands

| Task | Location | Command |
| :--- | :--- | :--- |
| **Start Dev Backend** | `backend/` | `npm run dev` |
| **Start Dev Client** | `client/` | `npm run dev` |
| **Build Production Backend**| `backend/` | `npm run build` |
| **Start PM2 Backend** | `backend/` | `pm2 start ecosystem.config.cjs` |
| **Start Docker Compose** | Root | `docker-compose up -d --build` |
| **Stop Docker Compose** | Root | `docker-compose down` |
| **Execute Tests** | `backend/` | `npm test` |
| **Typecheck Backend** | `backend/` | `npm run typecheck` |
| **Typecheck Client** | `client/` | `npm run typecheck` |

---

## 2. Database Maintenance Commands

### Prisma Database Management Commands (`backend/`)

```bash
# Generate Prisma Client after schema modification
npm run db:generate

# Push schema directly to database (development)
npm run db:push

# Create and apply SQL migration files (production)
npm run db:migrate

# Seed database with creator profiles, categories, gifts, and streams
npm run db:seed

# Launch interactive Prisma Studio GUI
npm run db:studio
```

---

## 3. Redis Maintenance & Cache Management Commands

### Redis CLI Inspection

```bash
# Connect to Redis container / instance
redis-cli -h localhost -p 6379

# Check server ping
127.0.0.1:6379> PING
PONG

# View active stream viewers
127.0.0.1:6379> SMEMBERS stream:stream_123:viewers

# View total live streams cache
127.0.0.1:6379> GET streams:live

# Clear all cached live stream feeds
127.0.0.1:6379> DEL streams:live streams:upcoming streams:discover

# Flush entire Redis cache (emergency only)
127.0.0.1:6379> FLUSHALL
```

---

## 4. Log Inspection & Troubleshooting Runbook

### Log Viewing Procedures

#### PM2 Logs (Production):
```bash
pm2 logs zylo-backend --lines 100
```

#### Docker Logs:
```bash
docker-compose logs -f --tail=100 backend
```

---

## 5. Common Operational Failures & Resolution Steps

### Issue 1: Database Connection Failure (`503 Service Unavailable`)
* **Symptom**: `GET /health` returns `503` with `database: "disconnected"`.
* **Cause**: PostgreSQL instance is down, credentials in `DATABASE_URL` are incorrect, or connection pool is exhausted.
* **Resolution**:
  1. Check PostgreSQL process: `docker-compose ps postgres` or `systemctl status postgresql`.
  2. Verify database connection string (excluding credentials).
  3. Inspect PostgreSQL logs for max connections error.

### Issue 2: LiveKit Stream Token Failure
* **Symptom**: Broadcaster or viewer cannot join live stream room (`Failed to create LiveKit room`).
* **Cause**: `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` mismatch or LiveKit SFU server unreachable.
* **Resolution**:
  1. Verify LiveKit server health: `curl -I https://<LIVEKIT_URL>`.
  2. Confirm `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` match between backend `.env` and LiveKit SFU configuration.

### Issue 3: Stale Live Streams Stuck in `LIVE` Status
* **Symptom**: Stream remains in `LIVE` status after broadcaster closes browser without clicking "End Stream".
* **Cause**: Disconnect socket cleanup did not fire or LiveKit egress failed.
* **Resolution**:
  1. Log into Admin Panel at `/admin/streams`.
  2. Click "End Stream" to invoke `POST /api/v1/admin/streams/:id/end` to forcefully set status to `ENDED` and flush Redis viewer keys.
