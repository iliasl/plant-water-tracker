#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/reset_user_password.sh user@example.com
# This script prompts for a new password (hidden) and runs the reset inside the
# `backend` container so the update uses the same Prisma/database configuration.

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <email>"
  exit 1
fi

EMAIL="$1"

read -s -p "New password: " PW1
echo
read -s -p "Confirm password: " PW2
echo

if [ "$PW1" != "$PW2" ]; then
  echo "Passwords do not match"
  exit 2
fi

if [ ${#PW1} -lt 6 ]; then
  echo "Password must be at least 6 characters"
  exit 3
fi

# Use docker compose to execute the Node script inside the backend container.
# The script reads the password from stdin.
if command -v docker >/dev/null 2>&1 && docker compose ps >/dev/null 2>&1; then
  echo "$PW1" | docker compose exec -T backend node /app/backend/scripts/reset_password.js "$EMAIL"
else
  echo "docker compose not available or backend service not running."
  echo "You can run the Node script locally instead:"
  echo "  node backend/scripts/reset_password.js $EMAIL"
  echo "Or run via docker once the services are up."
  exit 4
fi
