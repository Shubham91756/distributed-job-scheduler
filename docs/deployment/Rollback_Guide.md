# Rollback Guide

If a deployment introduces critical bugs or downtime, follow this guide to revert to a stable state.

## 1. Revert the Application Code (Docker Tag Reversion)
Since the CD pipeline tags Docker images with Git SHAs and SemVer:
1. Identify the last known good image tag from your container registry (e.g. `v1.2.3` or `sha-abc1234`).
2. SSH into your production instance.
3. Edit `docker-compose.prod.yml` to specify the exact image tag instead of `latest` or the broken version.
   ```yaml
   backend:
     image: ghcr.io/your-org/distributed-job-scheduler-backend:v1.2.3
   ```
4. Restart the cluster:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 2. Revert Database Migrations
If the bad deployment included a database migration that needs to be rolled back:
1. Identify the name of the migration to revert to.
2. Run Prisma `migrate resolve` or manually apply the `down.sql` if you generate them.
   *Note: Prisma Migrate in production generally rolls forward. To rollback a migration, you create a new migration that reverses the changes of the bad migration, and deploy that new migration.*
3. Therefore, the recommended rollback for DB schema is:
   - Revert the schema change in `schema.prisma` locally.
   - Generate a new migration: `npx prisma migrate dev --name rollback_bad_migration`
   - Merge and deploy.

> [!WARNING]
> Do not attempt to manually `DROP` tables in production without taking a full `pg_dump` backup first.
