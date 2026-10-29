#!/usr/bin/env bash
# Pay a SatoshiLink invoice from "bob" (the client's node) — used in the live demo.
#   ./scripts/pay-invoice.sh lnbcrt50u1p...
source "$(dirname "$0")/_common.sh"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <bolt11-invoice>" >&2
  exit 1
fi
BOLT11="$1"

step "bob: decodepayreq (what are we paying?)"
bob decodepayreq "$BOLT11" | grep -E '"(num_satoshis|description|expiry)"'

step "bob: payinvoice"
bob payinvoice --force "$BOLT11" | tail -n 5

echo
echo "✓ Sent. The SatoshiLink invoice page should flip to Paid ✓ within ~3 seconds."
