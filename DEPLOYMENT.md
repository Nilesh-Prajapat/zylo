# Zylo — Production Deployment & DevOps Specifications

This document details the exact production deployment architecture, Vercel frontend hosting, AWS EC2 backend server setup, Nginx reverse proxy configuration, PM2 process management, LiveKit Cloud setup, and Neon PostgreSQL database configuration for Zylo.

---

## 1. Production Architecture Overview

Zylo is deployed across a cloud infrastructure optimized for low latency, high availability, and separation of concerns:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND HOSTING                                 │
│          Vercel (Next.js 13 App Router, Global Edge Network, CDN)           │
└──────────────────────┬──────────────────────────────┬───────────────────────┘
                       │                              │
          HTTP / REST  │                              │ LiveKit WebRTC Token
          Requests     │                              │ & SFU Connection
                       ▼                              ▼
┌──────────────────────────────────────┐     ┌────────────────────────────────┐
│         BACKEND INFRASTRUCTURE       │     │     LIVEKIT CLOUD PLATFORM     │
│   AWS EC2 Instance (Ubuntu 26.04 LTS)  │     │ (LiveKit WebRTC SFU Server,    │
│   Nginx Reverse Proxy + SSL          │     │  Egress Recording Engine)      │
│   PM2 Cluster (Node.js & Express)    │     └───────────────┬────────────────┘
└──────────────────┬───────────────────┘                     │
                   │                                         │ Egress Webhook
                   ├─────────────────────────────────────────┘ & Recording Export
                   │
        ┌──────────┴───────────┬──────────────────────┬──────────────────────┐
        ▼                      ▼                      ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ DATABASE (DB) │      │ REDIS CLUSTER │      │ CLOUD STORAGE │      │   PAYMENTS    │
│ Neon Serverless│     │ Redis Cloud / │      │ Cloudflare R2 │      │ Razorpay INR  │
│ PostgreSQL    │      │ Upstash       │      │ & Cloudinary  │      │ Gateway       │
└───────────────┘      └───────────────┘      └───────────────┘      └───────────────┘
```

---

## 2. Component Deployment Guides

### A. Frontend Deployment — Vercel

The Next.js 13 frontend (`/client`) is deployed directly to **Vercel**.

1. **Vercel Project Setup**:
   - Framework Preset: Next.js
   - Root Directory: `client`
   - Build Command: `next build`
   - Output Directory: `.next`

2. **Environment Variables on Vercel**:
   - `NEXT_PUBLIC_API_URL`: `https://api.zylo.rocks/api/v1` (AWS EC2 backend URL)
   - `NEXT_PUBLIC_SOCKET_URL`: `https://api.zylo.rocks` (AWS EC2 Socket.IO URL)
   - `NEXT_PUBLIC_LIVEKIT_URL`: `wss://zylo-livekit.livekit.cloud` (LiveKit Cloud WebSocket URL)

3. **Vercel Routing Configuration (`client/vercel.json` & root `vercel.json`)**:
   ```json
   {
     "framework": "nextjs",
     "cleanUrls": true
   }
   ```

---

### B. Backend Deployment — AWS EC2 + Nginx + PM2

The Node.js Express & Socket.IO backend (`/backend`) is hosted on an **AWS EC2 instance** (t3.medium or t3.large, Ubuntu 26.04 LTS).

