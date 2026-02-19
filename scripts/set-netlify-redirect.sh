#!/usr/bin/env bash
# Update netlify.toml with your Render backend URL
# Usage: ./scripts/set-netlify-redirect.sh mytube-backend-xxxx
#        (use your Render service name, e.g. from https://mytube-backend-xxxx.onrender.com)

if [ -z "$1" ]; then
  echo "Usage: $0 <render-service-name>"
  echo "Example: $0 mytube-backend-abc123"
  echo "Get it from your Render dashboard URL."
  exit 1
fi

RENDER_NAME="$1"
cd "$(dirname "$0")/.."

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|YOUR-RENDER-URL|$RENDER_NAME|g" netlify.toml
else
  sed -i "s|YOUR-RENDER-URL|$RENDER_NAME|g" netlify.toml
fi

echo "Updated netlify.toml: /api/* now proxies to https://$RENDER_NAME.onrender.com"
grep "to =" netlify.toml
