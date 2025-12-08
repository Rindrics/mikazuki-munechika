#!/bin/bash
# Sync Supabase local environment variables from `supabase status`

set -e

# Check if supabase is running
if ! supabase status --output json > /dev/null 2>&1; then
  echo "Error: Supabase is not running. Start it with 'supabase start'"
  exit 1
fi

# Get status as JSON
STATUS=$(supabase status --output json)

# Extract values
API_URL=$(echo "$STATUS" | jq -r '.API_URL')
ANON_KEY=$(echo "$STATUS" | jq -r '.ANON_KEY')
SERVICE_ROLE_KEY=$(echo "$STATUS" | jq -r '.SERVICE_ROLE_KEY')

# Path to .env.local
ENV_FILE=".env.local"

# Create or update .env.local
if [ -f "$ENV_FILE" ]; then
  # Update existing file (preserve other variables)
  # Remove old Supabase variables
  grep -v "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE" | \
  grep -v "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" | \
  grep -v "^SUPABASE_SERVICE_ROLE_KEY=" > "${ENV_FILE}.tmp" || true
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
fi

# Append Supabase variables
echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL" >> "$ENV_FILE"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" >> "$ENV_FILE"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" >> "$ENV_FILE"

echo "Updated $ENV_FILE with Supabase local credentials"
echo "  NEXT_PUBLIC_SUPABASE_URL=$API_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY:0:20}..."
echo "  SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:0:20}..."