#### 1. EC2 Server Provisioning & Setup:
```bash
# SSH into AWS EC2 instance
ssh -i zylo.pem ubuntu@ec2-xx-xx-xx-xx.compute-1.amazonaws.com

# Update packages and install Node.js 20 & Nginx
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Code Deployment & PM2 Cluster Configuration (`backend/ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [
    {
      name: 'zylo-backend',
      script: 'dist/app/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
```

#### Build & Start Commands on AWS EC2:
```bash
cd /var/www/zylo/backend
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### 3. Nginx Reverse Proxy & SSL Setup (`backend/nginx.conf.template`):

Nginx acts as the reverse proxy on port 80/443, proxying HTTP traffic and upgrading WebSocket connections for Socket.IO.

```nginx
server {
    listen 80;
    server_name api.zylo.rocks;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.zylo.rocks;

    ssl_certificate /etc/letsencrypt/live/api.zylo.rocks/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.zylo.rocks/privkey.pem;

    # REST API Endpoints Proxy
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO Real-time WebSockets Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable Nginx site and obtain SSL via Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/zylo /etc/nginx/sites-enabled/
sudo snap install --classic certbot
sudo certbot --nginx -d api.zylo.rocks
sudo systemctl reload nginx
```

---

### C. Live Streaming Infrastructure — LiveKit Cloud

Zylo leverages **LiveKit Cloud** as a managed WebRTC SFU platform.

1. **LiveKit Cloud Project Setup**:
   - Account: LiveKit Cloud (`https://cloud.livekit.io`)
   - WebRTC Server URL: `wss://zylo-livekit.livekit.cloud`
   - Key & Secret: Generated in LiveKit Cloud project settings and added to AWS EC2 backend `.env`.

2. **LiveKit Egress & Webhook Configuration**:
   - Egress Recording target: Cloudflare R2 Bucket / AWS S3 (`zylo-recordings`).
   - Webhook URL configured in LiveKit Cloud Console: `https://api.zylo.rocks/api/v1/webhooks/livekit`.
   - When egress finishes recording, LiveKit Cloud posts a webhook event to AWS EC2, updating the stream in Neon PostgreSQL with `recordingStatus = READY` and `replayUrl`.

---

### D. Database Infrastructure — Neon Serverless PostgreSQL

Zylo uses **Neon** (`https://neon.tech`) for cloud serverless PostgreSQL database storage.

1. **Configuration (`backend/prisma/schema.prisma`)**:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_DATABASE_URL")
   }
   ```
2. **Migration & Deployment Commands**:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

---

## 3. Production Environment Variables Specification

| Variable | Target Platform | Purpose | Example Value | Secret? |
| :--- | :--- | :--- | :--- | :---: |
| `NODE_ENV` | AWS EC2 / Vercel | Environment mode | `production` | No |
| `PORT` | AWS EC2 | Backend Express port | `4000` | No |
| `DATABASE_URL` | AWS EC2 | Neon Pooled DB URL | `postgresql://user:pass@ep-xx.neon.tech/zylo_db?sslmode=require` | **Yes** |
| `DIRECT_DATABASE_URL` | AWS EC2 | Neon Direct DB URL | `postgresql://user:pass@ep-xx.neon.tech/zylo_db?sslmode=require` | **Yes** |
| `REDIS_URL` | AWS EC2 | Redis Cloud connection | `redis://default:pass@redis-12345.upstash.io:6379` | **Yes** |
| `JWT_ACCESS_SECRET` | AWS EC2 | JWT Access Token Secret | `super-secret-access-key-32-chars-min` | **Yes** |
| `JWT_REFRESH_SECRET` | AWS EC2 | JWT Refresh Token Secret | `super-secret-refresh-key-32-chars-min` | **Yes** |
| `LIVEKIT_API_KEY` | AWS EC2 | LiveKit Cloud API Key | `APIxxxxxxxxx` | **Yes** |
| `LIVEKIT_API_SECRET` | AWS EC2 | LiveKit Cloud Secret | `secretxxxxxxxxx` | **Yes** |
| `LIVEKIT_URL` | AWS EC2 & Vercel | LiveKit Cloud WS URL | `wss://zylo-livekit.livekit.cloud` | No |
| `RAZORPAY_KEY_ID` | AWS EC2 & Vercel | Razorpay Key ID | `rzp_live_xxxxxx` | No |
| `RAZORPAY_KEY_SECRET` | AWS EC2 | Razorpay Secret | `rzp_secret_xxxxxx` | **Yes** |
| `CLOUDINARY_CLOUD_NAME`| AWS EC2 | Cloudinary Cloud Name | `zylo-cloud` | No |
| `CLOUDINARY_API_KEY` | AWS EC2 | Cloudinary API Key | `1234567890` | No |
| `CLOUDINARY_API_SECRET`| AWS EC2 | Cloudinary API Secret | `cloudinary_secret` | **Yes** |
| `R2_ACCOUNT_ID` | AWS EC2 | Cloudflare R2 ID | `cf_account_id` | No |
| `R2_ACCESS_KEY_ID` | AWS EC2 | Cloudflare R2 Access Key | `r2_access_key` | **Yes** |
| `R2_SECRET_ACCESS_KEY`| AWS EC2 | Cloudflare R2 Secret | `r2_secret_key` | **Yes** |
| `CORS_ORIGINS` | AWS EC2 | Allowed CORS Domain | `https://zylo.rocks,https://zylo.vercel.app` | No |
| `FRONTEND_URL` | AWS EC2 | Vercel Frontend Domain | `https://zylo.rocks` | No |

---

## 4. Production Health Check & Monitoring

* **Health Check Endpoint**: `GET https://api.zylo.rocks/health`
* **Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-24T08:50:00.000Z",
  "service": "zylo-api",
  "database": "connected",
  "redis": "connected"
}
```
