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
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/job_scheduler?schema=public"
JWT_SECRET="super-secret-development-key"
REFRESH_TOKEN_SECRET="super-secret-refresh-key"
NODE_ENV="development"
PORT=3000
WORKER_CONCURRENCY=5
```

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

## Docker Setup
To boot the entire stack in production mode:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## API Documentation
The API adheres to RESTful principles. Authentication is enforced via JWT Bearer tokens. 
*See [04_API_Documentation.md](docs/04_API_Documentation.md) for detailed endpoint schemas.*

## Testing
The repository contains automated unit and integration tests.
```bash
npm run build
npm --workspace backend run test
npm --workspace worker run test
```

## Screenshots
*See the `docs/screenshots/` directory for dashboard previews.*

## Deployment
The platform is designed to be deployed as stateless Docker containers. 
*See [06_Deployment_Guide.md](docs/06_Deployment_Guide.md) for comprehensive instructions.*

## Future Improvements
- Migration of the caching and pub/sub layer to Redis.
- Kubernetes native autoscaling based on queue depth.

## License
MIT License.
