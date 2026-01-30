#!/bin/bash

# This script resets the local database and restores it from a backup.sql file.
# Warning: This is a destructive operation. It will permanently delete your
# existing local database volume.

set -e

# --- Configuration ---
BACKUP_FILE="backup.sql"
DB_SERVICE="db"
DB_USER="user"
DB_NAME="planttracker"

# --- Main Script ---

echo "⚠️  WARNING: This will permanently delete your local database."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborting."
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found in the current directory."
    exit 1
fi

echo "🔄 Stopping and removing existing containers and volumes..."
docker-compose down -v

echo "🚀 Starting database service..."
docker-compose up -d "$DB_SERVICE"

echo "⏳ Waiting for the database to be ready..."
# Simple loop to wait for healthcheck to pass
until [ "$(docker-compose ps -q "$DB_SERVICE" | xargs docker inspect -f '{{.State.Health.Status}}')" = "healthy" ]; do
    sleep 1;
done

echo "📂 Copying backup file to the container..."
docker cp "$BACKUP_FILE" "$(docker-compose ps -q "$DB_SERVICE")":/"$BACKUP_FILE"

echo "🗄️ Restoring database..."
docker-compose exec "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -f /"$BACKUP_FILE"

echo "✅ Database restored successfully!"
echo
echo "🚀 You can now start the full application with:"
echo "   docker-compose up --build"
