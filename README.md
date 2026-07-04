# Distributed Job Scheduler

## Project Overview
The Distributed Job Scheduler is an enterprise-grade, highly concurrent background job orchestration platform. It is designed to manage asynchronous workloads across distributed worker nodes while maintaining strict atomicity, robust failure recovery, and real-time observability.

## Features
- **Atomic Job Claiming:** Utilizes PostgreSQL `FOR UPDATE SKIP LOCKED` to prevent race conditions across parallel worker nodes.
- **Advanced Scheduling:** Supports immediate, delayed, recurring, and cron-based execution patterns.
- **Intelligent Retry Engine:** Built-in support for linear and exponential backoff strategies with randomized jitter to prevent thundering herds.
- **Dead Letter Queue (DLQ):** Isolates permanently failed jobs for manual intervention and operational analysis.
- **Batch Processing:** Allows for atomic queuing and synchronized tracking of thousands of sub-jobs as a unified batch.
- **Worker Telemetry:** Heartbeat-driven lease management ensures stranded jobs are automatically recovered if a worker container crashes.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Frontend:** React, Vite, TailwindCSS (Vanilla UI styling)
- **Workers:** Independent Node.js polling daemons
- **Testing:** Vitest

## Architecture
The system employs a multi-service architecture utilizing a centralized PostgreSQL state machine.

*See [02_System_Architecture.md](docs/02_System_Architecture.md) for the detailed Mermaid diagram.*

## Folder Structure
```text
├── backend/            # Express API serving HTTP requests
├── database/           # Prisma schema and migrations
├── docs/               # Technical engineering documentation
├── frontend/           # React dashboard UI
├── scheduler/          # Cron execution and job promotion daemon
└── worker/             # Background job polling and execution engine
```

## Prerequisites
- Node.js v20+
- PostgreSQL v15+
- Docker & Docker Compose (for production deployments)

## Installation
1. Clone the repository.
2. Install dependencies across all workspaces:
```bash
npm install
```
3. Generate the Prisma Client:
```bash
npx prisma generate
```

## Environment Variables
The repository contains `.env.example` files in the `backend`, `frontend`, `worker`, and `scheduler` directories.
DO NOT COMMIT SECRETS. You must create `.env` files locally or provide them via your cloud provider.

Required Production Variables:
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (For signing auth tokens)
- `FRONTEND_URL` (For CORS in the backend)
- `NODE_ENV=production`
- `VITE_API_URL` (For the frontend to connect to the backend)

## Running Backend
```bash
npm run dev:backend
```

## Running Frontend
```bash
npm run dev:frontend
```

## Running Worker
```bash
npm run dev:worker
```

## Running Scheduler
```bash
npm run dev:scheduler
```

## Deployment

The platform is fully configured for a production-grade cloud deployment.

### Deploying Frontend to Vercel
1. Connect your GitHub repository to Vercel.
2. Select the `frontend` directory as the Root Directory.
3. Vercel will automatically detect Vite and use `vercel.json`.
4. Add the `VITE_API_URL` environment variable pointing to your Railway backend.

### Deploying Backend, Worker, and Scheduler to Railway
1. Create a new Railway Project and provision a PostgreSQL database.
2. Connect your GitHub repository to Railway.
3. Create 3 separate services from the repository:
   - **Backend**: Set Root Directory to `/`, Railway will use `/backend/railway.json`.
   - **Worker**: Set Root Directory to `/`, Railway will use `/worker/railway.json`.
   - **Scheduler**: Set Root Directory to `/`, Railway will use `/scheduler/railway.json`.
4. Inject the `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` environment variables to all 3 services.
5. Railway will automatically build and deploy them independently using `NIXPACKS` and monitor health via the `/api/health/live` endpoints.

### Docker Deployment
To boot the entire stack in production mode locally or on a VPS:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Troubleshooting
- **CORS Errors:** Ensure `FRONTEND_URL` in the backend exactly matches the Vercel deployed URL (without trailing slashes).
- **Database Migrations:** Railway will execute migrations automatically during the build phase if configured, otherwise run `npx prisma migrate deploy` locally pointing to the Railway database.
- **Winston Logging:** Logs are emitted as JSON in production for easier querying in Railway's log explorer.

*See [06_Deployment_Guide.md](docs/06_Deployment_Guide.md) for comprehensive instructions.*

## Future Improvements
- Migration of the caching and pub/sub layer to Redis.
- Kubernetes native autoscaling based on queue depth.

## License
MIT License.
