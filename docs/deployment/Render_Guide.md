# Render Deployment Guide

Render is a unified cloud to build and run all your apps and websites with free TLS certificates, a global CDN, DDoS protection, private networks, and auto deploys from Git.

## Architecture
On Render, we will deploy the platform as multiple distinct services communicating over a private network.
- **Render PostgreSQL**: Managed database.
- **Render Web Service**: The Backend API.
- **Render Background Worker**: The Worker Node.
- **Render Background Worker**: The Scheduler Daemon.
- **Render Static Site**: The Frontend UI.

## Steps

### 1. Create the Database
1. Go to the Render Dashboard -> **New** -> **PostgreSQL**.
2. Name it `job-scheduler-db`.
3. Once created, copy the **Internal Database URL**.

### 2. Deploy the Backend
1. Go to the Render Dashboard -> **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Name: `job-scheduler-backend`
4. Environment: `Docker`
5. Root Directory: `backend`
6. Under Advanced, specify the Dockerfile path: `./Dockerfile` (relative to root directory). Wait, since we use multi-stage builds requiring root files, set Root Directory to `.` and Dockerfile path to `backend/Dockerfile`.
7. Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (The Internal Database URL from step 1)
   - `JWT_SECRET` = (Generate a secret)
8. Click **Create Web Service**.

### 3. Deploy the Worker and Scheduler
Follow the exact same process as the backend, but:
- Choose **New** -> **Background Worker**.
- For Worker: Name it `job-scheduler-worker`, Dockerfile path `worker/Dockerfile`.
- For Scheduler: Name it `job-scheduler-daemon`, Dockerfile path `scheduler/Dockerfile`.

### 4. Deploy the Frontend
1. Choose **New** -> **Web Service** (if using the Nginx Dockerfile) OR **Static Site**.
2. **If using Static Site** (Recommended for lower costs):
   - Environment: `Node`
   - Build Command: `npm install && npm run build` (or similar)
   - Publish Directory: `frontend/dist`
   - Add a rewrite rule for SPA routing: Source `/*`, Destination `/index.html`, Action `Rewrite`.
3. **If using the Dockerfile**:
   - Environment: `Docker`
   - Dockerfile path: `frontend/Dockerfile`.

Render will automatically trigger builds on new commits to the connected branch.
