# Railway Deployment Guide

Railway is an infrastructure platform where you can provision infrastructure, develop with that infrastructure locally, and then deploy to the cloud.

## Architecture
Railway allows you to deploy multiple services within a single "Project", linking them via internal networks and shared environment variables.

## Steps

### 1. Create a Project & Database
1. Go to the Railway Dashboard and click **New Project**.
2. Select **Provision PostgreSQL**.
3. Railway will provision a database and give you a `DATABASE_URL` available in the variable pane.

### 2. Deploy the Services
Railway supports Monorepos using Custom Dockerfiles.

1. Click **New** -> **GitHub Repo**.
2. Select your repository.
3. Railway will try to auto-detect the root. Since we have multiple services, we need to configure services manually.
4. Go to **Project Settings** -> **Deployments**.
5. Create a service for the **Backend**:
   - Source: Root directory `/`
   - Builder: Dockerfile
   - Dockerfile path: `backend/Dockerfile`
   - Expose port `3000`.
6. Create a service for the **Worker**:
   - Source: Root directory `/`
   - Builder: Dockerfile
   - Dockerfile path: `worker/Dockerfile`
7. Create a service for the **Scheduler**:
   - Source: Root directory `/`
   - Builder: Dockerfile
   - Dockerfile path: `scheduler/Dockerfile`
8. Create a service for the **Frontend**:
   - Source: Root directory `/`
   - Builder: Dockerfile
   - Dockerfile path: `frontend/Dockerfile`

### 3. Link the Database
For the Backend, Worker, and Scheduler services:
1. Go to **Variables**.
2. Click **Reference Variable** and select `DATABASE_URL` from the PostgreSQL service.
3. Add other required variables (e.g. `JWT_SECRET`, `NODE_ENV=production`).

### 4. Networking
Railway handles internal networking automatically.
To expose the Frontend, go to the Frontend service -> **Settings** -> **Networking** -> **Generate Domain**.
If the frontend needs to talk to the backend, generate a domain for the backend as well, and set the frontend's `VITE_API_URL` to the backend's public domain.
