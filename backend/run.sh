#!/bin/bash
set -euo pipefail

# Export crash dump location to avoid filling disk
export ERL_CRASH_DUMP=/tmp/erl_crash.dump

echo "========================================"
echo "Easy Backend - Starting up"
echo "========================================"

# Run migrations before starting the app
echo "Running database migrations..."
if /app/bin/easy eval "Easy.Release.migrate"; then
    echo "✓ Migrations completed successfully"
else
    echo "⚠ Migration failed or no migrations to run"
    # Don't exit - app might still work if DB is already up to date
fi

echo "========================================"
echo "Starting Phoenix application..."
echo "========================================"

# Start the application
exec /app/bin/server
