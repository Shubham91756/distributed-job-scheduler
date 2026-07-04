# 07. Deployment Guide

The Distributed Job Scheduler is engineered to be deployed via Docker, eliminating environment disparities between development and production.

## Prerequisites
- Server with at least 2GB RAM / 2 vCPUs.
- Docker & Docker Compose installed.
- Domain name (if serving Frontend UI publicly).

## Environment Variables
Before deploying, initialize the `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/job_scheduler?schema=public"
JWT_SECRET="your_production_secret"
REFRESH_TOKEN_SECRET="your_production_refresh_secret"
NODE_ENV="production"
PORT=3000
WORKER_CONCURRENCY=10
```

## Database Setup & Prisma Migration
The orchestration automatically spins up a PostgreSQL container. However, the database schema must be applied.

During the CI/CD phase (via GitHub Actions), or manually, run:
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
```
*Note: This relies on `DATABASE_URL` pointing to the live instance.*

## Docker Compose
The `docker-compose.prod.yml` encapsulates the entire architecture:

### 1. Backend Deployment
- Uses the `/backend/Dockerfile`.
- Binds to port `3000`.
- Includes health checks (`/health/live`).
- Restart policy: `always`.

### 2. Worker Deployment
- Uses the `/worker/Dockerfile`.
- Does not expose ports (polls the database directly).
- Automatically retrieves `WORKER_CONCURRENCY` from environment.

### 3. Scheduler Deployment
- Uses the `/scheduler/Dockerfile`.
- Acts as the cron chronometer without exposing ports.

### 4. Frontend Deployment & Nginx
- Uses the `/frontend/Dockerfile`.
- Compiles the React SPA using Vite (`npm run build`).
- Nginx serves the static assets and acts as a reverse proxy routing `/api/` traffic to the backend container.

## Production Deployment Execution
Navigate to the root directory on your host machine:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Monitor logs for system health:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```
