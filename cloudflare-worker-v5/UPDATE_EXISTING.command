#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"
echo 'Carpool Network: verifying this release (no production changes).'
npm ci
npm run check
npm run dry-run
echo 'Validation complete. Follow the backup, test, migration and deployment steps in README.md.'
