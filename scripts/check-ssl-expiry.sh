#!/usr/bin/env bash
# SSL Certificate Expiry Monitor for carpoolnetwork.co.uk
# Run via cron or CI to alert when cert is near expiry.
#
# Netlify uses Let's Encrypt with auto-renewal, but this script
# provides an independent check as a safety net.
#
# Usage:
#   ./scripts/check-ssl-expiry.sh
#   ./scripts/check-ssl-expiry.sh 30   # warn if <30 days remaining
#
# Recommended cron (daily at 8am):
#   0 8 * * * /path/to/check-ssl-expiry.sh 14

set -euo pipefail

DOMAIN="carpoolnetwork.co.uk"
WARN_DAYS="${1:-14}"

EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null \
  | sed 's/notAfter=//')

if [[ -z "$EXPIRY_DATE" ]]; then
  echo "❌ ERROR: Could not retrieve SSL certificate for $DOMAIN"
  exit 2
fi

EXPIRY_EPOCH=$(date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" "+%s" 2>/dev/null || \
               date -d "$EXPIRY_DATE" "+%s" 2>/dev/null)
NOW_EPOCH=$(date "+%s")
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "🔒 SSL Certificate for $DOMAIN"
echo "   Expires: $EXPIRY_DATE"
echo "   Days remaining: $DAYS_LEFT"

if [[ "$DAYS_LEFT" -lt "$WARN_DAYS" ]]; then
  echo ""
  echo "⚠️  WARNING: Certificate expires in $DAYS_LEFT days (threshold: $WARN_DAYS)"
  echo "   Action: Check Netlify dashboard → Domain settings → HTTPS"
  echo "   Netlify auto-renews Let's Encrypt certs ~30 days before expiry."
  echo "   If renewal failed, try: Netlify Dashboard → Domain → Renew certificate"
  exit 1
fi

echo "✅ Certificate is healthy."
exit 0
