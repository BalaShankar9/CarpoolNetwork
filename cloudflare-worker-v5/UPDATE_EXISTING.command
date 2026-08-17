#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "========================================"
echo " Carpool Network — Premium v5 upgrade"
echo "========================================"
echo
echo "This keeps the existing D1 database, members, posts, bookings and ratings."
echo "It adds safer booking conflicts, quick seat requests, account recovery and the premium UI."
echo

echo "1/4 Installing/updating Wrangler..."
npm install

echo
echo "2/4 Applying the v5 database migration..."
npx wrangler d1 execute DB --remote --file=./migration-v5.sql

echo
echo "3/4 Validating the Worker bundle..."
npx wrangler deploy --dry-run

echo
echo "4/4 Deploying Carpool Network Premium v5..."
npx wrangler deploy

echo
echo "========================================"
echo " PREMIUM V5 DEPLOYED"
echo "========================================"
echo "Open: https://carpool-network.balashankarbollineni4.workers.dev"
echo "If an old screen is cached, refresh once or close/reopen the installed PWA."
