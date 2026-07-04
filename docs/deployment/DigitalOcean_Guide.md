# DigitalOcean Deployment Guide

## Architecture
DigitalOcean Droplets are highly similar to AWS EC2 deployments. For production, it is highly recommended to use DigitalOcean Managed Databases for PostgreSQL instead of running it locally on the droplet.

## Prerequisites
1. A DigitalOcean Account.
2. A deployed Droplet (Ubuntu 22.04 Docker 1-Click App recommended).

## Steps

### 1. Provision the Managed Database
1. Go to **Databases** in the DigitalOcean dashboard.
2. Create a PostgreSQL Database Cluster.
3. Once provisioned, copy the Connection String (Public or VPC network depending on your droplet setup).

### 2. Configure the Droplet
SSH into your droplet:
```bash
ssh root@<your-droplet-ip>
```

Clone the repository:
```bash
git clone https://github.com/your-org/distributed-job-scheduler.git
cd distributed-job-scheduler
```

Create your `.env` file:
```bash
cp .env.example .env
nano .env
```
Ensure `DATABASE_URL` is set to your DigitalOcean Managed DB connection string.

### 3. Deploy
If using the managed database, you can comment out the `postgres` block in `docker-compose.prod.yml` to save droplet resources, or pass `--scale postgres=0` (though removing depends_on might be required).

```bash
docker-compose -f docker-compose.prod.yml up -d --build backend worker scheduler frontend nginx
```

### 4. Database Migrations and Seeding
```bash
docker exec -it prod_job_scheduler_backend npx prisma migrate deploy
docker exec -it prod_job_scheduler_backend npx ts-node /app/backend/deploy/scripts/seed.ts
```
