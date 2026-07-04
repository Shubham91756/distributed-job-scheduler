# Environment Variables Guide

The Distributed Job Scheduler requires several environment variables to run securely in production.

## Required Variables

- `NODE_ENV`: Must be `production` for all production deployments.
- `DATABASE_URL`: The PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`.
- `JWT_SECRET`: A strong, randomly generated string used to sign JSON Web Tokens.
- `REFRESH_TOKEN_SECRET`: A strong, randomly generated string used to sign Refresh Tokens.
- `POSTGRES_USER`: Database user (if using local docker-compose postgres).
- `POSTGRES_PASSWORD`: Database password (if using local docker-compose postgres).
- `POSTGRES_DB`: Database name (if using local docker-compose postgres).

## Optional / Tuning Variables

- `PORT`: (Default: `3000`) The port the backend listens on.
- `WORKER_CONCURRENCY`: (Default: `10`) Number of concurrent jobs a single worker node will process.
- `WORKER_QUEUE_ID`: (Default: `all`) Which queue ID to listen to. Using `all` allows the worker to pull from any queue.
- `ADMIN_EMAIL`: Used by the seed script to create the initial admin user.
- `ADMIN_PASSWORD`: Used by the seed script to set the initial admin password.

## Secrets Management Best Practices

1. **Never commit `.env` files.**
2. Use a Secrets Manager (e.g. AWS Secrets Manager, HashiCorp Vault, GitHub Actions Secrets) to inject these values at runtime or during CI/CD deployment.
3. Validate variables on startup using `deploy/scripts/validate_env.sh`.
