#!/usr/bin/env bash
# Pay a SatoshiLink invoice from "bob" (the client's node) — used in the live demo.
#   ./scripts/pay-invoice.sh lnbcrt50u1p...                          (from "Copy invoice")
#   ./scripts/pay-invoice.sh 00af05c261                              (the invoice id)
#   ./scripts/pay-invoice.sh http://localhost:3000/pay/00af05c261    (the share link)
source "$(dirname "$0")/_common.sh"

if [ $# -lt 1 ]; then
  echo "Usage: $0 lnbcrt50u1p...   (or an invoice id / share link, e.g. 00af05c261)" >&2
  exit 1
fi

# Pull the BOLT11 out of whatever was pasted: drops <…> brackets, quotes, a lightning: prefix,
# stray characters and line breaks. BOLT11 is case-insensitive, so lowercase it first.
BOLT11="$(printf '%s' "$*" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]' | grep -oE 'lnbc[a-z0-9]+' | head -n 1 || true)"

# No BOLT11 in the argument? Treat it as a SatoshiLink invoice id (or share link) and look it up.
if [ -z "$BOLT11" ]; then
  ID="$(printf '%s' "$*" | grep -oE '[0-9a-f]{10}' | tail -n 1 || true)"
  DATA_FILE="$(cd "$(dirname "$0")/.." && pwd)/data/invoices.json"
  if [ -n "$ID" ] && [ -f "$DATA_FILE" ]; then
    BOLT11="$(node -e '
      const inv = require(process.argv[1]).find((i) => i.id === process.argv[2]);
      if (inv) process.stdout.write(inv.paymentRequest);
    ' "$DATA_FILE" "$ID" 2>/dev/null || true)"
  fi
fi

if [ -z "$BOLT11" ]; then
  echo "✗ Couldn't find a Lightning invoice (lnbcrt…) or a known invoice id in: $*" >&2
  exit 1
fi

step "bob: decodepayreq (what are we paying?)"
bob decodepayreq "$BOLT11" | grep -E '"(num_satoshis|description|expiry)"'

step "bob: payinvoice"
bob payinvoice --force "$BOLT11" | tail -n 5

echo
echo "✓ Sent. The SatoshiLink invoice page should flip to Paid ✓ within ~3 seconds."
