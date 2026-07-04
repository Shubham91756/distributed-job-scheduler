# Fly.io Deployment Guide

Fly.io runs applications close to your users via global Anycast networks.

## Prerequisites
1. Install the `flyctl` CLI.
2. Login: `flyctl auth login`

## Architecture
We will create multiple Fly apps for the components of the platform, utilizing Fly's internal `.internal` DNS for communication.

## Steps

### 1. Provision the Database
Run:
```bash
flyctl postgres create
```
Name it `job-scheduler-db`.
Save the credentials outputted.

### 2. Deploy the Backend
1. In the project root, create a `fly.toml` for the backend:
   ```toml
   app = "job-scheduler-backend"
   primary_region = "iad"

   [build]
     dockerfile = "backend/Dockerfile"
   
   [env]
     NODE_ENV = "production"
     PORT = "3000"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
   ```
2. Attach the database:
   ```bash
   flyctl postgres attach job-scheduler-db --app job-scheduler-backend
   ```
3. Set secrets:
   ```bash
   flyctl secrets set JWT_SECRET="your_secret" --app job-scheduler-backend
   ```
4. Deploy:
   ```bash
   flyctl deploy --config fly.toml
   ```

### 3. Deploy the Worker and Scheduler
Create separate TOML files (e.g. `fly.worker.toml`, `fly.scheduler.toml`).
*Note: Do not include `[http_service]` for background workers.*
```toml
# fly.worker.toml
app = "job-scheduler-worker"
primary_region = "iad"

[build]
  dockerfile = "worker/Dockerfile"

[env]
  NODE_ENV = "production"
```
Attach the DB and set secrets.
Deploy:
```bash
flyctl deploy --config fly.worker.toml
```

### 4. Deploy the Frontend
Create `fly.frontend.toml`:
```toml
app = "job-scheduler-frontend"
primary_region = "iad"

[build]
  dockerfile = "frontend/Dockerfile"

[http_service]
  internal_port = 80
  force_https = true
```
Deploy:
```bash
flyctl deploy --config fly.frontend.toml
```
