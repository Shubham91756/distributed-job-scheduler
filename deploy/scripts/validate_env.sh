#!/bin/bash

# validate_env.sh
# Validates that all required environment variables are set before starting the application.

REQUIRED_VARS=(
    "NODE_ENV"
    "DATABASE_URL"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "REFRESH_TOKEN_SECRET"
)

MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "❌ ERROR: Required environment variable $VAR is not set."
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [ "$MISSING_VARS" -gt 0 ]; then
    echo "🚨 Startup aborted. $MISSING_VARS required variables are missing."
    exit 1
fi

echo "✅ All required environment variables are present."
exit 0
