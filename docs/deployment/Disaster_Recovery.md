# Disaster Recovery Guide

## Backup Strategy

### PostgreSQL Backups
The most critical state resides in the PostgreSQL database.
1. **Automated Snapshots**: If using a managed database (RDS, DigitalOcean Managed DB, Render PostgreSQL), ensure point-in-time recovery (PITR) is enabled for at least 7 days.
2. **Cron `pg_dump`**: For self-hosted instances, configure a cron job to dump the database daily:
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +"%F")
   BACKUP_DIR="/backups"
   docker exec prod_job_scheduler_db pg_dump -U postgres job_scheduler > $BACKUP_DIR/db_backup_$TIMESTAMP.sql
   # Compress and upload to S3/Blob storage
   gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql
   aws s3 cp $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz s3://my-company-backups/
   ```

## Restoration Process

1. **Spin up a new database instance**.
2. **Apply the backup**:
   ```bash
   gunzip db_backup_2026-07-04.sql.gz
   cat db_backup_2026-07-04.sql | docker exec -i prod_job_scheduler_db psql -U postgres -d job_scheduler
   ```
3. **Verify Integrity**: Run Prisma migrations to ensure schema matches, though the dump will contain the correct schema state.

## Node / Cluster Failures
The architecture is stateless (except for the DB). If a worker node or backend node crashes:
1. Docker Compose `restart: always` will attempt to bring it back up.
2. The Job Scheduler's `Worker Reliability Layer` (via Heartbeats) will detect the crashed worker and re-queue claimed jobs automatically. No manual intervention is needed for job state recovery.
